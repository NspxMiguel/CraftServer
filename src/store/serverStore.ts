import { create } from 'zustand'
import type { Server } from '../types'

interface ServerState {
  servers: Server[]
  runningIds: Set<string>
  selectedId: string | null
  activeTab: 'console' | 'plugins' | 'settings' | 'whitelist' | 'logs' | 'backups'
  customRam?: number
  maxRam?: number
  playerCounts: Record<string, number>
  setServers: (s: Server[]) => void
  setRunning: (ids: string[]) => void
  setSelected: (id: string | null) => void
  setActiveTab: (tab: 'console' | 'plugins' | 'settings' | 'whitelist' | 'logs' | 'backups') => void
  setCustomRam: (ram: number) => void
  setMaxRam: (ram: number) => void
  markRunning: (id: string) => void
  markStopped: (id: string) => void
  updateServer: (id: string, patch: Partial<Server>) => void
  removeServer: (id: string) => void
  setPlayerCount: (id: string, count: number) => void
}

export const useServerStore = create<ServerState>((set) => ({
  servers: [],
  runningIds: new Set(),
  selectedId: null,
  activeTab: 'console',
  playerCounts: {},

  setServers: (servers) => set({ servers }),
  setRunning: (ids) => set({ runningIds: new Set(ids) }),
  setSelected: (id) => set({ selectedId: id, activeTab: 'console' }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCustomRam: (ram) => set({ customRam: ram }),
  setMaxRam: (ram) => set({ maxRam: ram }),

  markRunning: (id) => set(s => ({ runningIds: new Set([...s.runningIds, id]) })),
  markStopped: (id) => set(s => {
    const next = new Set(s.runningIds)
    next.delete(id)
    const counts = { ...s.playerCounts }
    delete counts[id]
    return { runningIds: next, playerCounts: counts }
  }),

  setPlayerCount: (id, count) => set(s => ({
    playerCounts: { ...s.playerCounts, [id]: count },
  })),

  updateServer: (id, patch) => set(s => ({
    servers: s.servers.map(sv => sv.id === id ? { ...sv, ...patch } : sv),
  })),

  removeServer: (id) => set(s => ({
    servers: s.servers.filter(sv => sv.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
}))
