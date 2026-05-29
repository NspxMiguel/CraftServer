const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const log = require('./logger.cjs')

// Wrap all ipcMain.handle calls with error logging
const originalHandle = ipcMain.handle.bind(ipcMain)
ipcMain.handle = (channel, listener) => {
  originalHandle(channel, async (event, ...args) => {
    try {
      return await listener(event, ...args)
    } catch (e) {
      log.error(`IPC error: ${channel}`, { message: e.message, stack: e.stack })
      return { ok: false, error: e.message }
    }
  })
}

const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawn, execFile } = require('child_process')
const https = require('https')
const http = require('http')
const archiver = require('archiver')

// Suppress uncaught errors during shutdown (e.g. IPC to destroyed windows on Windows)
process.on('uncaughtException', (err) => {
  if (app.isQuitting) return // silently swallow during shutdown
  console.error('[uncaughtException]', err)
})
process.on('unhandledRejection', (reason) => {
  if (app.isQuitting) return
  console.error('[unhandledRejection]', reason)
})

let autoUpdater
try { autoUpdater = require('electron-updater').autoUpdater } catch {}

const isDev = !app.isPackaged

// ── Paths ─────────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(os.homedir(), 'CraftServer')
const SERVERS_DIR = path.join(DATA_DIR, 'servers')
const BACKUPS_DIR = path.join(DATA_DIR, 'backups')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
// playit.gg binary path (kept for legacy cleanup; new approach uses the Minecraft plugin JAR)
const PLAYIT_BIN = path.join(DATA_DIR, 'playit' + (process.platform === 'win32' ? '.exe' : ''))

;[DATA_DIR, SERVERS_DIR, BACKUPS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })

const serverProcesses = {}
const playitProcesses = {}

// Safe IPC send — silently ignores if the renderer has already been destroyed
function safeSend(sender, channel, payload) {
  if (app.isQuitting) return
  try { sender.send(channel, payload) } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) } catch { return {} }
}
function writeConfig(cfg) {
  const tmp = CONFIG_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2))
  fs.renameSync(tmp, CONFIG_FILE)
}

function readServers() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'servers.json'), 'utf8')) } catch { return [] }
}
function writeServers(s) {
  const file = path.join(DATA_DIR, 'servers.json')
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2))
  fs.renameSync(tmp, file)
}

function sanitizeFilePart(value) {
  return String(value || 'server')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'server'
}

function detectGoogleDriveDirs() {
  const home = os.homedir()
  const found = []
  const candidates = [
    path.join(home, 'Google Drive'),
    path.join(home, 'My Drive'),
    path.join(home, 'Library', 'CloudStorage'),
  ]

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue
      const stat = fs.statSync(candidate)
      if (stat.isDirectory() && candidate.endsWith('CloudStorage')) {
        for (const child of fs.readdirSync(candidate)) {
          if (/GoogleDrive/i.test(child)) {
            const driveRoot = path.join(candidate, child)
            const myDrive = path.join(driveRoot, 'My Drive')
            found.push(fs.existsSync(myDrive) ? myDrive : driveRoot)
          }
        }
      } else if (stat.isDirectory()) {
        found.push(candidate)
      }
    } catch {}
  }

  if (process.platform === 'win32') {
    for (const envName of ['USERPROFILE', 'HOMEDRIVE']) {
      const root = process.env[envName]
      if (!root) continue
      for (const name of ['Google Drive', 'My Drive']) {
        const candidate = path.join(root, name)
        try { if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) found.push(candidate) } catch {}
      }
    }
  }

  return [...new Set(found)]
}

function getBackupDir() {
  const cfg = readConfig()
  return cfg.backupDir || BACKUPS_DIR
}

const MAX_FETCH_BYTES = 50 * 1024 * 1024 // 50 MB guard against unbounded responses
const FETCH_TIMEOUT_MS = 30_000

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'CraftServer/0.1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchJson(res.headers.location).then(resolve).catch(reject)
      let data = ''
      let size = 0
      res.on('data', c => {
        size += c.length
        if (size > MAX_FETCH_BYTES) { req.destroy(); reject(new Error('Response too large')); return }
        data += c
      })
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) } })
    }).on('error', reject)
    req.setTimeout(FETCH_TIMEOUT_MS, () => { req.destroy(); reject(new Error('Request timeout')) })
  })
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'CraftServer/0.1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchText(res.headers.location).then(resolve).catch(reject)
      let data = ''
      let size = 0
      res.on('data', c => {
        size += c.length
        if (size > MAX_FETCH_BYTES) { req.destroy(); reject(new Error('Response too large')); return }
        data += c
      })
      res.on('end', () => resolve(data))
    }).on('error', reject)
    req.setTimeout(FETCH_TIMEOUT_MS, () => { req.destroy(); reject(new Error('Request timeout')) })
  })
}

async function resolveJenkinsUrl(originalUrl) {
  const jenkinsRegex = /^(https?:\/\/[^\/]+\/job\/[^\/]+\/lastSuccessfulBuild)/i
  const match = originalUrl.match(jenkinsRegex)
  if (!match) return originalUrl

  const buildUrl = match[1] + '/'
  try {
    const html = await fetchText(buildUrl)
    const jarRegex = /href="([^"]+\.jar)"/g
    let m
    const links = []
    while ((m = jarRegex.exec(html)) !== null) {
      links.push(m[1])
    }

    const originalFile = originalUrl.substring(originalUrl.lastIndexOf('/') + 1).toLowerCase()
    
    let bestLink = null;
    let bestScore = -1;

    for (const link of links) {
      const decodedLink = decodeURIComponent(link)
      const filename = decodedLink.substring(decodedLink.lastIndexOf('/') + 1).toLowerCase()
      
      let score = 0
      if (originalFile.includes('bukkit') && filename.includes('bukkit')) score += 10
      if (originalFile.includes('citizens') && filename.includes('citizens')) score += 10
      if (filename.includes(originalFile)) score += 5
      
      if (score > bestScore) {
        bestScore = score
        bestLink = link
      }
    }

    if (bestLink) {
      if (bestLink.startsWith('http')) {
        return bestLink
      }
      if (bestLink.startsWith('/')) {
        const urlObj = new URL(buildUrl)
        return urlObj.origin + bestLink
      }
      return buildUrl + bestLink
    }
  } catch (e) {
    // fallback
  }
  return originalUrl
}

async function resolveGithubLatestUrl(originalUrl) {
  const ghRegex = /github\.com\/([^\/]+)\/([^\/]+)\/releases\/latest\/download\/([^\/]+)/i
  const match = originalUrl.match(ghRegex)
  if (!match) return originalUrl

  const [_, owner, repo, filename] = match
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`
  
  try {
    const releaseData = await fetchJson(apiUrl)
    if (releaseData && Array.isArray(releaseData.assets)) {
      const targetLower = filename.toLowerCase()
      let bestAsset = null;
      let bestScore = -1;

      for (const asset of releaseData.assets) {
        const nameLower = asset.name.toLowerCase()
        let score = 0
        
        if (nameLower === targetLower) {
          score += 100
        } else if (nameLower.includes(targetLower.replace('.jar', ''))) {
          score += 50
        } else if (targetLower.replace('.jar', '').includes(nameLower.replace('.jar', ''))) {
          score += 40
        }
        
        if (nameLower.endsWith('.jar')) {
          score += 10
        }

        if (score > bestScore) {
          bestScore = score
          bestAsset = asset
        }
      }

      if (bestAsset && bestScore > 0) {
        return bestAsset.browser_download_url
      }
    }
  } catch (e) {
    // fallback
  }
  return originalUrl
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const doDownload = (u, redirects = 0) => {
      if (redirects > 10) return reject(new Error('Muitos redirecionamentos'))
      const mod = u.startsWith('https') ? https : http
      const req = mod.get(u, { headers: { 'User-Agent': 'CraftServer/0.1.0' } }, res => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.destroy()
          return doDownload(res.headers.location, redirects + 1)
        }
        // Reject non-200 so HTML error pages don't get saved as JARs
        if (res.statusCode !== 200) {
          res.destroy()
          return reject(new Error(`HTTP ${res.statusCode}: ${u}`))
        }
        const total = parseInt(res.headers['content-length'] || '0', 10)
        let received = 0
        const file = fs.createWriteStream(dest)
        res.on('data', chunk => {
          received += chunk.length
          if (onProgress && total) onProgress(Math.round((received / total) * 100))
        })
        res.pipe(file)
        file.on('finish', () => file.close(resolve))
        file.on('error', err => { fs.unlink(dest, () => {}); reject(err) })
        res.on('error', err => { fs.unlink(dest, () => {}); reject(err) })
      }).on('error', reject)
      // 5-minute timeout for large JARs (resets on data, so stalled connections are killed)
      req.setTimeout(5 * 60 * 1000, () => { req.destroy(); fs.unlink(dest, () => {}); reject(new Error('Download timeout')) })
    }
    doDownload(url)
  })
}

// ── server.properties ─────────────────────────────────────────────────────────
function parseServerProperties(content) {
  const props = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (val === 'true') props[key] = true
    else if (val === 'false') props[key] = false
    else if (!isNaN(val) && val !== '') props[key] = Number(val)
    else props[key] = val
  }
  return props
}

function stringifyServerProperties(props) {
  const lines = ['# Generated by CraftServer', '']
  for (const [k, v] of Object.entries(props)) {
    // Strip CR/LF to prevent a malicious value from injecting extra keys
    const safeKey = String(k).replace(/[\r\n]/g, '')
    const safeVal = String(v).replace(/[\r\n]/g, '')
    lines.push(`${safeKey}=${safeVal}`)
  }
  return lines.join('\n') + '\n'
}

ipcMain.handle('get-server-properties', (_, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) { log.warn('get-server-properties: server not found', { serverId }); return null }
  const file = path.join(server.dir, 'server.properties')
  if (!fs.existsSync(file)) { log.debug('get-server-properties: file missing', { serverId }); return null }
  log.debug('get-server-properties', { serverId })
  return parseServerProperties(fs.readFileSync(file, 'utf8'))
})

ipcMain.handle('set-server-properties', (_, { serverId, props }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) { log.warn('set-server-properties: server not found', { serverId }); return { ok: false } }
  const file = path.join(server.dir, 'server.properties')
  const existing = fs.existsSync(file) ? parseServerProperties(fs.readFileSync(file, 'utf8')) : {}
  const merged = { ...existing, ...props }
  fs.writeFileSync(file, stringifyServerProperties(merged))
  log.info('Server properties updated', { serverId, keys: Object.keys(props) })
  return { ok: true }
})

// ── RAM Management ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-server-ram', (_, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  return server ? server.ram : null
})

ipcMain.handle('set-server-ram', async (_, { serverId, ram }) => {
  const servers = readServers()
  const idx = servers.findIndex(s => s.id === serverId)
  if (idx === -1) { log.warn('set-server-ram: server not found', { serverId }); return { ok: false, error: 'Servidor não encontrado' } }
  const nextRam = Number(ram)
  if (!Number.isFinite(nextRam)) { log.warn('set-server-ram: invalid RAM value', { serverId, ram }); return { ok: false, error: 'RAM inválida' } }
  const totalMb = Math.floor(os.totalmem() / (1024 * 1024))
  const maxMb = Math.max(512, Math.min(16384, Math.floor(totalMb * 0.8 / 512) * 512))
  const oldRam = servers[idx].ram
  servers[idx].ram = Math.max(512, Math.min(maxMb, Math.round(nextRam / 512) * 512))
  writeServers(servers)
  log.info('Server RAM changed', { serverId, oldRam, newRam: servers[idx].ram })
  return { ok: true }
})

// ── Whitelist ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-whitelist', (_, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return []
  const file = path.join(server.dir, 'whitelist.json')
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return [] }
})

ipcMain.handle('add-whitelist', async (_, { serverId, username }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) { log.warn('add-whitelist: server not found', { serverId }); return { ok: false, error: 'Servidor não encontrado' } }
  if (!username || !/^[a-zA-Z0-9_]{1,16}$/.test(String(username))) {
    log.warn('add-whitelist: invalid username', { serverId, username })
    return { ok: false, error: 'Nome de usuário inválido (somente letras, números e _ até 16 caracteres)' }
  }

  // Fetch UUID from Mojang API
  let uuid = '00000000-0000-0000-0000-000000000000'
  try {
    const data = await fetchJson(`https://api.mojang.com/users/profiles/minecraft/${username}`)
    if (data.id) {
      const raw = data.id
      uuid = `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`
    }
  } catch {
    // Offline mode: generate a deterministic offline UUID
    uuid = `OfflinePlayer:${username}`
  }

  const file = path.join(server.dir, 'whitelist.json')
  let list = []
  try { list = JSON.parse(fs.readFileSync(file, 'utf8')) } catch {}
  if (list.some(e => e.name.toLowerCase() === username.toLowerCase()))
    return { ok: false, error: 'Jogador já está na whitelist' }

  list.push({ uuid, name: username })
  fs.writeFileSync(file, JSON.stringify(list, null, 2))
  log.info('Whitelist: player added', { serverId, username, uuid })
  return { ok: true, entry: { uuid, name: username } }
})

