export {}

declare global {
  interface Window {
    electron: {
      getServers: () => Promise<import('./types').Server[]>
      deleteServer: (id: string) => Promise<{ ok: boolean }>
      createServer: (opts: import('./types').CreateServerOpts) => Promise<{ ok: boolean; server: import('./types').Server; error?: string }>
      startServer: (id: string) => Promise<{ ok: boolean; error?: string }>
      stopServer: (id: string) => Promise<{ ok: boolean }>
      sendCommand: (id: string, command: string) => Promise<{ ok: boolean }>
      getRunningServers: () => Promise<string[]>
      openServerFolder: (id: string) => Promise<void>

      getVersions: (type: string) => Promise<string[]>

      searchPlugins: (query: string, loader: string) => Promise<import('./types').Plugin[]>
      installPlugin: (serverId: string, projectId: string, title: string) => Promise<{ ok: boolean; filename?: string; error?: string }>
      getInstalledPlugins: (serverId: string) => Promise<string[]>
      removePlugin: (serverId: string, filename: string) => Promise<{ ok: boolean }>

      togglePlayit: (serverId: string, enable: boolean) => Promise<{ ok: boolean }>
      checkUpdate: (serverId: string) => Promise<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string }>
      updateServer: (serverId: string) => Promise<{ ok: boolean; newVersion?: string; error?: string }>

      getConfig: () => Promise<Record<string, string>>
      setConfig: (cfg: Record<string, string>) => Promise<{ ok: boolean }>

      on: (channel: string, cb: (data: any) => void) => void
      off: (channel: string, cb: (data: any) => void) => void
    }
  }
}
