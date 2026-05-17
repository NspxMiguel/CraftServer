import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Server, Play, Square, FolderOpen, Trash2, Wifi, Puzzle, Globe, Layers, Zap } from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'

const isElectron = typeof window !== 'undefined' && !!window.electron

const TYPE_META: Record<string, { label: string; color: string; bg: string; dot: string; icon: string }> = {
  paper:   { label: 'Paper',        color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20',   dot: 'bg-amber-400',   icon: '📄' },
  purpur:  { label: 'Purpur',       color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20', dot: 'bg-violet-400',  icon: '🔮' },
  vanilla: { label: 'Vanilla',      color: 'text-slate-300',  bg: 'bg-slate-400/10 border-slate-400/20',   dot: 'bg-slate-400',   icon: '🌿' },
  fabric:  { label: 'Fabric',       color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',     dot: 'bg-blue-400',    icon: '🧵' },
  bedrock: { label: 'Bedrock',      color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', dot: 'bg-orange-400',  icon: '🪨' },
  hybrid:  { label: 'Java+Bedrock', color: 'text-brand-300',  bg: 'bg-brand-400/10 border-brand-400/20',   dot: 'bg-brand-400',   icon: '⚡' },
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
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-dark bg-grid opacity-100 pointer-events-none" />
      {/* Radial glow top-right */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-400/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Meus Servidores</h1>
            <p className="text-sm text-slate-500 mt-1">
              {servers.length === 0 ? 'Nenhum servidor criado ainda'
                : `${servers.length} servidor${servers.length !== 1 ? 'es' : ''} · ${runningIds.size} online`}
            </p>
          </div>
          <button
            onClick={() => navigate('create')}
            className="group flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-400/30 hover:scale-105"
          >
            <Plus size={16} strokeWidth={2.5} />
            Novo servidor
          </button>
        </div>

        {/* Empty */}
        {servers.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-20">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl bg-dark-700 border border-brand-400/10 flex items-center justify-center">
                <Server size={44} className="text-dark-300" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/40">
                <Plus size={18} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-bold text-lg">Nenhum servidor ainda</p>
              <p className="text-slate-600 text-sm mt-1.5 max-w-xs">Crie um servidor Java, Bedrock ou híbrido e comece a jogar em minutos</p>
            </div>
            <button
              onClick={() => navigate('create')}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20 hover:scale-105"
            >
              Criar meu primeiro servidor
            </button>
          </div>
        )}

        {/* Grid */}
        {servers.length > 0 && (
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {servers.map((server, i) => {
                const running = runningIds.has(server.id)
                const meta = TYPE_META[server.type] || TYPE_META.paper

                return (
                  <motion.div
                    key={server.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    onClick={() => select(server.id)}
                    className={`relative bg-dark-800 rounded-2xl cursor-pointer overflow-hidden transition-all duration-200 group
                      ${running
                        ? 'border border-brand-400/30 shadow-xl shadow-brand-400/5'
                        : 'border border-brand-400/8 hover:border-brand-400/20'
                      }`}
                  >
                    {/* Gradient accent top */}
                    <div className={`h-0.5 w-full transition-all duration-500
                      ${running ? 'bg-gradient-to-r from-brand-400 via-brand-300 to-sky-400' : 'bg-dark-600 group-hover:bg-dark-500'}`} />

                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-colors
                            ${running ? 'bg-brand-400/15' : 'bg-dark-700'}`}>
                            {meta.icon}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm leading-tight truncate max-w-[130px]">{server.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${meta.bg} ${meta.color}`}>
                                {meta.label}
                              </span>
                              <span className="text-[10px] text-slate-600 font-mono">{server.version}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {running && <span className="text-[10px] text-brand-400 font-bold">ONLINE</span>}
                          <span className={`w-2 h-2 rounded-full ${running ? 'bg-brand-400' : 'bg-dark-400'} ${running ? 'shadow-sm shadow-brand-400/50' : ''}`} />
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <StatChip icon={<Layers size={10} />} label="RAM" value={server.ram >= 1024 ? `${server.ram/1024}GB` : `${server.ram}MB`} />
                        <StatChip icon={<Globe size={10} />} label="Porta" value={`:${server.port}`} />
                        <StatChip icon={<Wifi size={10} />} label="Tunnel" value={server.playit ? 'Ativo' : 'Off'} highlight={server.playit} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {running ? (
                          <button
                            onClick={e => stop(e, server.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Square size={10} strokeWidth={3} /> Parar
                          </button>
                        ) : (
                          <button
                            onClick={e => start(e, server.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 text-brand-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Play size={10} strokeWidth={3} /> Iniciar
                          </button>
                        )}
                        <button onClick={e => plugins(e, server.id)} className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] rounded-lg transition-colors" title="Plugins">
                          <Puzzle size={13} />
                        </button>
                        <button onClick={e => folder(e, server.id)} className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] rounded-lg transition-colors" title="Abrir pasta">
                          <FolderOpen size={13} />
                        </button>
                        <button onClick={e => del(e, server.id)} className="p-1.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-auto" title="Deletar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Add new */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: servers.length * 0.07 + 0.1 }}
                onClick={() => navigate('create')}
                className="min-h-[200px] rounded-2xl border-2 border-dashed border-dark-500 hover:border-brand-400/30 hover:bg-brand-400/[0.03] flex flex-col items-center justify-center gap-3 text-dark-300 hover:text-brand-400/70 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Plus size={18} />
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

function StatChip({ icon, label, value, highlight }: { icon: React.ReactNode; value: string; label: string; highlight?: boolean }) {
  return (
    <div className="bg-dark-700 rounded-lg px-2.5 py-2 border border-brand-400/5">
      <div className={`flex items-center gap-1 mb-0.5 ${highlight ? 'text-brand-400' : 'text-slate-600'}`}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xs font-bold font-mono ${highlight ? 'text-brand-300' : 'text-slate-400'}`}>{value}</p>
    </div>
  )
}