ipcMain.handle('remove-whitelist', (_, { serverId, name }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) { log.warn('remove-whitelist: server not found', { serverId }); return { ok: false } }
  const file = path.join(server.dir, 'whitelist.json')
  try {
    const list = JSON.parse(fs.readFileSync(file, 'utf8')).filter(e => e.name !== name)
    fs.writeFileSync(file, JSON.stringify(list, null, 2))
    log.info('Whitelist: player removed', { serverId, name })
    return { ok: true }
  } catch (e) { log.error('remove-whitelist failed', { serverId, name, message: e.message }); return { ok: false } }
})

// ── Versions ──────────────────────────────────────────────────────────────────
const FALLBACK_VERSIONS = {
  paper: [
    '26.1.2','26.1.1','26.1.0',
    '26.0.3','26.0.2','26.0.1','26.0.0',
    '1.21.5','1.21.4','1.21.3','1.21.2','1.21.1','1.21',
    '1.20.6','1.20.5','1.20.4','1.20.3','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.3','1.19.2','1.19.1','1.19',
    '1.18.2','1.18.1','1.18','1.17.1','1.17',
    '1.16.5','1.16.4','1.16.3','1.16.2','1.16.1',
    '1.15.2','1.15.1','1.15','1.14.4','1.14.3','1.14.2','1.14.1','1.14',
    '1.13.2','1.13.1','1.13','1.12.2','1.12.1','1.12',
    '1.11.2','1.11','1.10.2','1.9.4','1.8.8',
  ],
  purpur: [
    '26.1.2','26.1.1','26.1.0','26.0.3','26.0.2','26.0.1',
    '1.21.5','1.21.4','1.21.3','1.21.1','1.21',
    '1.20.6','1.20.4','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.3','1.19.2','1.19','1.18.2','1.18.1','1.18',
    '1.17.1','1.17','1.16.5','1.16.4',
  ],
  fabric: [
    '1.21.5','1.21.4','1.21.3','1.21.2','1.21.1','1.21',
    '1.20.6','1.20.4','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.3','1.19.2','1.19','1.18.2','1.18.1','1.18',
    '1.17.1','1.17','1.16.5','1.16.4','1.16.3','1.16.1',
    '1.15.2','1.15','1.14.4','1.13.2',
  ],
  bedrock: [
    '1.21.60','1.21.51','1.21.50','1.21.44','1.21.40',
    '1.21.31','1.21.30','1.21.23','1.21.20',
    '1.21.0','1.20.81','1.20.80','1.20.73','1.20.70',
    '1.20.62','1.20.60','1.20.51','1.20.50',
  ],
  hybrid: [
    '26.1.2','26.1.1','26.1.0',
    '1.21.5','1.21.4','1.21.3','1.21.1','1.21',
    '1.20.6','1.20.4','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.2','1.19','1.18.2','1.18',
  ],
  vanilla: [
    '26.1.2','26.1.1','26.1.0','26.0.3','26.0.2','26.0.1','26.0.0',
    '1.21.5','1.21.4','1.21.3','1.21.2','1.21.1','1.21',
    '1.20.6','1.20.5','1.20.4','1.20.3','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.3','1.19.2','1.19.1','1.19','1.18.2','1.18.1','1.18',
    '1.17.1','1.17','1.16.5','1.16.4','1.16.3','1.16.2','1.16.1',
    '1.15.2','1.15','1.14.4','1.14','1.13.2','1.13',
    '1.12.2','1.12','1.11.2','1.11','1.10.2','1.9.4','1.9','1.8.9',
  ],
}

async function resolvePluginUrl(plugin, mcVersion) {
  if (plugin.modrinthSlug) {
    try {
      const loaders = ['paper','spigot','bukkit','purpur','folia']
      const encodedLoaders = encodeURIComponent(JSON.stringify(loaders))
      const encodedVersions = encodeURIComponent(JSON.stringify([mcVersion]))
      // Try exact MC version match
      const url = `https://api.modrinth.com/v2/project/${plugin.modrinthSlug}/version?loaders=${encodedLoaders}&game_versions=${encodedVersions}`
      const versions = await fetchJson(url)
      if (Array.isArray(versions) && versions.length > 0) {
        const file = versions[0].files.find(f => f.primary) || versions[0].files[0]
        if (file) return { url: file.url, filename: file.filename }
      }
    } catch {}
    try {
      const loaders = ['paper','spigot','bukkit','purpur','folia']
      const encodedLoaders = encodeURIComponent(JSON.stringify(loaders))
      // Fallback: any version, compatible loader
      const urlNoVer = `https://api.modrinth.com/v2/project/${plugin.modrinthSlug}/version?loaders=${encodedLoaders}`
      const versionsNoVer = await fetchJson(urlNoVer)
      if (Array.isArray(versionsNoVer) && versionsNoVer.length > 0) {
        const file = versionsNoVer[0].files.find(f => f.primary) || versionsNoVer[0].files[0]
        if (file) return { url: file.url, filename: file.filename }
      }
    } catch {}
  }

  let resolvedUrl = plugin.url
  let resolvedFilename = plugin.filename

  if (resolvedUrl) {
    if (resolvedUrl.includes('/job/')) {
      const resolved = await resolveJenkinsUrl(resolvedUrl)
      if (resolved !== resolvedUrl) {
        resolvedUrl = resolved
      }
    } else if (resolvedUrl.includes('github.com') && resolvedUrl.includes('/releases/latest/download/')) {
      const resolved = await resolveGithubLatestUrl(resolvedUrl)
      if (resolved !== resolvedUrl) {
        resolvedUrl = resolved
      }
    }
  }

  if (resolvedUrl && resolvedUrl !== plugin.url) {
    const urlFilename = resolvedUrl.substring(resolvedUrl.lastIndexOf('/') + 1)
    if (urlFilename && urlFilename.endsWith('.jar')) {
      resolvedFilename = urlFilename
    }
  }

  return { url: resolvedUrl, filename: resolvedFilename }
}

