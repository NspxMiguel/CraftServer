const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Servers
  getServers: () => ipcRenderer.invoke('get-servers'),
  deleteServer: (id) => ipcRenderer.invoke('delete-server', id),
  createServer: (opts) => ipcRenderer.invoke('create-server', opts),
  startServer: (id) => ipcRenderer.invoke('start-server', id),
  stopServer: (id) => ipcRenderer.invoke('stop-server', id),
  sendCommand: (id, command) => ipcRenderer.invoke('send-command', { id, command }),
  getRunningServers: () => ipcRenderer.invoke('get-running-servers'),
  openServerFolder: (id) => ipcRenderer.invoke('open-server-folder', id),

  // Versions
  getVersions: (type) => ipcRenderer.invoke('get-versions', type),

  // Plugins
  searchPlugins: (query, loader) => ipcRenderer.invoke('search-plugins', { query, loader }),
  installPlugin: (serverId, projectId, projectTitle) =>
    ipcRenderer.invoke('install-plugin', { serverId, projectId, projectTitle }),
  getInstalledPlugins: (serverId) => ipcRenderer.invoke('get-installed-plugins', serverId),
  removePlugin: (serverId, filename) => ipcRenderer.invoke('remove-plugin', { serverId, filename }),

  // playit.gg
  togglePlayit: (serverId, enable) => ipcRenderer.invoke('toggle-playit', { serverId, enable }),

  // Updates
  checkUpdate: (serverId) => ipcRenderer.invoke('check-update', { serverId }),
  updateServer: (serverId) => ipcRenderer.invoke('update-server', { serverId }),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (cfg) => ipcRenderer.invoke('set-config', cfg),

  // Events
  on: (channel, cb) => {
    const allowed = ['server-log', 'server-stopped', 'create-progress', 'playit-address', 'playit-log', 'playit-stopped']
    if (allowed.includes(channel)) ipcRenderer.on(channel, (_event, data) => cb(data))
  },
  off: (channel, cb) => ipcRenderer.removeListener(channel, cb),
})
