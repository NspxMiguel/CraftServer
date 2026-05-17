export type ServerType = 'paper' | 'purpur' | 'vanilla' | 'fabric'

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
}

export interface PresetPlugin {
  name: string
  description: string
  url: string
  filename: string
  enabled: boolean
}

export interface CreateServerOpts {
  name: string
  type: ServerType
  version: string
  ram: number
  port: number
  plugins: { name: string; url: string; filename: string }[]
}