ipcMain.handle('get-versions', async (_, type) => {
  try {
    if (type === 'paper') {
      const d = await fetchJson('https://api.papermc.io/v2/projects/paper')
      return d.versions.reverse()
    }
    if (type === 'purpur') {
      const d = await fetchJson('https://api.purpurmc.org/v2/purpur')
      return d.versions.reverse()
    }
    if (type === 'fabric') {
      const d = await fetchJson('https://meta.fabricmc.net/v2/versions/game')
      return d.filter(v => v.stable).map(v => v.version)
    }
    if (type === 'hybrid') {
      // Hybrid (Geyser) runs on Paper — use Paper versions
      const d = await fetchJson('https://api.papermc.io/v2/projects/paper')
      return d.versions.reverse()
    }
    if (type === 'bedrock') {
      const releases = await fetchJson('https://api.github.com/repos/PowerNukkit/PowerNukkit/releases?per_page=15')
      return releases.map(r => r.tag_name.replace(/^v/, ''))
    }
    // vanilla
    const d = await fetchJson('https://launchermeta.mojang.com/mc/game/version_manifest.json')
    return d.versions.filter(v => v.type === 'release').map(v => v.id)
  } catch {
    return FALLBACK_VERSIONS[type] || FALLBACK_VERSIONS.paper
  }
})

// ── Create server ─────────────────────────────────────────────────────────────
ipcMain.handle('create-server', async (event, opts) => {
  const { name, type, version, ram, port, plugins: selectedPlugins, offlineMode = false, extraServerProperties = {}, gamePresetId } = opts

  // Input validation
  const safeName = String(name || 'Servidor').slice(0, 64)
  const safePort = Math.max(1024, Math.min(65535, Math.abs(parseInt(port) || 25565)))
  const safeRam  = Math.max(512, Math.min(16384, Math.round((parseInt(ram) || 2048) / 512) * 512))

  const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const serverDir = path.join(SERVERS_DIR, id)
  fs.mkdirSync(serverDir, { recursive: true })
  fs.mkdirSync(path.join(serverDir, 'plugins'), { recursive: true })

  log.info('Creating server', { id, name: safeName, type, version, ram: safeRam, port: safePort, plugins: (selectedPlugins || []).map(p => p.name), preset: gamePresetId || null, offline: offlineMode })

  const send = msg => safeSend(event.sender, 'create-progress', { id, msg })

  try {
    send(`Baixando ${type} ${version}...`)
    const jarPath = path.join(serverDir, 'server.jar')
    const jarUrl = await getJarUrl(type, version)
    await downloadFile(jarUrl, jarPath, pct => send(`Download: ${pct}%`))

    send('Configurando servidor...')
    fs.writeFileSync(path.join(serverDir, 'eula.txt'), 'eula=true\n')

    const isJava = type !== 'bedrock'
    if (isJava) {
      // Build base properties then merge any preset overrides
      const baseProps = parseServerProperties(buildServerProperties(safePort, safeName, offlineMode))
      const merged = { ...baseProps, ...extraServerProperties }
      fs.writeFileSync(path.join(serverDir, 'server.properties'), stringifyServerProperties(merged))
      fs.writeFileSync(path.join(serverDir, 'whitelist.json'), '[]')
      if (gamePresetId) send(`Modo de jogo: ${gamePresetId}`)
    }

    // Hybrid: also install Geyser + Floodgate
    if (type === 'hybrid') {
      send('Baixando GeyserMC (ponte Java↔Bedrock)...')
      await downloadFile(
        'https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot',
        path.join(serverDir, 'plugins', 'Geyser-Spigot.jar')
      ).catch(() => send('Aviso: falha ao baixar Geyser, instale manualmente'))

      send('Baixando Floodgate...')
      await downloadFile(
        'https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot',
        path.join(serverDir, 'plugins', 'Floodgate-Spigot.jar')
      ).catch(() => send('Aviso: falha ao baixar Floodgate, instale manualmente'))
    }

    if (selectedPlugins && selectedPlugins.length > 0) {
      send('Instalando plugins...')
      for (const pl of selectedPlugins) {
        send(`Instalando ${pl.name}...`)
        try {
          const { url: plUrl, filename: plFilename } = await resolvePluginUrl(pl, version)
          const rawFilename = plFilename || pl.filename || `${pl.name}.jar`
          const safeFilename = path.basename(rawFilename).replace(/[^a-zA-Z0-9._-]/g, '_')
          const pluginDest = path.join(serverDir, 'plugins', safeFilename)
          await downloadFile(plUrl, pluginDest, pct => send(`Plugin ${pl.name}: ${pct}%`))
        } catch (e) { send(`Aviso: falha ao instalar ${pl.name} — ${e.message}`) }
      }
    }

    // LuckPerms: pre-configure default permissions (YAML storage + common commands)
    const hasLuckPerms = selectedPlugins && selectedPlugins.some(p => p.name === 'LuckPerms')
    if (hasLuckPerms) {
      send('Configurando permissões padrão (LuckPerms)...')
      const lpDir = path.join(serverDir, 'plugins', 'LuckPerms')
      const lpGroupsDir = path.join(lpDir, 'yaml-storage', 'groups')
      fs.mkdirSync(lpGroupsDir, { recursive: true })
      // Use YAML storage so we can write the files directly
      fs.writeFileSync(path.join(lpDir, 'config.yml'), buildLuckPermsConfig())
      fs.writeFileSync(path.join(lpGroupsDir, 'default.yml'), buildLuckPermsDefaultGroup())
    }

    // Offline mode: generate AuthMe + SkinsRestorer configs pre-configured
    if (offlineMode) {
      send('Configurando modo offline (AuthMe + SkinsRestorer)...')

      const authmeDir = path.join(serverDir, 'plugins', 'AuthMe')
      fs.mkdirSync(authmeDir, { recursive: true })
      fs.writeFileSync(path.join(authmeDir, 'config.yml'), buildAuthMeConfig())

      const skinsDir = path.join(serverDir, 'plugins', 'SkinsRestorer')
      fs.mkdirSync(skinsDir, { recursive: true })
      fs.writeFileSync(path.join(skinsDir, 'config.yml'), buildSkinsRestorerConfig())
    }

    // Game preset: write pre-configured plugin files (zero setup for user)
    if (gamePresetId === 'kitpvp') {
      send('Configurando kits do KitPvP...')
      const essDir = path.join(serverDir, 'plugins', 'Essentials')
      fs.mkdirSync(essDir, { recursive: true })
      fs.writeFileSync(path.join(essDir, 'kits.yml'), buildKitPvPKits())
      // Also write EssentialsX config to enable kit command
      fs.writeFileSync(path.join(essDir, 'config.yml'), buildEssentialsKitConfig())
    }

    if (gamePresetId === 'skyblock-eco') {
      // no extra files needed for skyblock-eco preset
    }

    if (gamePresetId === 'bedwars') {
      send('Criando arena BedWars pré-configurada...')

      // ── 1. Write void world (bw_arena) with level.dat + data pack ────────────
      const arenaWorldDir = path.join(serverDir, 'bw_arena')
      const dpDir         = path.join(arenaWorldDir, 'datapacks', 'bw_setup')
      const mcTagDir      = path.join(dpDir, 'data', 'minecraft', 'tags', 'function')   // 1.21+ path
      const mcTagDirLegacy= path.join(dpDir, 'data', 'minecraft', 'tags', 'functions')  // pre-1.21 path
      const bwFuncDir     = path.join(dpDir, 'data', 'bw', 'functions')

      fs.mkdirSync(mcTagDir,       { recursive: true })
      fs.mkdirSync(mcTagDirLegacy, { recursive: true })
      fs.mkdirSync(bwFuncDir,      { recursive: true })

      // Minimal void-superflat level.dat (Minecraft 1.21.4, gzip-compressed NBT)
      fs.writeFileSync(path.join(arenaWorldDir, 'level.dat'), Buffer.from(BEDWARS_LEVEL_DAT_B64, 'base64'))

      // Data pack descriptor
      fs.writeFileSync(path.join(dpDir, 'pack.mcmeta'), buildBedWarsDataPackMeta())

      // Load tag — both paths for cross-version compat
      const loadJson = JSON.stringify({ values: ['bw:setup'] })
      fs.writeFileSync(path.join(mcTagDir,       'load.json'), loadJson)
      fs.writeFileSync(path.join(mcTagDirLegacy, 'load.json'), loadJson)

      // Arena builder function
      fs.writeFileSync(path.join(bwFuncDir, 'setup.mcfunction'), buildBedWarsSetupFunction())

      // ── 2. Write BedWars1058 arena config ─────────────────────────────────────
      const arenaDir = path.join(serverDir, 'plugins', 'BedWars1058', 'Arenas')
      fs.mkdirSync(arenaDir, { recursive: true })
      fs.writeFileSync(path.join(arenaDir, 'bw_arena.yml'), buildBedWarsArenaYaml())

      send('Arena BedWars pronta — 2 times, loja, upgrades e geradores configurados ✅')
    }

    const server = { id, name: safeName, type, version, ram: safeRam, port: safePort, dir: serverDir, createdAt: Date.now(), playit: false }
    const servers = readServers()
    servers.push(server)
    writeServers(servers)

    log.info('Server created successfully', { id, name: safeName, type, version, ram: safeRam, port: safePort, preset: gamePresetId || null })
    send('Servidor criado com sucesso!')
    return { ok: true, server }
  } catch (e) {
    log.error('Server creation failed', { name: safeName, type, version, message: e.message })
    return { ok: false, error: e.message }
  }
})

