const { contextBridge, ipcRenderer } = require('electron')

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

  on: (channel, cb) => {
    const allowed = ['server-log', 'server-stopped', 'create-progress']
    if (allowed.includes(channel)) ipcRenderer.on(channel, (_e, d) => cb(d))
  },
  off: (channel, cb) => ipcRenderer.removeListener(channel, cb),
})
