import { create } from 'zustand'
import type { Server } from '../types'

interface ServerState {
  servers: Server[]
  runningIds: Set<string>
  selectedId: string | null
  setServers: (s: Server[]) => void
  setRunning: (ids: string[]) => void
  setSelected: (id: string | null) => void
  markRunning: (id: string) => void
  markStopped: (id: string) => void
  updateServer: (id: string, patch: Partial<Server>) => void
  removeServer: (id: string) => void
}

export const useServerStore = create<ServerState>((set) => ({
  servers: [],
  runningIds: new Set(),
  selectedId: null,

  setServers: (servers) => set({ servers }),
  setRunning: (ids) => set({ runningIds: new Set(ids) }),
  setSelected: (id) => set({ selectedId: id }),

  markRunning: (id) => set(s => ({ runningIds: new Set([...s.runningIds, id]) })),
  markStopped: (id) => set(s => {
    const next = new Set(s.runningIds)
    next.delete(id)
    return { runningIds: next }
  }),

  updateServer: (id, patch) => set(s => ({
    servers: s.servers.map(sv => sv.id === id ? { ...sv, ...patch } : sv),
  })),

  removeServer: (id) => set(s => ({
    servers: s.servers.filter(sv => sv.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),
}))