async function getJarUrl(type, version) {
  if (type === 'paper' || type === 'hybrid') {
    const builds = await fetchJson(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds`)
    const build = builds.builds[builds.builds.length - 1].build
    return `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/paper-${version}-${build}.jar`
  }
  if (type === 'purpur') {
    return `https://api.purpurmc.org/v2/purpur/${version}/latest/download`
  }
  if (type === 'vanilla') {
    const manifest = await fetchJson('https://launchermeta.mojang.com/mc/game/version_manifest.json')
    const entry = manifest.versions.find(v => v.id === version)
    if (!entry) throw new Error(`Versão Vanilla ${version} não encontrada`)
    const vdata = await fetchJson(entry.url)
    const serverUrl = vdata?.downloads?.server?.url
    if (!serverUrl) throw new Error(`JAR do servidor Vanilla ${version} não disponível`)
    return serverUrl
  }
  if (type === 'fabric') {
    const loaders = await fetchJson(`https://meta.fabricmc.net/v2/versions/loader/${version}`)
    const lv = loaders[0].loader.version
    const installer = await fetchJson('https://meta.fabricmc.net/v2/versions/installer')
    const iv = installer[0].version
    return `https://meta.fabricmc.net/v2/versions/loader/${version}/${lv}/${iv}/server/jar`
  }
  if (type === 'bedrock') {
    // PowerNukkit — Bedrock protocol, runs on Java (Mac/Win/Linux)
    const tag = version.startsWith('v') ? version : `v${version}`
    const releases = await fetchJson('https://api.github.com/repos/PowerNukkit/PowerNukkit/releases?per_page=20')
    const release = releases.find(r => r.tag_name === tag || r.tag_name === version) || releases[0]
    const asset = release.assets.find(a => a.name.endsWith('.jar') && !a.name.includes('sources') && !a.name.includes('javadoc'))
    if (!asset) throw new Error('JAR do PowerNukkit não encontrado')
    return asset.browser_download_url
  }
  throw new Error(`Tipo desconhecido: ${type}`)
}

function buildServerProperties(port, name, offlineMode = false) {
  return [
    `server-port=${port}`,
    `motd=${name} - via CraftServer`,
    `online-mode=${offlineMode ? 'false' : 'true'}`,
    'white-list=false',
    'max-players=20',
    'gamemode=survival',
    'difficulty=normal',
    'pvp=true',
    'spawn-monsters=true',
    'spawn-animals=true',
    'spawn-npcs=true',
    'allow-flight=false',
    'spawn-protection=16',
    'view-distance=10',
    'simulation-distance=10',
    'level-name=world',
    'level-seed=',
    'server-ip=',
    'network-compression-threshold=256',
    'max-tick-time=60000',
  ].join('\n') + '\n'
}

function buildAuthMeConfig() {
  return `# AuthMe config — generated by CraftServer (offline mode)
DataSource:
  backend: SQLITE

settings:
  sessions:
    sessionLength: 0
    sessions: true

  registration:
    enabled: true
    force: true
    messageInterval: 20
    freeNameField: true

  restrictions:
    allowedNicknames: '^[a-zA-Z0-9_]{2,16}$'
    kickNonRegistered: false

  security:
    passwordMinLength: 4
    passwordMaxLength: 30

  email:
    smtp: ''
    senderEmail: ''

Premium:
  autoLogin: true
  checkPremiumAtStartup: true

GroupOptions:
  UnregisteredPlayerGroup: ''

# CraftServer: premium players (original game) auto-login via Mojang API.
# Cracked players must /register <password> once, then /login each session.
`
}

function buildSkinsRestorerConfig() {
  return `# SkinsRestorer config — generated by CraftServer (offline mode)
SkinRestorer:
  skinWithoutPerm: false
  StorageType: FILE
  AskProxyForSkins: false
  PipelineTimeout: 5
  WaitBeforeFetching: 2
  # Offline mode: SkinsRestorer fetches skins from Mojang even in offline servers.
  # Players keep their skin regardless of online-mode setting.
`
}

// ─── KitPvP: EssentialsX kits.yml ────────────────────────────────────────────
function buildKitPvPKits() {
  return `# EssentialsX kits — generated by CraftServer (KitPvP preset)
# Players use /kit <name> to equip. Delay 0 = free use every time.
kits:
  guerreiro:
    delay: 0
    items:
      - iron_sword 1
      - iron_helmet 1
      - iron_chestplate 1
      - iron_leggings 1
      - iron_boots 1
      - cooked_beef 8

  arqueiro:
    delay: 0
    items:
      - bow 1
      - arrow 64
      - leather_helmet 1
      - leather_chestplate 1
      - leather_leggings 1
      - leather_boots 1
      - cooked_beef 8

  mago:
    delay: 0
    items:
      - wooden_sword 1
      - leather_helmet 1
      - leather_chestplate 1
      - leather_leggings 1
      - leather_boots 1
      - splash_potion:8226 3
      - cooked_beef 8

  tank:
    delay: 0
    items:
      - stone_sword 1
      - iron_helmet 1
      - diamond_chestplate 1
      - diamond_leggings 1
      - diamond_boots 1
      - cooked_beef 4
`
}

function buildEssentialsKitConfig() {
  return `# EssentialsX config — generated by CraftServer (KitPvP preset)
ops-name-color: 'none'
chat:
  format: '&7[{GROUP}] {DISPLAYNAME}&f: {MESSAGE}'
  group-formats: {}
# Allow players to use /kit freely
kits:
  signUse: false
  autorma: false
`
}

// ─── Island Economy: BentoBox Shop addon config ───────────────────────────────
function buildShopConfig() {
  return `# BentoBox Shop addon config — generated by CraftServer (Ilha Economia preset)
# Players open the shop with /shop from their island
# Prices pre-configured for balanced skyblock economy

gui-title: "&6&lLoja da Ilha"
gui-size: 54

categories:
  - id: FARMING
    name: "&aFazenda"
    icon: WHEAT
    items:
      - id: WHEAT
        name: "&fTrigo"
        buy-price: 2.0
        sell-price: 1.0
        amount: 64
      - id: SUGAR_CANE
        name: "&fCana de Açúcar"
        buy-price: 1.0
        sell-price: 0.5
        amount: 64
      - id: PUMPKIN
        name: "&fAbóbora"
        buy-price: 3.0
        sell-price: 1.5
        amount: 16
      - id: MELON_SLICE
        name: "&fMelancia"
        buy-price: 1.0
        sell-price: 0.3
        amount: 64
      - id: CARROT
        name: "&fCenoura"
        buy-price: 1.5
        sell-price: 0.7
        amount: 64
      - id: POTATO
        name: "&fBatata"
        buy-price: 1.5
        sell-price: 0.7
        amount: 64
      - id: NETHER_WART
        name: "&fVerruga do Nether"
        buy-price: 5.0
        sell-price: 2.0
        amount: 16

  - id: MINERALS
    name: "&bMinerais"
    icon: IRON_INGOT
    items:
      - id: IRON_INGOT
        name: "&fFerro"
        buy-price: 5.0
        sell-price: 2.5
        amount: 16
      - id: GOLD_INGOT
        name: "&6Ouro"
        buy-price: 8.0
        sell-price: 4.0
        amount: 8
      - id: DIAMOND
        name: "&bDiamante"
        buy-price: 50.0
        sell-price: 25.0
        amount: 1
      - id: EMERALD
        name: "&aEsmeralda"
        buy-price: 30.0
        sell-price: 15.0
        amount: 1
      - id: REDSTONE
        name: "&cRedstone"
        buy-price: 2.0
        sell-price: 0.8
        amount: 64
      - id: LAPIS_LAZULI
        name: "&9Lápis"
        buy-price: 1.0
        sell-price: 0.4
        amount: 64
      - id: COAL
        name: "&fCarvão"
        buy-price: 1.0
        sell-price: 0.3
        amount: 64

  - id: MISC
    name: "&eDiversos"
    icon: CHEST
    items:
      - id: COBBLESTONE
        name: "&fPedra"
        buy-price: 0.5
        sell-price: 0.1
        amount: 64
      - id: SAND
        name: "&fAreia"
        buy-price: 0.5
        sell-price: 0.1
        amount: 64
      - id: GLASS
        name: "&fVidro"
        buy-price: 1.0
        sell-price: 0.3
        amount: 64
      - id: OAK_LOG
        name: "&fMadeira"
        buy-price: 2.0
        sell-price: 0.8
        amount: 16
      - id: STRING
        name: "&fFio"
        buy-price: 2.0
        sell-price: 1.0
        amount: 16
      - id: LEATHER
        name: "&fCouro"
        buy-price: 3.0
        sell-price: 1.5
        amount: 16
`
}

// ── LuckPerms: default permissions ───────────────────────────────────────────
function buildLuckPermsConfig() {
  return `# LuckPerms config — generated by CraftServer
# Using YAML storage so permissions are pre-configurable
storage-method: yaml
data:
  address: localhost
  database: minecraft
  username: sa
  password: ''
  prefix: luckperms_
  max-pool-size: 10
  min-idle: 10
  max-lifetime: 1800000
  keepalive-time: 0
  connection-timeout: 5000
  properties: {}
`
}

function buildLuckPermsDefaultGroup() {
  return `# LuckPerms default group — generated by CraftServer
# All players inherit these permissions by default.
name: default
permissions:
  - bukkit.command.help=true
  - bukkit.command.list=true
  - bukkit.command.me=true
weight: 0
display-name: Member
prefix: ''
suffix: ''
metadata: {}
parents: []
`
}

// ── BedWars plug-and-play assets ─────────────────────────────────────────────

// Minimal void-superflat level.dat for Minecraft 1.21.4 (gzip-compressed NBT).
// Contains: DataVersion=4189, WorldGenSettings with minecraft:flat + the_void biome,
// legacy generatorName=flat, DataPacks.Enabled includes "file/bw_setup".
// Generated by craftnest/scripts/gen-level-dat.py
const BEDWARS_LEVEL_DAT_B64 =
  'H4sIAOgjCmoC/3VUzW7TQBAeN27iuA1NfyTuPldFRRxQLrRp2goIECkVLUVVtIknyar2brS7ThSqXDnx' +
  'AiAOvAgPwFsxaztxy89e7Jlvduabb2fXB/DBbTHDSrBhP+9RaS4FQP2mBJXp0nr104dKjpVg7WVoAzxw' +
  '37IYoXx48PTw4JkH5S4qjhrcmHHhgNcVbKLH0gB4UG3jFKM03uvPekyhoJreOTku5hMEWg74LT4c8kES' +
  'mfmaA/XCasvBLYbggnvB4zQY4PHEhUqLze97HKgoqs3FyGYz40SERIksKmWBNNb5/IO6zcHCU+5O2Exc' +
  '2URL4wP9Hy+Na4usg58ax2IU5aS9MVPhQCpKAzUWRXJ2IuOYiVA7DmwQGcNZxD9h6Ljgt5k2nYjNqZl8' +
  'laHWlIqYnKAwqK7+478u/H7m71LO4y/fn2fOvcLZRjW5YGqEZgm7sPMHvNLM7n2Ug2yI11Lg0d4SyJO2' +
  'WMxG2EHVjOgcXvz6ate3Muxm8CVTVvEU1MXm7QeorXh0kGE+1C+lisJzFF00hlBNJ6uxEMWB7REKVMxg' +
  'b4jMJIrGitTsS5Ho3mCM2lAWP6Skws6k9mE35gIHig1NQ9LczmwBmlBjh+tfmA/VvIRUy7hHRdwwYsYH' +
  'T+f8PFjvc0mi7RQhZoy9qeQhjcA9jusRu6WfKuxqo5KBdfdsUcVDpDS0qlC2E6CINHVqM1vloFZkZlzR' +
  '1I2Rj8YmVSNdHtRWjNOL5FqSJaivvKvba4ML97uJsRpBfBekTQSN4O8ugv0gYxU0PlKcpfQgjjhRSMYp' +
  'aBwubvaDVYO05+6htVgsSGD7onQYTUUVvBbXrB9hmEtQORUrc41eGiZ4FDGoDXmET+iBIOGTCZ3xFmZx' +
  'Z0uFaXhOEm1k3JRan07pcljfRkuxkRRnlp0Dm5n1mlLStaOXpKNwymWio3nuIwZbXZqjMCEry+JnxDbp' +
  'EaPjaip7g71U/SU72nXJ9BsZhumk/gZwFFDnPQUAAA=='

function buildBedWarsDataPackMeta() {
  return JSON.stringify({
    pack: {
      pack_format: 48,
      supported_formats: [26, 99],
      description: 'BedWars Arena Setup — generated by CraftServer',
    },
  }, null, 2)
}

// Arena builder mcfunction — runs every server start via #minecraft:load tag.
// Rebuilds the essential structure so beds and platforms are always intact.
function buildBedWarsSetupFunction() {
  return `# BedWars Arena Auto-Setup — generated by CraftServer
# Runs on every server start: ensures beds and islands are always intact.
# Layout: 2 teams (Red / Blue), Y=64 islands, waiting lobby Y=80.

# ── Waiting lobby (y=79 platform, spawn at y=80) ─────────────────────
fill -5 79 -5 5 79 5 minecraft:polished_andesite
setblock 0 79 0 minecraft:gold_block

# ── Center island ─────────────────────────────────────────────────────
fill -3 63 -3 3 64 3 minecraft:stone

# ── Diamond mid-islands ───────────────────────────────────────────────
fill -3 63 -37 3 64 -33 minecraft:smooth_stone
fill -3 63  33 3 64  37 minecraft:smooth_stone

# ── Red island (center at z=-70) ──────────────────────────────────────
fill -4 64 -74 4 64 -66 minecraft:red_wool
setblock 0 65 -74 minecraft:red_bed[facing=south,part=foot]
setblock 0 65 -73 minecraft:red_bed[facing=south,part=head]

# ── Blue island (center at z=70) ──────────────────────────────────────
fill -4 64 66 4 64 74 minecraft:blue_wool
setblock 0 65 74 minecraft:blue_bed[facing=north,part=foot]
setblock 0 65 73 minecraft:blue_bed[facing=north,part=head]

# ── Game rules ────────────────────────────────────────────────────────
gamerule doDaylightCycle false
gamerule announceAdvancements false
gamerule doInsomnia false
gamerule doImmediateRespawn true
gamerule doWeatherCycle false
`
}

// BedWars1058 arena YAML — coordinates match the mcfunction layout above.
// World name: bw_arena (matches the folder name Minecraft creates).
function buildBedWarsArenaYaml() {
  return `# BedWars1058 arena — generated by CraftServer
# World: bw_arena | Teams: Red vs Blue | Max players per team: 2
# Coordinates match the data pack layout in bw_arena/datapacks/bw_setup/
group: Default
display-name: ''
minPlayers: 2
maxInTeam: 2
allowSpectate: true
spawn-protection: 0
shop-protection: 0
upgrades-protection: 0
island-radius: 0
worldBorder: 200
voidKill: true
max-build-y: 120
disable-generator-for-empty-teams: false
disable-npcs-for-empty-teams: true
vanilla-death-drops: false
use-bed-hologram: true
allow-map-break: false
game-rules:
- doDaylightCycle:false
- announceAdvancements:false
- doInsomnia:false
- doImmediateRespawn:true
- doWeatherCycle:false
waiting:
  Loc: 0.5,80.0,0.5,0.0,0.0
  Pos1: -5.0,85.0,-5.0,0.0,0.0
  Pos2: 5.0,79.0,5.0,0.0,0.0
Team:
  Red:
    Color: RED
    Spawn: 0.5,66.0,-70.0,0.0,0.0
    Bed: 0.0,65.0,-73.0,0.0,0.0
    Iron: -2.0,64.5,-70.0,0.0,90.0
    Gold: 2.0,64.5,-70.0,0.0,90.0
    Shop: 3.5,65.0,-74.0,90.0,0.0
    Upgrade: -2.5,65.0,-74.0,90.0,0.0
  Blue:
    Color: BLUE
    Spawn: 0.5,66.0,70.0,180.0,0.0
    Bed: 0.0,65.0,73.0,0.0,0.0
    Iron: -2.0,64.5,70.0,0.0,90.0
    Gold: 2.0,64.5,70.0,0.0,90.0
    Shop: 3.5,65.0,74.0,-90.0,0.0
    Upgrade: -2.5,65.0,74.0,-90.0,0.0
generator:
  Diamond:
  - 0.5,65.0,-35.0,0.0,90.0
  - 0.5,65.0,35.0,0.0,90.0
  Emerald:
  - 0.5,65.0,0.0,0.0,90.0
`
}

// ── Start / Stop ──────────────────────────────────────────────────────────────
ipcMain.handle('start-server', async (event, id) => {
  if (serverProcesses[id]) {
    log.warn('start-server: already running or starting', { serverId: id, state: serverProcesses[id] === 'starting' ? 'starting' : 'running' })
    return { ok: false, error: 'Servidor já está rodando' }
  }
  // Set sentinel immediately so concurrent calls are blocked during the async setup phase
  serverProcesses[id] = 'starting'
  const servers = readServers()
  const server = servers.find(s => s.id === id)
  if (!server) { delete serverProcesses[id]; log.warn('start-server: server not found', { serverId: id }); return { ok: false, error: 'Servidor não encontrado' } }
  if (!fs.existsSync(server.dir)) { delete serverProcesses[id]; log.error('start-server: server dir missing', { serverId: id, dir: server.dir }); return { ok: false, error: 'Pasta do servidor não encontrada' } }

  log.info('Starting server', { serverId: id, name: server.name, type: server.type, version: server.version, ram: server.ram, port: server.port })

  const javaCmd = await findJava()
  if (!javaCmd) { delete serverProcesses[id]; log.error('start-server: Java not found'); return { ok: false, error: 'Java não encontrado. Instale Java 21+ em adoptium.net' } }

  const minJava = requiredJavaVersion(server.version)
  const javaVersionStr = await new Promise(res => {
    execFile(javaCmd, ['-version'], { timeout: 8000 }, (err, stdout, stderr) => {
      const out = (stderr || stdout || '').trim()
      const m = out.match(/version "([^"]+)"/)
      res(m ? m[1] : '0')
    })
  })
  const javaMajor = parseInt(javaVersionStr.split('.')[0]) || 0
  log.info('Java detected', { cmd: javaCmd, version: javaVersionStr, major: javaMajor, required: minJava })
  if (javaMajor < minJava) {
    delete serverProcesses[id]
    log.warn('start-server: Java version too old', { detected: javaMajor, required: minJava })
    return { ok: false, error: `Minecraft ${server.version} requer Java ${minJava}+. Versão atual: Java ${javaMajor}. Baixe em adoptium.net` }
  }

  const port = parseInt(server.port) || 25565
  const portInUse = await new Promise(res => {
    const net = require('net')
    const tester = net.createServer()
    tester.once('error', () => res(true))
    tester.once('listening', () => { tester.close(); res(false) })
    tester.listen(port)
  })
  if (portInUse) {
    delete serverProcesses[id]
    log.warn('start-server: port in use', { serverId: id, port })
    return { ok: false, error: `Porta ${port} já está em uso. Mude a porta do servidor ou feche o programa que está usando-a.` }
  }

  // ── PlayIt secret sync ───────────────────────────────────────────────────────
  // If the user has ever logged into PlayIt on any server, share that secret
  // automatically so they don't need to re-authenticate on each new server.
  const playitPluginDir = path.join(server.dir, 'plugins', 'playit-gg')
  const playitCfgFile  = path.join(playitPluginDir, 'config.yml')
  const hasPlayitPlugin = fs.existsSync(path.join(server.dir, 'plugins')) &&
    fs.readdirSync(path.join(server.dir, 'plugins')).some(f => f.startsWith('playit'))

  if (hasPlayitPlugin) {
    const globalSecret = readConfig().playitSecret
    if (globalSecret) {
      fs.mkdirSync(playitPluginDir, { recursive: true })
      // Only write if current config has no secret (don't overwrite a different valid secret)
      let existingSecret = ''
      if (fs.existsSync(playitCfgFile)) {
        const existing = fs.readFileSync(playitCfgFile, 'utf8')
        const m = existing.match(/agent-secret:\s*"?([^"\n\r]+)"?/)
        existingSecret = m ? m[1].trim() : ''
      }
      if (!existingSecret || existingSecret === globalSecret) {
        fs.writeFileSync(playitCfgFile, `mc-timeout-sec: 30\nagent-secret: "${globalSecret}"\n`)
        log.info('PlayIt: injected shared agent-secret', { serverId: id })
      }
    }
  }

  const ramArg = `${server.ram}M`
  const proc = spawn(javaCmd, [
    `-Xmx${ramArg}`, `-Xms${ramArg}`,
    '-Dfile.encoding=UTF-8',
    '-Dstdout.encoding=UTF-8',
    '-jar', 'server.jar', 'nogui',
  ], {
    cwd: server.dir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, JAVA_TOOL_OPTIONS: '-Dfile.encoding=UTF-8' },
  })
  proc.stdin.setDefaultEncoding('utf8')
  serverProcesses[id] = proc
  log.info('Server process spawned', { serverId: id, pid: proc.pid, java: javaCmd, ram: server.ram })

  const toUtf8 = d => d.toString('utf8')
  // Track players online via log parsing
  const playerSet = new Set()
  const onLog = (d) => {
    const text = toUtf8(d)
    safeSend(event.sender, 'server-log', { id, text })
    // Detect join / leave
    const joined = text.match(/:\s+(\S+) joined the game/)
    const left   = text.match(/:\s+(\S+) left the game/)
    if (joined) { playerSet.add(joined[1]); safeSend(event.sender, 'player-count', { id, count: playerSet.size }) }
    if (left)   { playerSet.delete(left[1]); safeSend(event.sender, 'player-count', { id, count: playerSet.size }) }
  }
  proc.stdout.on('data', onLog)
  proc.stderr.on('data', onLog)
  proc.on('close', code => {
    delete serverProcesses[id]
    log.info('Server process exited', { serverId: id, exitCode: code })
    // Capture PlayIt agent-secret after server stops — save globally for other servers
    if (hasPlayitPlugin && fs.existsSync(playitCfgFile)) {
      try {
        const cfgText = fs.readFileSync(playitCfgFile, 'utf8')
        const m = cfgText.match(/agent-secret:\s*"?([a-zA-Z0-9_\-]{20,})"?/)
        if (m) {
          const captured = m[1].trim()
          const current = readConfig().playitSecret
          if (captured && captured !== current) {
            writeConfig({ ...readConfig(), playitSecret: captured })
            log.info('PlayIt: saved agent-secret globally', { serverId: id })
          }
        }
      } catch {}
    }
    safeSend(event.sender, 'server-stopped', { id, code })
  })
  return { ok: true }
})

