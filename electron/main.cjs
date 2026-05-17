const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawn, execFile } = require('child_process')
const https = require('https')
const http = require('http')

const isDev = !app.isPackaged

// ── Paths ────────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(os.homedir(), 'CraftNest')
const SERVERS_DIR = path.join(DATA_DIR, 'servers')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const PLAYIT_BIN = path.join(DATA_DIR, 'playit' + (process.platform === 'win32' ? '.exe' : ''))

;[DATA_DIR, SERVERS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })

// ── Running processes ─────────────────────────────────────────────────────────
const serverProcesses = {}   // serverId → ChildProcess
const playitProcesses = {}   // serverId → ChildProcess

// ── Config ────────────────────────────────────────────────────────────────────
function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) } catch { return {} }
}
function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2))
}

// ── Servers DB ────────────────────────────────────────────────────────────────
function readServers() {
  const file = path.join(DATA_DIR, 'servers.json')
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return [] }
}
function writeServers(servers) {
  fs.writeFileSync(path.join(DATA_DIR, 'servers.json'), JSON.stringify(servers, null, 2))
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, { headers: { 'User-Agent': 'CraftNest/0.1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
      })
    }).on('error', reject)
  })
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const doDownload = (u) => {
      const mod = u.startsWith('https') ? https : http
      mod.get(u, { headers: { 'User-Agent': 'CraftNest/0.1.0' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doDownload(res.headers.location)
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
      }).on('error', reject)
    }
    doDownload(url)
  })
}

// ── IPC: Server list ──────────────────────────────────────────────────────────
ipcMain.handle('get-servers', () => readServers())

ipcMain.handle('delete-server', (_, id) => {
  const servers = readServers().filter(s => s.id !== id)
  writeServers(servers)
  const dir = path.join(SERVERS_DIR, id)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  return { ok: true }
})

// ── IPC: Fetch available versions ─────────────────────────────────────────────
ipcMain.handle('get-versions', async (_, type) => {
  try {
    if (type === 'paper') {
      const data = await fetchJson('https://api.papermc.io/v2/projects/paper')
      return data.versions.reverse()
    }
    if (type === 'purpur') {
      const data = await fetchJson('https://api.purpurmc.org/v2/purpur')
      return data.versions.reverse()
    }
    if (type === 'fabric') {
      const data = await fetchJson('https://meta.fabricmc.net/v2/versions/game')
      return data.filter(v => v.stable).map(v => v.version)
    }
    // vanilla
    const data = await fetchJson('https://launchermeta.mojang.com/mc/game/version_manifest.json')
    return data.versions.filter(v => v.type === 'release').map(v => v.id)
  } catch (e) {
    return []
  }
})

