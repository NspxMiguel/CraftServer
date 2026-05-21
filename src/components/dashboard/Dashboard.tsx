import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Server, Play, Square, FolderOpen, Trash2, Wifi, Puzzle, AlertTriangle, X, ChevronRight } from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'
import { useT } from '../../i18n'
import { isElectron } from '../../utils/env'

// Ícones customizados por tipo — sem Lucide genérico
const IconPaper = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="1" width="13" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="1" y="8" width="13" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="12.5" cy="4" r="1" fill="currentColor"/>
    <circle cx="12.5" cy="11" r="1" fill="currentColor" opacity="0.5"/>
    <rect x="3" y="3" width="6" height="1" rx="0.5" fill="currentColor" opacity="0.6"/>
    <rect x="3" y="5" width="4" height="1" rx="0.5" fill="currentColor" opacity="0.4"/>
  </svg>
)
const IconVanilla = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="1.5" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="4" y="4" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.7"/>
    <rect x="8" y="4" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.4"/>
    <rect x="4" y="8" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.4"/>
    <rect x="8" y="8" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.7"/>
  </svg>
)
const IconFabric = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5L13 4.5V10.5L7.5 13.5L2 10.5V4.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 4.5L7.5 10.5" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    <path d="M4.5 6L10.5 9" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    <path d="M10.5 6L4.5 9" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
  </svg>
)
const IconPickaxe = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M9 3L12 6L7 11L4 8L9 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M4 8L2 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M9 3L11 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M12 6L14 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const IconHybrid = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="8" y="8" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M7 4H11V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
  </svg>
)

const TYPE_META: Record<string, { label: string; color: string; border: string; bg: string; icon: React.ReactNode; accent: string }> = {
  paper:   { label: 'Paper',        color: 'text-amber-300',   border: 'border-amber-500/30',   bg: 'bg-amber-500/8',   icon: <IconPaper />,   accent: 'bg-amber-500'   },
  purpur:  { label: 'Purpur',       color: 'text-violet-300',  border: 'border-violet-500/30',  bg: 'bg-violet-500/8',  icon: <IconPaper />,   accent: 'bg-violet-500'  },
  vanilla: { label: 'Vanilla',      color: 'text-slate-300',   border: 'border-slate-500/30',   bg: 'bg-slate-500/8',   icon: <IconVanilla />, accent: 'bg-slate-500'   },
  fabric:  { label: 'Fabric',       color: 'text-sky-300',     border: 'border-sky-500/30',     bg: 'bg-sky-500/8',     icon: <IconFabric />,  accent: 'bg-sky-500'     },
  bedrock: { label: 'Bedrock',      color: 'text-orange-300',  border: 'border-orange-500/30',  bg: 'bg-orange-500/8',  icon: <IconPickaxe />, accent: 'bg-orange-500'  },
  hybrid:  { label: 'Java+Bedrock', color: 'text-brand-300',   border: 'border-brand-500/30',   bg: 'bg-brand-500/8',   icon: <IconHybrid />,  accent: 'bg-brand-500'   },
}

interface Props { navigate: (p: Page) => void; onQuickSetup: () => void }