ipcMain.handle('stop-server', async (_, id) => {
  const proc = serverProcesses[id]
  if (!proc || proc === 'starting') { log.warn('stop-server: not running', { serverId: id }); return { ok: false } }
  log.info('Stopping server', { serverId: id, pid: proc.pid })
  if (proc.stdin.writable) {
    proc.stdin.write('save-all\n')
    await new Promise(r => setTimeout(r, 2000))
  }
  if (proc.stdin.writable) proc.stdin.write('stop\n')
  const killTimer = setTimeout(() => { if (serverProcesses[id]) proc.kill('SIGKILL') }, 12000)
  proc.once('close', () => clearTimeout(killTimer))
  return { ok: true }
})

ipcMain.handle('send-command', (_, { id, command }) => {
  const proc = serverProcesses[id]
  if (!proc || proc === 'starting' || !proc.stdin.writable) return { ok: false }
  const safe = String(command ?? '').replace(/[\r\n]+/g, ' ').slice(0, 1024)
  if (!safe.trim()) return { ok: false }
  proc.stdin.write(safe + '\n')
  return { ok: true }
})

ipcMain.handle('get-running-servers', () =>
  Object.entries(serverProcesses).filter(([, v]) => v !== 'starting').map(([k]) => k)
)

// ── Backups ──────────────────────────────────────────────────────────────────
ipcMain.handle('get-backup-config', () => {
  const backupDir = getBackupDir()
  return {
    backupDir,
    defaultBackupDir: BACKUPS_DIR,
    googleDriveDirs: detectGoogleDriveDirs(),
  }
})

