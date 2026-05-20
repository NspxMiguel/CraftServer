const { contextBridge, ipcRenderer } = require('electron')

// Track wrappers so that off() can remove the correct function reference
const _wrappers = new Map()

contextBridge.exposeInMainWorld('electron', {
  getServers: () => ipcRenderer.invoke('get-servers'),
  deleteServer: (id) => ipcRenderer.invoke('delete-server', id),
  createServer: (opts) => ipcRenderer.invoke('create-server', opts),
  startServer: (id) => ipcRenderer.invoke('start-server', id),
  stopServer: (id) => ipcRenderer.invoke('stop-server', id),
  sendCommand: (id, command) => ipcRenderer.invoke('send-command', { id, command }),
  getRunningServers: () => ipcRenderer.invoke('get-running-servers'),
  openServerFolder: (id) => ipcRenderer.invoke('open-server-folder', id),
  getVersions: (type) => ipcRenderer.invoke('get-versions', type),

  // server.properties
  getServerProperties: (id) => ipcRenderer.invoke('get-server-properties', id),
  setServerProperties: (id, props) => ipcRenderer.invoke('set-server-properties', { serverId: id, props }),
  getServerRam: (id) => ipcRenderer.invoke('get-server-ram', id),
  setServerRam: (id, ram) => ipcRenderer.invoke('set-server-ram', { serverId: id, ram }),

  // Whitelist
  getWhitelist: (id) => ipcRenderer.invoke('get-whitelist', id),
  addWhitelist: (id, username) => ipcRenderer.invoke('add-whitelist', { serverId: id, username }),
  removeWhitelist: (id, name) => ipcRenderer.invoke('remove-whitelist', { serverId: id, name }),

  // Plugins
  searchPlugins: (query, loader, gameVersion) => ipcRenderer.invoke('search-plugins', { query, loader, gameVersion }),
  searchHangar: (query) => ipcRenderer.invoke('search-hangar', { query }),
  installPlugin: (sid, pid, title) => ipcRenderer.invoke('install-plugin', { serverId: sid, projectId: pid, projectTitle: title }),
  getInstalledPlugins: (sid) => ipcRenderer.invoke('get-installed-plugins', sid),
  removePlugin: (sid, filename) => ipcRenderer.invoke('remove-plugin', { serverId: sid, filename }),

  // playit.gg plugin
  installPlayitPlugin: (sid) => ipcRenderer.invoke('install-playit-plugin', { serverId: sid }),
  checkPlayitPlugin: (sid) => ipcRenderer.invoke('check-playit-plugin', { serverId: sid }),

  // Updates
  checkUpdate: (sid) => ipcRenderer.invoke('check-update', sid),
  updateServer: (sid) => ipcRenderer.invoke('update-server', sid),

  // Backups
  getBackupConfig: () => ipcRenderer.invoke('get-backup-config'),
  setBackupDir: (dir) => ipcRenderer.invoke('set-backup-dir', dir),
  chooseBackupDir: () => ipcRenderer.invoke('choose-backup-dir'),
  listServerBackups: (sid) => ipcRenderer.invoke('list-server-backups', sid),
  createServerBackup: (sid) => ipcRenderer.invoke('create-server-backup', sid),
  revealBackup: (backupPath) => ipcRenderer.invoke('reveal-backup', backupPath),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (cfg) => ipcRenderer.invoke('set-config', cfg),

  // Dependencies & system
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getSystemRam: () => ipcRenderer.invoke('get-system-ram'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  // Log APIs
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  getRecentLogs: (n) => ipcRenderer.invoke('get-recent-logs', n),
  logError: (msg, data) => ipcRenderer.invoke('log-error', { msg, data }),

  on: (channel, cb) => {
    const allowed = ['server-log', 'server-stopped', 'create-progress']
    if (!allowed.includes(channel)) return
    // Wrap to strip the event argument, then store wrapper so off() can remove it
    const wrapper = (_e, d) => cb(d)
    if (!_wrappers.has(cb)) _wrappers.set(cb, new Map())
    _wrappers.get(cb).set(channel, wrapper)
    ipcRenderer.on(channel, wrapper)
  },
  off: (channel, cb) => {
    const channelMap = _wrappers.get(cb)
    if (!channelMap) return
    const wrapper = channelMap.get(channel)
    if (wrapper) {
      ipcRenderer.removeListener(channel, wrapper)
      channelMap.delete(channel)
    }
  },
})