export default function Dashboard({ navigate, onQuickSetup: _onQuickSetup }: Props) {
  const t = useT()
  const { servers, runningIds, setServers, setSelected, markRunning, markStopped, removeServer, setActiveTab } = useServerStore()
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    if (!isElectron) return
    const handler = ({ id }: { id: string }) => markStopped(id)
    window.electron.on('server-stopped', handler)
    return () => window.electron.off('server-stopped', handler)
  }, [])

  const start = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!isElectron) return
    const res = await window.electron.startServer(id)
    if (res.ok) markRunning(id)
    else { setStartError(res.error ?? 'Erro ao iniciar servidor'); setTimeout(() => setStartError(null), 6000) }
  }

  const stop = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!isElectron) return
    await window.electron.stopServer(id)
  }

  const del = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Deletar este servidor? Todos os arquivos serão removidos permanentemente.')) return
    const wasSelected = useServerStore.getState().selectedId === id
    if (runningIds.has(id)) {
      if (isElectron) await window.electron.stopServer(id)
      markStopped(id)
    }
    if (isElectron) await window.electron.deleteServer(id)
    removeServer(id)
    if (wasSelected) navigate('dashboard')
  }

  const select = (id: string) => { setSelected(id); navigate('server') }
  const plugins = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setSelected(id); setActiveTab('plugins'); navigate('server') }
  const folder = (e: React.MouseEvent, id: string) => { e.stopPropagation(); if (isElectron) window.electron.openServerFolder(id) }

  const onlineCount = runningIds.size

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Background: subtle stone grid + radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(251,146,60,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.055) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-56 bg-brand-500/6 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-64 bg-brand-700/4 rounded-full blur-3xl pointer-events-none translate-y-1/3" />

      <div className="relative flex flex-col h-full">
        {/* Error toast */}
        <AnimatePresence>
          {startError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300 shadow-xl max-w-md"
            >
              <AlertTriangle size={14} className="shrink-0 text-red-400" />
              <span className="flex-1">{startError}</span>
              <button onClick={() => setStartError(null)} className="text-red-500 hover:text-red-300"><X size={13} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">{t.myServers}</h1>
            {servers.length > 0 ? (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {servers.length} {servers.length !== 1 ? t.serversCount_many : t.serversCount_one}
                {onlineCount > 0 && (
                  <> · <span className="text-brand-400">{onlineCount} {t.online}</span></>
                )}
              </p>
            ) : (
              <p className="text-xs text-slate-600 mt-0.5">{t.noServers}</p>
            )}
          </div>
          {servers.length > 0 && (
            <button
              onClick={() => navigate('create')}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-400/35 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={14} strokeWidth={2.5} />
              {t.newServer}
            </button>
          )}
        </div>

        {/* Empty state */}
        {servers.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 pb-12">
            {/* Icon cluster */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-dark-800 border border-dark-600 flex items-center justify-center">
                <Server size={30} className="text-dark-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/40">
                <Plus size={15} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-bold text-[15px]">{t.noServersYet}</p>
              <p className="text-slate-600 text-sm mt-1.5 max-w-xs leading-relaxed">{t.noServersDesc}</p>
            </div>
            <button
              onClick={() => navigate('create')}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={14} strokeWidth={2.5} />
              {t.firstServer}
            </button>
          </div>
        )}

        {/* Server list */}
        {servers.length > 0 && (
          <div className="flex-1 overflow-auto px-7 pb-7">
            <div className="flex flex-col gap-1.5 max-w-3xl">
              {servers.map((server, i) => {
                const running = runningIds.has(server.id)
                const meta = TYPE_META[server.type] ?? TYPE_META.paper

                return (
                  <motion.div
                    key={server.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.22 }}
                    onClick={() => select(server.id)}
                    className={`relative rounded-xl cursor-pointer overflow-hidden transition-all duration-200 group
                      ${running
                        ? 'bg-dark-800 border border-brand-500/30 shadow-lg shadow-brand-500/6'
                        : 'bg-dark-800 border border-dark-600 hover:border-dark-500 hover:bg-dark-750'
                      }`}
                  >
                    {/* Left accent stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${running ? 'bg-brand-500' : `${meta.accent} opacity-50`}`} />

                    <div className="flex items-center gap-3.5 px-4 py-3 pl-[18px]">
                      {/* Type icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${meta.bg} ${meta.border} ${meta.color}`}>
                        {meta.icon}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-bold text-white text-[13px] font-mono truncate">{server.name}</span>
                          <span className={`text-[10px] font-bold ${meta.color} shrink-0 uppercase tracking-wide`}>{meta.label}</span>
                          <span className="text-slate-600 text-[10px] font-mono shrink-0">{server.version}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-[2px]">
                          <span className="text-slate-600 text-[11px] font-mono">
                            {server.ram >= 1024 ? `${server.ram / 1024}GB` : `${server.ram}MB`}
                          </span>
                          <span className="text-dark-500 text-[10px]">·</span>
                          <span className="text-slate-600 text-[11px] font-mono">:{server.port}</span>
                          {server.playit && (
                            <>
                              <span className="text-dark-500 text-[10px]">·</span>
                              <span className="text-brand-400 text-[11px] flex items-center gap-0.5">
                                <Wifi size={9} /> tunnel
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1.5 shrink-0 mr-1">
                        {running ? (
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-400" />
                            </span>
                            <span className="text-[11px] font-bold text-brand-300 font-mono">online</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-mono">offline</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {running ? (
                          <button
                            onClick={e => stop(e, server.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors mr-1"
                          >
                            <Square size={9} strokeWidth={3} /> {t.stop}
                          </button>
                        ) : (
                          <button
                            onClick={e => start(e, server.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-500/12 hover:bg-brand-500/22 border border-brand-500/25 text-brand-300 rounded-lg text-xs font-bold transition-colors mr-1"
                          >
                            <Play size={9} strokeWidth={3} /> {t.start}
                          </button>
                        )}
                        <button
                          onClick={e => plugins(e, server.id)}
                          className="p-1.5 text-dark-400 hover:text-slate-300 hover:bg-white/[0.04] rounded-lg transition-colors"
                          title={t.pluginsBtn}
                        >
                          <Puzzle size={13} />
                        </button>
                        <button
                          onClick={e => folder(e, server.id)}
                          className="p-1.5 text-dark-400 hover:text-slate-300 hover:bg-white/[0.04] rounded-lg transition-colors"
                          title={t.folder}
                        >
                          <FolderOpen size={13} />
                        </button>
                        <button
                          onClick={e => del(e, server.id)}
                          className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title={t.delete}
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={13} className="text-dark-500 group-hover:text-dark-400 transition-colors ml-0.5" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Add server row */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: servers.length * 0.05 + 0.12 }}
                onClick={() => navigate('create')}
                className="w-full rounded-xl border border-dashed border-dark-600 hover:border-brand-500/35 hover:bg-brand-500/[0.03] flex items-center justify-center gap-2 py-3 text-dark-400 hover:text-brand-400/80 transition-all duration-200 group"
              >
                <div className="w-5 h-5 rounded-md border border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform duration-150">
                  <Plus size={11} />
                </div>
                <span className="text-xs font-bold">{t.newServer}</span>
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