ipcMain.handle('set-backup-dir', (_, backupDir) => {
  if (!backupDir || typeof backupDir !== 'string') return { ok: false, error: 'Pasta inválida' }
  fs.mkdirSync(backupDir, { recursive: true })
  writeConfig({ ...readConfig(), backupDir })
  return { ok: true, backupDir }
})

ipcMain.handle('choose-backup-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Escolher pasta de backups',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true }
  const backupDir = result.filePaths[0]
  fs.mkdirSync(backupDir, { recursive: true })
  writeConfig({ ...readConfig(), backupDir })
  return { ok: true, backupDir }
})

ipcMain.handle('list-server-backups', (_, serverId) => {
  const dir = getBackupDir()
  try {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(name => name.endsWith('.zip') && name.includes(`-${serverId}-`))
      .map(name => {
        const file = path.join(dir, name)
        const stat = fs.statSync(file)
        return { name, path: file, size: stat.size, createdAt: stat.mtimeMs }
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch (e) {
    log.error('Failed to list backups', { serverId, message: e.message })
    return []
  }
})

ipcMain.handle('create-server-backup', async (event, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { ok: false, error: 'Servidor não encontrado' }
  if (serverProcesses[serverId] && serverProcesses[serverId] !== 'starting') return { ok: false, error: 'Pare o servidor antes de criar backup para evitar arquivos corrompidos.' }
  if (!fs.existsSync(server.dir)) return { ok: false, error: 'Pasta do servidor não encontrada' }

  const backupDir = getBackupDir()
  fs.mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${sanitizeFilePart(server.name)}-${server.id}-${stamp}.zip`
  const dest = path.join(backupDir, filename)
  safeSend(event.sender, 'create-progress', { id: serverId, msg: `Criando backup ${filename}...` })

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(dest)
    const archive = archiver('zip', { zlib: { level: 9 } })
    const cleanup = (err) => {
      try { fs.unlinkSync(dest) } catch {}
      reject(err)
    }
    output.on('close', resolve)
    output.on('error', cleanup)
    archive.on('error', cleanup)
    archive.pipe(output)
    archive.directory(server.dir, false)
    archive.finalize()
  })

  log.info('Server backup created', { serverId, dest })
  safeSend(event.sender, 'create-progress', { id: serverId, msg: 'Backup criado com sucesso!' })
  return { ok: true, backup: { name: filename, path: dest, size: fs.statSync(dest).size, createdAt: Date.now() } }
})

ipcMain.handle('reveal-backup', (_, backupPath) => {
  if (backupPath && fs.existsSync(backupPath)) shell.showItemInFolder(backupPath)
  else shell.openPath(getBackupDir())
  return { ok: true }
})

// ── World / Map import ────────────────────────────────────────────────────────
ipcMain.handle('import-world', async (_, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) { log.warn('import-world: server not found', { serverId }); return { ok: false, error: 'Servidor não encontrado' } }
  if (serverProcesses[serverId]) { log.warn('import-world: server is running', { serverId }); return { ok: false, error: 'Pare o servidor antes de importar um mapa.' } }
  log.info('World import started', { serverId })

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar mapa (.zip)',
    filters: [{ name: 'Arquivo ZIP', extensions: ['zip'] }],
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true }

  const zipPath = result.filePaths[0]
  const extract = require('extract-zip')

  const propsFile = path.join(server.dir, 'server.properties')
  let worldName = 'world'
  if (fs.existsSync(propsFile)) {
    const p = parseServerProperties(fs.readFileSync(propsFile, 'utf8'))
    if (p['level-name']) worldName = String(p['level-name'])
  }

  const worldDir = path.join(server.dir, worldName)
  const tmpDir = path.join(os.tmpdir(), `craftserver-import-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  try {
    await extract(zipPath, { dir: tmpDir })

    // Detect if the zip contains a single top-level folder (common for downloaded maps)
    const entries = fs.readdirSync(tmpDir)
    let sourceDir = tmpDir
    if (entries.length === 1) {
      const single = path.join(tmpDir, entries[0])
      if (fs.statSync(single).isDirectory()) sourceDir = single
    }

    // Check this looks like a Minecraft world (has level.dat or region/)
    const hasLevelDat = fs.existsSync(path.join(sourceDir, 'level.dat'))
    const hasRegion   = fs.existsSync(path.join(sourceDir, 'region'))
    if (!hasLevelDat && !hasRegion) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      return { ok: false, error: 'O arquivo ZIP não parece ser um mundo Minecraft válido (sem level.dat ou pasta region/).' }
    }

    // Remove existing world
    if (fs.existsSync(worldDir)) fs.rmSync(worldDir, { recursive: true, force: true })

    // Move extracted world to server dir
    fs.mkdirSync(worldDir, { recursive: true })
    for (const entry of fs.readdirSync(sourceDir)) {
      fs.renameSync(path.join(sourceDir, entry), path.join(worldDir, entry))
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
    log.info('World import completed', { serverId, worldName, zipPath })
    return { ok: true, worldName }
  } catch (e) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    log.error('World import failed', { serverId, zipPath, message: e.message })
    return { ok: false, error: `Erro ao extrair: ${e.message}` }
  }
})

// ── Dependency check ─────────────────────────────────────────────────────────
ipcMain.handle('check-dependencies', async () => {
  const javaCmd = await findJava()
  let javaVersion = null
  if (javaCmd) {
    javaVersion = await new Promise(res => {
      execFile(javaCmd, ['-version'], { timeout: 5000 }, (err, stdout, stderr) => {
        const out = (stderr || stdout || '').trim()
        const m = out.match(/version "([^"]+)"/)
        res(m ? m[1] : 'instalado')
      })
    })
  }
  const majorVersion = javaVersion ? parseInt(javaVersion.split('.')[0]) : 0
  const javaOk = javaCmd !== null && majorVersion >= 17
  const java25Ok = javaCmd !== null && majorVersion >= 25
  log.info('Dependency check', { java: { ok: javaOk, java25: java25Ok, version: javaVersion, cmd: javaCmd } })
  return {
    java: { ok: javaOk, java25: java25Ok, version: javaVersion, cmd: javaCmd },
  }
})

ipcMain.handle('open-external', (_, url) => {
  if (typeof url !== 'string') return
  if (!url.startsWith('https://') && !url.startsWith('http://')) return
  return shell.openExternal(url)
})

async function findJava() {
  const candidates = []

  // User-configured path first (highest priority)
  const cfgPath = readConfig().javaPath
  if (cfgPath) candidates.push(cfgPath)

  // JAVA_HOME env var
  if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, 'bin', 'java'))

  // PATH lookup (works if Java is properly on PATH — may not work right after install)
  candidates.push('java')

  if (process.platform === 'darwin') {
    // Scan all JVMs installed via /Library/Java/JavaVirtualMachines (catches any version/build)
    const jvmBase = '/Library/Java/JavaVirtualMachines'
    try {
      const dirs = fs.readdirSync(jvmBase).sort().reverse() // newest (25 > 21) first
      for (const d of dirs) candidates.push(path.join(jvmBase, d, 'Contents', 'Home', 'bin', 'java'))
    } catch {}
    // Homebrew & common explicit paths
    candidates.push(
      '/usr/bin/java',
      '/usr/local/bin/java',
      '/opt/homebrew/opt/openjdk/bin/java',
      '/opt/homebrew/opt/openjdk@21/bin/java',
    )
  }

  if (process.platform === 'win32') {
    const win32Bases = [
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Microsoft',
    ]
    for (const base of win32Bases) {
      try {
        const dirs = fs.readdirSync(base).sort().reverse() // newest build first
        for (const d of dirs) candidates.push(path.join(base, d, 'bin', 'java.exe'))
      } catch {}
    }
  }

  for (const cmd of candidates.filter(Boolean)) {
    try {
      await new Promise((res, rej) => execFile(cmd, ['-version'], { timeout: 5000 }, err => err ? rej() : res()))
      return cmd
    } catch {}
  }
  return null
}

