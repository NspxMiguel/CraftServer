const { app, BrowserWindow, ipcMain, shell } = require('electron')
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
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
// playit.gg binary path (kept for legacy cleanup; new approach uses the Minecraft plugin JAR)
const PLAYIT_BIN = path.join(DATA_DIR, 'playit' + (process.platform === 'win32' ? '.exe' : ''))

;[DATA_DIR, SERVERS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })

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
function writeConfig(cfg) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)) }

function readServers() {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'servers.json'), 'utf8')) } catch { return [] }
}
function writeServers(s) { fs.writeFileSync(path.join(DATA_DIR, 'servers.json'), JSON.stringify(s, null, 2)) }

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, { headers: { 'User-Agent': 'CraftServer/0.1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchJson(res.headers.location).then(resolve).catch(reject)
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) } })
    }).on('error', reject)
  })
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, { headers: { 'User-Agent': 'CraftServer/0.1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchText(res.headers.location).then(resolve).catch(reject)
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => resolve(data))
    }).on('error', reject)
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
      mod.get(u, { headers: { 'User-Agent': 'CraftServer/0.1.0' } }, res => {
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
    lines.push(`${k}=${v}`)
  }
  return lines.join('\n') + '\n'
}

ipcMain.handle('get-server-properties', (_, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return null
  const file = path.join(server.dir, 'server.properties')
  if (!fs.existsSync(file)) return null
  return parseServerProperties(fs.readFileSync(file, 'utf8'))
})

ipcMain.handle('set-server-properties', (_, { serverId, props }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { ok: false }
  const file = path.join(server.dir, 'server.properties')
  const existing = fs.existsSync(file) ? parseServerProperties(fs.readFileSync(file, 'utf8')) : {}
  const merged = { ...existing, ...props }
  fs.writeFileSync(file, stringifyServerProperties(merged))
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
  if (!server) return { ok: false, error: 'Servidor não encontrado' }

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
  return { ok: true, entry: { uuid, name: username } }
})

ipcMain.handle('remove-whitelist', (_, { serverId, name }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { ok: false }
  const file = path.join(server.dir, 'whitelist.json')
  try {
    const list = JSON.parse(fs.readFileSync(file, 'utf8')).filter(e => e.name !== name)
    fs.writeFileSync(file, JSON.stringify(list, null, 2))
    return { ok: true }
  } catch { return { ok: false } }
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
  const id = Date.now().toString()
  const serverDir = path.join(SERVERS_DIR, id)
  fs.mkdirSync(serverDir, { recursive: true })
  fs.mkdirSync(path.join(serverDir, 'plugins'), { recursive: true })

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
      const baseProps = parseServerProperties(buildServerProperties(port, name, offlineMode))
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
          const pluginDest = path.join(serverDir, 'plugins', plFilename || pl.filename)
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

    const server = { id, name, type, version, ram, port, dir: serverDir, createdAt: Date.now(), playit: false }
    const servers = readServers()
    servers.push(server)
    writeServers(servers)

    send('Servidor criado com sucesso!')
    return { ok: true, server }
  } catch (e) {
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
    const vdata = await fetchJson(entry.url)
    return vdata.downloads.server.url
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
  - essentials.tpa=true
  - essentials.tpaccept=true
  - essentials.tpdeny=true
  - essentials.tpahere=true
  - essentials.msg=true
  - essentials.msg.color=true
  - essentials.reply=true
  - essentials.home=true
  - essentials.home.others=true
  - essentials.sethome=true
  - essentials.delhome=true
  - essentials.spawn=true
  - essentials.kit=true
  - essentials.kit.list=true
  - essentials.warp=true
  - essentials.warp.list=true
  - essentials.list=true
  - essentials.info=true
  - essentials.motd=true
  - essentials.rules=true
  - essentials.balance=true
  - essentials.pay=true
  - essentials.seen=true
  - essentials.near=true
  - essentials.afk=true
  - essentials.ignore=true
  - essentials.helpop=true
  - essentials.back=true
  - essentials.back.ondeath=true
  - essentials.signs.use.info=true
  - bukkit.command.help=true
  - bukkit.command.list=true
  - bukkit.command.me=true
  - bukkit.command.say=false
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
  if (serverProcesses[id]) return { ok: false, error: 'Servidor já está rodando' }
  const servers = readServers()
  const server = servers.find(s => s.id === id)
  if (!server) return { ok: false, error: 'Servidor não encontrado' }

  const javaCmd = await findJava()
  if (!javaCmd) return { ok: false, error: 'Java não encontrado. Instale Java 21+ em adoptium.net' }

  const minJava = requiredJavaVersion(server.version)
  const javaVersionStr = await new Promise(res => {
    execFile(javaCmd, ['-version'], (err, stdout, stderr) => {
      const out = (stderr || stdout || '').trim()
      const m = out.match(/version "([^"]+)"/)
      res(m ? m[1] : '0')
    })
  })
  const javaMajor = parseInt(javaVersionStr.split('.')[0]) || 0
  if (javaMajor < minJava) {
    return { ok: false, error: `Minecraft ${server.version} requer Java ${minJava}+. Versão atual: Java ${javaMajor}. Baixe em adoptium.net` }
  }

  const ramArg = `${server.ram}M`
  const proc = spawn(javaCmd, [`-Xmx${ramArg}`, `-Xms${ramArg}`, '-jar', 'server.jar', 'nogui'], {
    cwd: server.dir,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  serverProcesses[id] = proc

  proc.stdout.on('data', d => safeSend(event.sender, 'server-log', { id, text: d.toString() }))
  proc.stderr.on('data', d => safeSend(event.sender, 'server-log', { id, text: d.toString() }))
  proc.on('close', code => {
    delete serverProcesses[id]
    safeSend(event.sender, 'server-stopped', { id, code })
  })
  return { ok: true }
})

ipcMain.handle('stop-server', async (_, id) => {
  const proc = serverProcesses[id]
  if (!proc) return { ok: false }
  proc.stdin.write('stop\n')
  setTimeout(() => { if (serverProcesses[id]) proc.kill() }, 10000)
  return { ok: true }
})

ipcMain.handle('send-command', (_, { id, command }) => {
  const proc = serverProcesses[id]
  if (!proc) return { ok: false }
  proc.stdin.write(command + '\n')
  return { ok: true }
})

ipcMain.handle('get-running-servers', () => Object.keys(serverProcesses))

// ── Dependency check ─────────────────────────────────────────────────────────
ipcMain.handle('check-dependencies', async () => {
  const javaCmd = await findJava()
  let javaVersion = null
  if (javaCmd) {
    javaVersion = await new Promise(res => {
      execFile(javaCmd, ['-version'], (err, stdout, stderr) => {
        const out = (stderr || stdout || '').trim()
        const m = out.match(/version "([^"]+)"/)
        res(m ? m[1] : 'instalado')
      })
    })
  }
  const majorVersion = javaVersion ? parseInt(javaVersion.split('.')[0]) : 0
  const javaOk = javaCmd !== null && majorVersion >= 17
  const java25Ok = javaCmd !== null && majorVersion >= 25
  return {
    java: { ok: javaOk, java25: java25Ok, version: javaVersion, cmd: javaCmd },
  }
})