// ── IPC: Create server ────────────────────────────────────────────────────────
ipcMain.handle('create-server', async (event, opts) => {
  const { name, type, version, ram, port, plugins: selectedPlugins } = opts
  const id = Date.now().toString()
  const serverDir = path.join(SERVERS_DIR, id)
  fs.mkdirSync(serverDir, { recursive: true })
  fs.mkdirSync(path.join(serverDir, 'plugins'), { recursive: true })

  const send = (msg) => event.sender.send('create-progress', { id, msg })

  try {
    send(`Baixando ${type} ${version}...`)
    const jarPath = path.join(serverDir, 'server.jar')
    const jarUrl = await getJarUrl(type, version, send)
    await downloadFile(jarUrl, jarPath, pct => send(`Download: ${pct}%`))

    send('Configurando servidor...')
    fs.writeFileSync(path.join(serverDir, 'eula.txt'), 'eula=true\n')
    fs.writeFileSync(path.join(serverDir, 'server.properties'), buildServerProperties(port, name))

    if (selectedPlugins && selectedPlugins.length > 0) {
      send('Instalando plugins padrão...')
      for (const plugin of selectedPlugins) {
        send(`Instalando ${plugin.name}...`)
        try {
          await downloadFile(plugin.url, path.join(serverDir, 'plugins', plugin.filename))
        } catch {
          send(`Aviso: falha ao instalar ${plugin.name}`)
        }
      }
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

async function getJarUrl(type, version, send) {
  if (type === 'paper') {
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
    const versionData = await fetchJson(entry.url)
    return versionData.downloads.server.url
  }
  if (type === 'fabric') {
    const loaders = await fetchJson(`https://meta.fabricmc.net/v2/versions/loader/${version}`)
    const loaderVersion = loaders[0].loader.version
    const installer = await fetchJson('https://meta.fabricmc.net/v2/versions/installer')
    const installerVersion = installer[0].version
    return `https://meta.fabricmc.net/v2/versions/loader/${version}/${loaderVersion}/${installerVersion}/server/jar`
  }
  throw new Error(`Tipo desconhecido: ${type}`)
}

function buildServerProperties(port, name) {
  return [
    `server-port=${port}`,
    `motd=${name} - Powered by CraftNest`,
    'online-mode=true',
    'max-players=20',
    'view-distance=10',
    'simulation-distance=10',
    'difficulty=normal',
    'gamemode=survival',
    'allow-flight=false',
    'spawn-protection=16',
    'enable-query=false',
  ].join('\n') + '\n'
}

// ── IPC: Start / Stop server ──────────────────────────────────────────────────
ipcMain.handle('start-server', async (event, id) => {
  if (serverProcesses[id]) return { ok: false, error: 'Servidor já está rodando' }

  const servers = readServers()
  const server = servers.find(s => s.id === id)
  if (!server) return { ok: false, error: 'Servidor não encontrado' }

  const javaCmd = await findJava()
  if (!javaCmd) return { ok: false, error: 'Java não encontrado. Instale o Java 17+ e tente novamente.' }

  const ramArg = `${server.ram}M`
  const proc = spawn(javaCmd, [`-Xmx${ramArg}`, `-Xms${ramArg}`, '-jar', 'server.jar', 'nogui'], {
    cwd: server.dir,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  serverProcesses[id] = proc

  proc.stdout.on('data', data => {
    event.sender.send('server-log', { id, line: data.toString() })
  })
  proc.stderr.on('data', data => {
    event.sender.send('server-log', { id, line: data.toString() })
  })
  proc.on('close', code => {
    delete serverProcesses[id]
    event.sender.send('server-stopped', { id, code })
  })

  return { ok: true }
})

ipcMain.handle('stop-server', async (_, id) => {
  const proc = serverProcesses[id]
  if (!proc) return { ok: false, error: 'Servidor não está rodando' }
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

async function findJava() {
  const candidates = [
    'java',
    '/usr/bin/java',
    '/usr/local/bin/java',
    process.platform === 'win32' ? 'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe' : null,
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
  ].filter(Boolean)

  for (const cmd of candidates) {
    try {
      await new Promise((res, rej) => execFile(cmd, ['-version'], err => err ? rej() : res()))
      return cmd
    } catch {}
  }
  return null
}

// ── IPC: Plugin browser (Modrinth) ────────────────────────────────────────────
ipcMain.handle('search-plugins', async (_, { query, loader }) => {
  const facets = loader === 'fabric'
    ? `[["categories:fabric"],["project_type:mod"]]`
    : `[["categories:paper"],["project_type:plugin"]]`
  const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}&limit=20`
  const data = await fetchJson(url)
  return data.hits || []
})

ipcMain.handle('install-plugin', async (event, { serverId, projectId, projectTitle }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { ok: false, error: 'Servidor não encontrado' }

  const versions = await fetchJson(`https://api.modrinth.com/v2/project/${projectId}/version`)
  const compatible = versions.find(v =>
    v.loaders.includes(server.type === 'fabric' ? 'fabric' : 'paper') ||
    v.loaders.includes('bukkit') ||
    v.loaders.includes('spigot')
  )
  if (!compatible || !compatible.files?.[0]) return { ok: false, error: 'Versão compatível não encontrada' }

  const file = compatible.files[0]
  const dest = path.join(server.dir, 'plugins', file.filename)
  event.sender.send('create-progress', { id: serverId, msg: `Instalando ${projectTitle}...` })
  await downloadFile(file.url, dest)
  return { ok: true, filename: file.filename }
})

ipcMain.handle('get-installed-plugins', (_, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return []
  const pluginsDir = path.join(server.dir, 'plugins')
  if (!fs.existsSync(pluginsDir)) return []
  return fs.readdirSync(pluginsDir).filter(f => f.endsWith('.jar'))
})

ipcMain.handle('remove-plugin', (_, { serverId, filename }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { ok: false }
  const filePath = path.join(server.dir, 'plugins', filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  return { ok: true }
})

// ── IPC: playit.gg ────────────────────────────────────────────────────────────
ipcMain.handle('toggle-playit', async (event, { serverId, enable }) => {
  if (!enable) {
    const proc = playitProcesses[serverId]
    if (proc) { proc.kill(); delete playitProcesses[serverId] }
    return { ok: true }
  }

  if (!fs.existsSync(PLAYIT_BIN)) {
    event.sender.send('create-progress', { id: serverId, msg: 'Baixando playit.gg...' })
    const platform = process.platform
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64'
    let playitUrl
    if (platform === 'darwin') {
      playitUrl = `https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-darwin-${arch}`
    } else if (platform === 'win32') {
      playitUrl = `https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-windows-${arch}.exe`
    } else {
      playitUrl = `https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-${arch}`
    }
    await downloadFile(playitUrl, PLAYIT_BIN)
    if (platform !== 'win32') fs.chmodSync(PLAYIT_BIN, 0o755)
  }

  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { ok: false }

  const proc = spawn(PLAYIT_BIN, [], { cwd: server.dir, stdio: ['ignore', 'pipe', 'pipe'] })
  playitProcesses[serverId] = proc

  proc.stdout.on('data', data => {
    const text = data.toString()
    const match = text.match(/address[:\s]+([^\s]+:\d+)/i) || text.match(/([\w.-]+\.playit\.gg[:\d]*)/i)
    if (match) event.sender.send('playit-address', { serverId, address: match[1] })
    event.sender.send('playit-log', { serverId, line: text })
  })
  proc.stderr.on('data', data => {
    event.sender.send('playit-log', { serverId, line: data.toString() })
  })
  proc.on('close', () => {
    delete playitProcesses[serverId]
    event.sender.send('playit-stopped', { serverId })
  })

  // Update server record
  const idx = servers.findIndex(s => s.id === serverId)
  if (idx !== -1) { servers[idx].playit = true; writeServers(servers) }

  return { ok: true }
})

// ── IPC: Auto-update check ────────────────────────────────────────────────────
ipcMain.handle('check-update', async (_, { serverId }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server || server.type === 'vanilla' || server.type === 'fabric') return { hasUpdate: false }

  try {
    let latestVersion
    if (server.type === 'paper') {
      const data = await fetchJson('https://api.papermc.io/v2/projects/paper')
      latestVersion = data.versions[data.versions.length - 1]
    } else if (server.type === 'purpur') {
      const data = await fetchJson('https://api.purpurmc.org/v2/purpur')
      latestVersion = data.versions[data.versions.length - 1]
    }
    if (latestVersion && latestVersion !== server.version) {
      return { hasUpdate: true, currentVersion: server.version, latestVersion }
    }
    return { hasUpdate: false }
  } catch {
    return { hasUpdate: false }
  }
})

ipcMain.handle('update-server', async (event, { serverId }) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (!server) return { ok: false }

  const send = msg => event.sender.send('create-progress', { id: serverId, msg })
  try {
    let latestVersion
    if (server.type === 'paper') {
      const data = await fetchJson('https://api.papermc.io/v2/projects/paper')
      latestVersion = data.versions[data.versions.length - 1]
    } else if (server.type === 'purpur') {
      const data = await fetchJson('https://api.purpurmc.org/v2/purpur')
      latestVersion = data.versions[data.versions.length - 1]
    }
    if (!latestVersion) return { ok: false, error: 'Versão mais recente não encontrada' }

    send(`Baixando ${server.type} ${latestVersion}...`)
    const jarPath = path.join(server.dir, 'server.jar')
    const bakPath = path.join(server.dir, 'server.jar.bak')
    if (fs.existsSync(jarPath)) fs.renameSync(jarPath, bakPath)

    const jarUrl = await getJarUrl(server.type, latestVersion, send)
    await downloadFile(jarUrl, jarPath, pct => send(`Download: ${pct}%`))

    const idx = servers.findIndex(s => s.id === serverId)
    servers[idx].version = latestVersion
    writeServers(servers)

    send(`Atualizado para ${latestVersion}!`)
    return { ok: true, newVersion: latestVersion }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ── IPC: Config ───────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => readConfig())
ipcMain.handle('set-config', (_, cfg) => { writeConfig({ ...readConfig(), ...cfg }); return { ok: true } })

// ── IPC: Open folder ──────────────────────────────────────────────────────────
ipcMain.handle('open-server-folder', (_, serverId) => {
  const servers = readServers()
  const server = servers.find(s => s.id === serverId)
  if (server) shell.openPath(server.dir)
})

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  Object.values(serverProcesses).forEach(p => p.kill())
  Object.values(playitProcesses).forEach(p => p.kill())
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