function requiredJavaVersion(mcVersion) {
  if (!mcVersion) return 21
  const major = parseFloat(mcVersion)
  if (major >= 26) return 25
  // Parse minor/patch for semantic comparison (avoids string-sort bugs like '1.9' > '1.17')
  const parts = mcVersion.split('.').map(Number)
  const minor = parts[1] ?? 0
  const patch  = parts[2] ?? 0
  if (minor > 20 || (minor === 20 && patch >= 5)) return 21
  if (minor >= 17) return 17
  return 8
}

// ── Servers ───────────────────────────────────────────────────────────────────
ipcMain.handle('get-servers', () => readServers())

ipcMain.handle('delete-server', (_, id) => {
  if (serverProcesses[id] && serverProcesses[id] !== 'starting') { log.warn('delete-server: server is running', { serverId: id }); return { ok: false, error: 'Pare o servidor antes de deletar.' } }
  if (serverProcesses[id] === 'starting') { log.warn('delete-server: server is starting', { serverId: id }); return { ok: false, error: 'Aguarde o servidor terminar de iniciar antes de deletar.' } }
  const servers = readServers()
  const server = servers.find(s => s.id === id)
  writeServers(servers.filter(s => s.id !== id))
  const dir = server?.dir
  if (dir && fs.existsSync(dir)) {
    const resolved = path.resolve(dir)
    const serversResolved = path.resolve(SERVERS_DIR)
    if (resolved.startsWith(serversResolved + path.sep) || resolved === serversResolved) {
      fs.rmSync(dir, { recursive: true, force: true })
      log.info('Server deleted', { serverId: id, name: server?.name, dir })
    } else {
      log.error('delete-server: dir outside SERVERS_DIR, skipped rmSync', { dir, resolved })
    }
  } else {
    log.info('Server deleted (no dir on disk)', { serverId: id, name: server?.name })
  }
  return { ok: true }
})

// ── Plugins ───────────────────────────────────────────────────────────────────
ipcMain.handle('search-plugins', async (_, { query, loader, gameVersion }) => {
  try {
    const facetList = loader === 'fabric'
      ? [['project_type:mod'], ['categories:fabric']]
      : [['project_type:plugin']]
    // Only add version facet for classic 1.x versions — Modrinth doesn't index 26.x yet
    if (gameVersion && /^1\.\d+/.test(gameVersion)) {
      facetList.push([`versions:${gameVersion}`])
    }
    const facets = JSON.stringify(facetList)
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query || '')}&facets=${encodeURIComponent(facets)}&limit=50&index=downloads`
    const data = await fetchJson(url)
    return (data.hits || []).map(h => ({ ...h, source: 'modrinth' }))
  } catch {
    return []
  }
})

ipcMain.handle('search-hangar', async (_, { query }) => {
  try {
    const url = `https://hangar.papermc.io/api/v1/projects?query=${encodeURIComponent(query || '')}&limit=20&orderBy=downloads`
    const data = await fetchJson(url)
    return (data.result || []).map(p => ({
      project_id: `hangar:${p.namespace.owner}/${p.namespace.slug}`,
      slug: p.namespace.slug,
      title: p.name,
      description: p.description,
      icon_url: p.iconUrl || null,
      downloads: p.stats?.downloads || 0,
      categories: [],
      source: 'hangar'
    }))
  } catch {
    return []
  }
})

ipcMain.handle('install-plugin', async (event, { serverId, projectId, projectTitle }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) { log.warn('install-plugin: server not found', { serverId }); return { ok: false, error: 'Servidor não encontrado' } }
  log.info('Installing plugin', { serverId, projectId, projectTitle })

  // ── Hangar install ────────────────────────────────────────────────────────
  if (projectId.startsWith('hangar:')) {
    const namespacePart = projectId.slice('hangar:'.length) // "owner/slug"
    const [owner, slug] = namespacePart.split('/')
    if (!owner || !slug) return { ok: false, error: 'ID de plugin Hangar inválido' }
    try {
      const vData = await fetchJson(
        `https://hangar.papermc.io/api/v1/projects/${owner}/${slug}/versions?limit=1&requestedPlatform=PAPER`
      )
      const ver = vData.result?.[0]
      if (!ver) return { ok: false, error: 'Versão não encontrada no Hangar' }
      const version = ver.name
      const downloadUrl = ver.downloads?.PAPER?.downloadUrl ||
        `https://hangar.papermc.io/api/v1/projects/${owner}/${slug}/versions/${encodeURIComponent(version)}/PAPER/jar`
      const filename = `${slug}-${version}.jar`
      safeSend(event.sender, 'create-progress', { id: serverId, msg: `Instalando ${projectTitle}...` })
      await downloadFile(downloadUrl, path.join(server.dir, 'plugins', filename))
      return { ok: true, filename }
    } catch (e) {
      return { ok: false, error: String(e?.message || e) }
    }
  }

  const loaderFilter = server.type === 'fabric' ? ['fabric'] : ['paper','bukkit','spigot','purpur','folia']
  const encodedLoaders = encodeURIComponent(JSON.stringify(loaderFilter))
  const encodedVersions = encodeURIComponent(JSON.stringify([server.version]))

  let compatible = null

  // Try 1: exact MC version + loader
  try {
    const vs = await fetchJson(`https://api.modrinth.com/v2/project/${projectId}/version?loaders=${encodedLoaders}&game_versions=${encodedVersions}`)
    if (Array.isArray(vs) && vs.length > 0) compatible = vs[0]
  } catch {}

  // Try 2: compatible loader, any version
  if (!compatible) {
    try {
      const vs = await fetchJson(`https://api.modrinth.com/v2/project/${projectId}/version?loaders=${encodedLoaders}`)
      if (Array.isArray(vs) && vs.length > 0) compatible = vs[0]
    } catch {}
  }

  // Try 3: any version
  if (!compatible) {
    try {
      const vs = await fetchJson(`https://api.modrinth.com/v2/project/${projectId}/version`)
      if (Array.isArray(vs) && vs.length > 0) compatible = vs[0]
    } catch {}
  }

  if (!compatible?.files?.[0]) { log.warn('install-plugin: no compatible version found', { serverId, projectId, serverVersion: server.version }); return { ok: false, error: 'Versão compatível não encontrada' } }
  const file = compatible.files.find(f => f.primary) || compatible.files[0]
  safeSend(event.sender, 'create-progress', { id: serverId, msg: `Instalando ${projectTitle}...` })
  const safeFilename = path.basename(String(file.filename || `${projectTitle}.jar`)).replace(/[^a-zA-Z0-9._-]/g, '_')
  await downloadFile(file.url, path.join(server.dir, 'plugins', safeFilename))
  log.info('Plugin installed', { serverId, projectId, projectTitle, filename: safeFilename })
  return { ok: true, filename: safeFilename }
})

ipcMain.handle('get-installed-plugins', (_, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return []
  const dir = path.join(server.dir, 'plugins')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith('.jar'))
})