ipcMain.handle('open-external', (_, url) => shell.openExternal(url))

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
      await new Promise((res, rej) => execFile(cmd, ['-version'], err => err ? rej() : res()))
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
  writeServers(readServers().filter(s => s.id !== id))
  const dir = path.join(SERVERS_DIR, id)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
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
  if (!server) return { ok: false, error: 'Servidor não encontrado' }

  // ── Hangar install ────────────────────────────────────────────────────────
  if (projectId.startsWith('hangar:')) {
    const namespacePart = projectId.slice('hangar:'.length) // "owner/slug"
    const [owner, slug] = namespacePart.split('/')
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

  if (!compatible?.files?.[0]) return { ok: false, error: 'Versão compatível não encontrada' }
  const file = compatible.files.find(f => f.primary) || compatible.files[0]
  safeSend(event.sender, 'create-progress', { id: serverId, msg: `Instalando ${projectTitle}...` })
  await downloadFile(file.url, path.join(server.dir, 'plugins', file.filename))
  return { ok: true, filename: file.filename }
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
  if (!server) return { ok: false }
  const f = path.join(server.dir, 'plugins', filename)
  if (fs.existsSync(f)) fs.unlinkSync(f)
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
  if (!server) return { ok: false }
  const send = msg => safeSend(event.sender, 'create-progress', { id: serverId, msg })
  try {
    const latest = await fetchLatestVersion(server.type)
    if (!latest) return { ok: false, error: 'Versão mais recente não encontrada' }
    send(`Baixando ${server.type} ${latest}...`)
    const jarPath = path.join(server.dir, 'server.jar')
    if (fs.existsSync(jarPath)) fs.renameSync(jarPath, jarPath + '.bak')
    const url = await getJarUrl(server.type, latest)
    await downloadFile(url, jarPath, pct => send(`Download: ${pct}%`))
    const idx = servers.findIndex(s => s.id === serverId)
    servers[idx].version = latest
    writeServers(servers)
    send(`Atualizado para ${latest}!`)
    return { ok: true, newVersion: latest }
  } catch (e) { return { ok: false, error: e.message } }
})

// ── Config & misc ─────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => readConfig())
ipcMain.handle('set-config', (_, cfg) => { writeConfig({ ...readConfig(), ...cfg }); return { ok: true } })

ipcMain.handle('get-system-ram', () => {
  // Return total system RAM in MB
  const totalMb = Math.floor(os.totalmem() / (1024 * 1024))
  return { totalMb }
})

ipcMain.handle('get-log-path', () => log.getLogPath())
ipcMain.handle('get-recent-logs', (_, n) => log.getRecentLogs(n))
ipcMain.handle('log-error', (_, { msg, data }) => { log.error('[UI] ' + msg, data); return { ok: true } })

  const freeMb  = Math.floor(os.freemem()  / 1024 / 1024)
  return { totalMb, freeMb }
})
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
  createWindow()
  if (!isDev && autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }
})
app.on('before-quit', () => { app.isQuitting = true })

app.on('window-all-closed', () => {
  app.isQuitting = true
  Object.values(serverProcesses).forEach(p => { try { p.kill() } catch {} })
  Object.values(playitProcesses).forEach(p => { try { p.kill() } catch {} })
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
