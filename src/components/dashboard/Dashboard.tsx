import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Server, Play, Square, FolderOpen, Trash2, Wifi, Puzzle, Globe, Layers, Cpu, Pickaxe, Zap } from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'

const isElectron = typeof window !== 'undefined' && !!window.electron

const TYPE_META: Record<string, { label: string; color: string; border: string; bg: string; icon: React.ReactNode; glow: string }> = {
  paper:   { label: 'Paper',        color: 'text-amber-300',   border: 'border-amber-500/25',   bg: 'bg-amber-500/10',   icon: <Cpu size={16} />,     glow: 'from-amber-500/20' },
  purpur:  { label: 'Purpur',       color: 'text-violet-300',  border: 'border-violet-500/25',  bg: 'bg-violet-500/10',  icon: <Cpu size={16} />,     glow: 'from-violet-500/20' },
  vanilla: { label: 'Vanilla',      color: 'text-slate-300',   border: 'border-slate-500/25',   bg: 'bg-slate-500/10',   icon: <Globe size={16} />,   glow: 'from-slate-500/15' },
  fabric:  { label: 'Fabric',       color: 'text-sky-300',     border: 'border-sky-500/25',     bg: 'bg-sky-500/10',     icon: <Cpu size={16} />,     glow: 'from-sky-500/20' },
  bedrock: { label: 'Bedrock',      color: 'text-orange-300',  border: 'border-orange-500/25',  bg: 'bg-orange-500/10',  icon: <Pickaxe size={16} />, glow: 'from-orange-500/20' },
  hybrid:  { label: 'Java+Bedrock', color: 'text-brand-300',   border: 'border-brand-500/25',   bg: 'bg-brand-500/10',   icon: <Zap size={16} />,     glow: 'from-brand-500/20' },
}

interface Props { navigate: (p: Page) => void }

export default function Dashboard({ navigate }: Props) {
  const { servers, runningIds, setServers, setSelected, markRunning, markStopped, removeServer } = useServerStore()

  useEffect(() => {
    if (!isElectron) return
    window.electron.on('server-stopped', ({ id }: { id: string }) => markStopped(id))
  }, [])

  const start = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!isElectron) return
    const res = await window.electron.startServer(id)
    if (res.ok) markRunning(id)
    else alert(res.error)
  }

  const stop = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!isElectron) return
    await window.electron.stopServer(id)
  }

  const del = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Deletar este servidor? Todos os arquivos serão removidos permanentemente.')) return
    if (isElectron) await window.electron.deleteServer(id)
    removeServer(id)
  }

  const select = (id: string) => { setSelected(id); navigate('server') }
  const plugins = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setSelected(id); navigate('plugins') }
  const folder = (e: React.MouseEvent, id: string) => { e.stopPropagation(); if (isElectron) window.electron.openServerFolder(id) }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Warm grid bg */}
      <div className="absolute inset-0 bg-grid-dark bg-grid opacity-100 pointer-events-none" />
      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-brand-500/8 rounded-full blur-3xl pointer-events-none -translate-y-2/3" />

      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-5">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Meus Servidores</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {servers.length === 0
                ? 'Nenhum servidor criado ainda'
                : `${servers.length} servidor${servers.length !== 1 ? 'es' : ''} · ${runningIds.size} online`}
            </p>
          </div>
          <button
            onClick={() => navigate('create')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-400/35 hover:scale-[1.03] active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            Novo servidor
          </button>
        </div>

        {/* Empty state */}
        {servers.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-16">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-dark-800 border border-dark-600 flex items-center justify-center">
                <Server size={36} className="text-dark-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/40">
                <Plus size={16} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-bold">Nenhum servidor ainda</p>
              <p className="text-slate-600 text-sm mt-1.5 max-w-xs">Crie um servidor Java, Bedrock ou híbrido e comece a jogar em minutos</p>
            </div>
            <button
              onClick={() => navigate('create')}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/25 hover:scale-[1.03]"
            >
              Criar meu primeiro servidor
            </button>
          </div>
        )}

        {/* Cards grid */}
        {servers.length > 0 && (
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {servers.map((server, i) => {
                const running = runningIds.has(server.id)
                const meta = TYPE_META[server.type] ?? TYPE_META.paper

                return (
                  <motion.div
                    key={server.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                    onClick={() => select(server.id)}
                    className={`relative rounded-2xl cursor-pointer overflow-hidden transition-all duration-200 group
                      ${running
                        ? 'bg-dark-800 border border-brand-500/35 shadow-xl shadow-brand-500/8'
                        : 'bg-dark-800 border border-dark-600 hover:border-dark-500'
                      }`}
                  >
                    {/* Top color strip */}
                    <div className={`h-[3px] w-full bg-gradient-to-r ${running ? 'from-brand-500 via-brand-400 to-amber-400' : `${meta.glow} to-transparent`} transition-all duration-500`} />

                    <div className="p-4">
                      {/* Header row */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.border} ${meta.color}`}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{server.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-bold ${meta.color}`}>{meta.label}</span>
                            <span className="text-dark-400 text-[10px]">·</span>
                            <span className="text-[10px] text-slate-600 font-mono">{server.version}</span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {running && (
                            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wide">Online</span>
                          )}
                          <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-brand-400 shadow-sm shadow-brand-400/60' : 'bg-dark-500'}`} />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-2 mb-3">
                        <Chip icon={<Layers size={9} />} value={server.ram >= 1024 ? `${server.ram / 1024}GB` : `${server.ram}MB`} />
                        <Chip icon={<Globe size={9} />} value={`:${server.port}`} />
                        {server.playit && <Chip icon={<Wifi size={9} />} value="Tunnel" highlight />}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {running ? (
                          <button
                            onClick={e => stop(e, server.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/18 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Square size={9} strokeWidth={3} /> Parar
                          </button>
                        ) : (
                          <button
                            onClick={e => start(e, server.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-500/12 hover:bg-brand-500/22 border border-brand-500/25 text-brand-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Play size={9} strokeWidth={3} /> Iniciar
                          </button>
                        )}
                        <button onClick={e => plugins(e, server.id)} className="p-1.5 text-dark-400 hover:text-slate-300 hover:bg-white/[0.04] rounded-lg transition-colors" title="Plugins">
                          <Puzzle size={12} />
                        </button>
                        <button onClick={e => folder(e, server.id)} className="p-1.5 text-dark-400 hover:text-slate-300 hover:bg-white/[0.04] rounded-lg transition-colors" title="Pasta">
                          <FolderOpen size={12} />
                        </button>
                        <button onClick={e => del(e, server.id)} className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-auto" title="Deletar">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Add card */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: servers.length * 0.06 + 0.1 }}
                onClick={() => navigate('create')}
                className="min-h-[172px] rounded-2xl border-2 border-dashed border-dark-600 hover:border-brand-500/35 hover:bg-brand-500/[0.04] flex flex-col items-center justify-center gap-2.5 text-dark-400 hover:text-brand-400/80 transition-all duration-200 group"
              >
                <div className="w-9 h-9 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Plus size={16} />
                </div>
                <span className="text-xs font-bold">Novo servidor</span>
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ icon, value, highlight }: { icon: React.ReactNode; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold
      ${highlight ? 'bg-brand-500/10 border-brand-500/20 text-brand-400' : 'bg-dark-700 border-dark-600 text-slate-500'}`}>
      {icon}
      {value}
    </div>
  )
}
