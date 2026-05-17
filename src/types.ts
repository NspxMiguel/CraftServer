export type ServerType = 'paper' | 'purpur' | 'vanilla' | 'fabric' | 'bedrock' | 'hybrid'

export interface Server {
  id: string
  name: string
  type: ServerType
  version: string
  ram: number
  port: number
  dir: string
  createdAt: number
  playit: boolean
}

export interface Plugin {
  slug: string
  title: string
  description: string
  icon_url: string | null
  downloads: number
  categories: string[]
  project_id: string
  source?: 'modrinth' | 'hangar'
}

export interface PresetPlugin {
  name: string
  description: string
  url: string
  filename: string
  enabled: boolean
  category: 'auth' | 'core' | 'compat' | 'protection' | 'perf' | 'map' | 'social' | 'qol' | 'rpg'
  modrinthSlug?: string
  silent?: boolean      // always installed, never shown in wizard
  offlineOnly?: boolean // only shown/installed when offline mode is active
}

export interface CreateServerOpts {
  name: string
  type: ServerType
  version: string
  ram: number
  port: number
  plugins: { name: string; url: string; filename: string }[]
  chunkyRadius?: number | null
}

export interface WhitelistEntry {
  uuid: string
  name: string
}
