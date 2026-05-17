export {}

declare global {
  interface Window {
    electron: {
      getServers: () => Promise<import('./types').Server[]>
      deleteServer: (id: string) => Promise<{ ok: boolean }>
      createServer: (opts: import('./types').CreateServerOpts & { offlineMode?: boolean }) => Promise<{ ok: boolean; server: import('./types').Server; error?: string }>
      startServer: (id: string) => Promise<{ ok: boolean; error?: string }>
      stopServer: (id: string) => Promise<{ ok: boolean }>
      sendCommand: (id: string, command: string) => Promise<{ ok: boolean }>
      getRunningServers: () => Promise<string[]>
      openServerFolder: (id: string) => Promise<void>
      getVersions: (type: string) => Promise<string[]>

      getServerProperties: (id: string) => Promise<Record<string, string | number | boolean> | null>
      setServerProperties: (id: string, props: Record<string, string | number | boolean>) => Promise<{ ok: boolean }>

      getWhitelist: (id: string) => Promise<import('./types').WhitelistEntry[]>
      addWhitelist: (id: string, username: string) => Promise<{ ok: boolean; entry?: import('./types').WhitelistEntry; error?: string }>
      removeWhitelist: (id: string, name: string) => Promise<{ ok: boolean }>

      searchPlugins: (query: string, loader: string) => Promise<import('./types').Plugin[]>
      installPlugin: (sid: string, pid: string, title: string) => Promise<{ ok: boolean; filename?: string; error?: string }>
      getInstalledPlugins: (sid: string) => Promise<string[]>
      removePlugin: (sid: string, filename: string) => Promise<{ ok: boolean }>

      togglePlayit: (sid: string, enable: boolean) => Promise<{ ok: boolean }>
      checkUpdate: (sid: string) => Promise<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string }>
      updateServer: (sid: string) => Promise<{ ok: boolean; newVersion?: string; error?: string }>

      getConfig: () => Promise<Record<string, string>>
      setConfig: (cfg: Record<string, string>) => Promise<{ ok: boolean }>

      checkDependencies: () => Promise<{ java: { ok: boolean; version: string | null; cmd: string | null } }>
      openExternal: (url: string) => Promise<void>

      on: (channel: string, cb: (data: any) => void) => void
      off: (channel: string, cb: (data: any) => void) => void
    }
  }
}