ipcMain.handle('remove-plugin', (_, { serverId, filename }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) { log.warn('remove-plugin: server not found', { serverId }); return { ok: false } }
  const safeFilename = path.basename(String(filename || ''))
  if (!safeFilename || !safeFilename.endsWith('.jar')) { log.warn('remove-plugin: invalid filename', { serverId, filename }); return { ok: false, error: 'Invalid filename' } }
  const pluginsDir = path.join(server.dir, 'plugins')
  const f = path.join(pluginsDir, safeFilename)
  if (!f.startsWith(pluginsDir + path.sep) && f !== pluginsDir) { log.error('remove-plugin: path traversal attempt', { serverId, filename }); return { ok: false, error: 'Invalid path' } }
  if (fs.existsSync(f)) fs.unlinkSync(f)
  log.info('Plugin removed', { serverId, filename: safeFilename })
  return { ok: true }
})

// ── playit.gg — plugin approach ───────────────────────────────────────────────
// Downloads the playit.gg Minecraft PLUGIN (jar) into plugins/.
// No separate binary/agent needed — the plugin handles the tunnel inside the server JVM.
ipcMain.handle('install-playit-plugin', async (event, { serverId }) => {
  try {
    const servers = readServers()
    const server = servers.find(s => s.id === serverId)
    if (!server) return { ok: false, error: 'Servidor não encontrado' }

    // Check if any playit JAR already exists
    const pluginsDir = path.join(server.dir, 'plugins')
    const alreadyHasPlayit = fs.existsSync(pluginsDir) && fs.readdirSync(pluginsDir).some(f => f.toLowerCase().startsWith('playit'))
    if (alreadyHasPlayit) return { ok: true, alreadyInstalled: true }

    safeSend(event.sender, 'server-log', { id: serverId, text: '── Baixando plugin PlayIt.gg... ──' })
    // Resolve via Modrinth for the correct JAR filename (fallback to direct GitHub URL)
    const playitDef = { name: 'PlayIt.gg', modrinthSlug: 'playit', url: 'https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft.jar', filename: 'playit-minecraft.jar' }
    const { url: resolvedUrl, filename: resolvedFilename } = await resolvePluginUrl(playitDef, server.version || '1.21.4')
    await downloadFile(resolvedUrl, path.join(server.dir, 'plugins', resolvedFilename))
    safeSend(event.sender, 'server-log', { id: serverId, text: '── Plugin PlayIt.gg instalado! Reinicie o servidor e use /playit ──' })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('check-playit-plugin', (_, { serverId }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { installed: false }
  const pluginsDir = path.join(server.dir, 'plugins')
  if (!fs.existsSync(pluginsDir)) return { installed: false }
  const installed = fs.readdirSync(pluginsDir).some(f => f.toLowerCase().startsWith('playit'))
  return { installed }
})

// ── Auto-update ───────────────────────────────────────────────────────────────
async function fetchLatestVersion(type) {
  if (type === 'paper' || type === 'hybrid') {
    const d = await fetchJson('https://api.papermc.io/v2/projects/paper')
    return d.versions[d.versions.length - 1]
  }
  if (type === 'purpur') {
    const d = await fetchJson('https://api.purpurmc.org/v2/purpur')
    return d.versions[d.versions.length - 1]
  }
  if (type === 'vanilla') {
    const d = await fetchJson('https://launchermeta.mojang.com/mc/game/version_manifest.json')
    const rel = d.versions.find(v => v.type === 'release')
    return rel ? rel.id : null
  }
  if (type === 'fabric') {
    const d = await fetchJson('https://meta.fabricmc.net/v2/versions/game')
    const stable = d.find(v => v.stable)
    return stable ? stable.version : null
  }
  return null
}

ipcMain.handle('check-update', async (_, arg) => {
  const serverId = typeof arg === 'string' ? arg : arg?.serverId
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server || server.type === 'bedrock') return { hasUpdate: false }
  try {
    const latest = await fetchLatestVersion(server.type)
    return latest && latest !== server.version
      ? { hasUpdate: true, currentVersion: server.version, latestVersion: latest }
      : { hasUpdate: false }
  } catch { return { hasUpdate: false } }
})

ipcMain.handle('update-server', async (event, arg) => {
  const serverId = typeof arg === 'string' ? arg : arg?.serverId
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) { log.warn('update-server: server not found', { serverId }); return { ok: false } }
  const send = msg => safeSend(event.sender, 'create-progress', { id: serverId, msg })
  log.info('Server update started', { serverId, name: server.name, currentVersion: server.version, type: server.type })
  try {
    const latest = await fetchLatestVersion(server.type)
    if (!latest) { log.warn('update-server: latest version not found', { serverId, type: server.type }); return { ok: false, error: 'Versão mais recente não encontrada' } }
    send(`Baixando ${server.type} ${latest}...`)
    const jarPath = path.join(server.dir, 'server.jar')
    if (fs.existsSync(jarPath)) fs.renameSync(jarPath, jarPath + '.bak')
    const url = await getJarUrl(server.type, latest)
    await downloadFile(url, jarPath, pct => send(`Download: ${pct}%`))
    const idx = servers.findIndex(s => s.id === serverId)
    servers[idx].version = latest
    writeServers(servers)
    log.info('Server updated', { serverId, oldVersion: server.version, newVersion: latest })
    send(`Atualizado para ${latest}!`)
    return { ok: true, newVersion: latest }
  } catch (e) { log.error('Server update failed', { serverId, message: e.message }); return { ok: false, error: e.message } }
})

// ── Config & misc ─────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => readConfig())
ipcMain.handle('set-config', (_, cfg) => { writeConfig({ ...readConfig(), ...cfg }); return { ok: true } })

// ── PlayIt shared secret management ──────────────────────────────────────────
ipcMain.handle('get-playit-secret', () => {
  return { secret: readConfig().playitSecret || null }
})

ipcMain.handle('set-playit-secret', (_, secret) => {
  const clean = typeof secret === 'string' ? secret.trim() : ''
  writeConfig({ ...readConfig(), playitSecret: clean || undefined })
  return { ok: true }
})

ipcMain.handle('sync-playit-secret', (_, serverId) => {
  // Manually pull the secret from a specific server's playit-gg/config.yml
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { ok: false, error: 'Servidor não encontrado' }
  const cfgFile = path.join(server.dir, 'plugins', 'playit-gg', 'config.yml')
  if (!fs.existsSync(cfgFile)) return { ok: false, error: 'Plugin PlayIt não configurado neste servidor ainda.' }
  try {
    const text = fs.readFileSync(cfgFile, 'utf8')
    const m = text.match(/agent-secret:\s*"?([a-zA-Z0-9_\-]{20,})"?/)
    if (!m) return { ok: false, error: 'Nenhum agent-secret encontrado no config do PlayIt.' }
    const secret = m[1].trim()
    writeConfig({ ...readConfig(), playitSecret: secret })
    return { ok: true, secret }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('get-system-ram', () => {
  // Return total system RAM and free RAM in MB
  const totalMb = Math.floor(os.totalmem() / (1024 * 1024))
  const freeMb = Math.floor(os.freemem() / (1024 * 1024))
  return { totalMb, freeMb }
})

ipcMain.handle('get-log-path', () => log.getLogPath())
ipcMain.handle('get-log-dir', () => log.getLogDir())
ipcMain.handle('get-recent-logs', (_, n) => log.getRecentLogs(n))
ipcMain.handle('list-log-files', () => log.listLogFiles())
ipcMain.handle('log-error', (_, { msg, data }) => { log.error('[UI] ' + msg, data); return { ok: true } })
ipcMain.handle('log-info',  (_, { msg, data }) => { log.info('[UI] ' + msg, data); return { ok: true } })
ipcMain.handle('open-server-folder', (_, serverId) => {
  const s = readServers().find(s => s.id === serverId)
  if (s) shell.openPath(s.dir)
})

// ── Window ────────────────────────────────────────────────────────────────────
let mainWindow = null

ipcMain.handle('window-control', (_, action) => {
  if (!mainWindow) return
  if (action === 'minimize') mainWindow.minimize()
  else if (action === 'maximize') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  else if (action === 'close') mainWindow.close()
})
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)
ipcMain.handle('get-platform', () => process.platform)

function createWindow() {
  const isMac = process.platform === 'darwin'
  mainWindow = new BrowserWindow({
    width: 1200, height: 780, minWidth: 900, minHeight: 620,
    // hiddenInset is macOS-only — on Windows use 'hidden' so the drag-region CSS handles dragging
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#100f0c',
    show: false, // prevent black flash while renderer loads
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  // Show only when the page is fully ready — eliminates black/white flash on Windows
  mainWindow.once('ready-to-show', () => mainWindow.show())
  if (isDev) { mainWindow.loadURL('http://localhost:5173'); mainWindow.webContents.openDevTools() }
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  const servers = readServers()
  log.info('App ready', { version: app.getVersion(), servers: servers.length, isDev })
  createWindow()
  if (!isDev && autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify().catch(e => log.warn('Auto-updater check failed', { message: e.message }))
  }
})
app.on('before-quit', () => {
  app.isQuitting = true
  const running = Object.keys(serverProcesses).filter(k => serverProcesses[k] !== 'starting')
  log.info('App quitting', { runningServers: running })
})

app.on('window-all-closed', async () => {
  app.isQuitting = true
  const stopPromises = Object.entries(serverProcesses).map(([, proc]) =>
    new Promise(resolve => {
      try {
        if (proc.stdin.writable) proc.stdin.write('save-all\n')
        setTimeout(() => {
          try { if (proc.stdin.writable) proc.stdin.write('stop\n') } catch {}
          setTimeout(() => { try { proc.kill('SIGKILL') } catch {} resolve() }, 8000)
        }, 1500)
        proc.once('close', resolve)
      } catch { resolve() }
    })
  )
  Object.values(playitProcesses).forEach(p => { try { p.kill() } catch {} })
  await Promise.race([
    Promise.all(stopPromises),
    new Promise(r => setTimeout(r, 12000)),
  ])
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
