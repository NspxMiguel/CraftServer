import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Server, Play, Square, FolderOpen, Trash2, Wifi, Puzzle, Cpu, MemoryStick, Globe } from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'

const isElectron = typeof window !== 'undefined' && !!window.electron

const TYPE_META: Record<string, { label: string; color: string; dot: string }> = {
  paper:   { label: 'Paper',   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',   dot: 'bg-yellow-400' },
  purpur:  { label: 'Purpur',  color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',   dot: 'bg-purple-400' },
  vanilla: { label: 'Vanilla', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',             dot: 'bg-sky-400'    },
  fabric:  { label: 'Fabric',  color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',          dot: 'bg-blue-400'   },
}

interface Props { navigate: (p: Page) => void }

export default function Dashboard({ navigate }: Props) {
  const { servers, runningIds, setServers, setSelected, markRunning, markStopped, removeServer } = useServerStore()

  useEffect(() => {
    if (!isElectron) return
    window.electron.on('server-stopped', ({ id }: { id: string }) => markStopped(id))
  }, [])

  const handleStart = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!isElectron) return
    const res = await window.electron.startServer(id)
    if (res.ok) markRunning(id)
    else alert(res.error)
  }

  const handleStop = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!isElectron) return
    await window.electron.stopServer(id)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Deletar este servidor? Todos os arquivos serão removidos.')) return
    if (isElectron) await window.electron.deleteServer(id)
    removeServer(id)
  }

  const handleSelect = (id: string) => {
    setSelected(id)
    navigate('server')
  }

  const handlePlugins = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelected(id)
    navigate('plugins')
  }

  const handleFolder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (isElectron) window.electron.openServerFolder(id)
  }

  return (
    <div className="h-full flex flex-col grid-bg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-10 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Meus Servidores</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {servers.length === 0
              ? 'Nenhum servidor criado ainda'
              : `${servers.length} servidor${servers.length !== 1 ? 'es' : ''} · ${runningIds.size} online`}
          </p>
        </div>
        <button
          onClick={() => navigate('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus size={16} strokeWidth={2.5} />
          Novo servidor
        </button>
      </div>

      {/* Empty */}
      {servers.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 pb-24">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-surface-700 flex items-center justify-center">
              <Server size={40} className="text-zinc-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg">
              <Plus size={16} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-zinc-200 font-semibold text-lg">Sem servidores ainda</p>
            <p className="text-zinc-600 text-sm mt-1">Crie um servidor e comece a jogar em minutos</p>
          </div>
          <button
            onClick={() => navigate('create')}
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20"
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
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                  onClick={() => handleSelect(server.id)}
                  className={`group relative bg-[#111] rounded-2xl border cursor-pointer overflow-hidden transition-all duration-200
                    ${running
                      ? 'border-brand-500/30 shadow-lg shadow-brand-500/5'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                >
                  {/* Top gradient strip */}
                  <div className={`h-[2px] ${running ? 'bg-gradient-to-r from-brand-400 to-brand-600' : 'bg-white/[0.04]'} transition-colors duration-300`} />

                  <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${running ? 'bg-brand-500/15' : 'bg-white/[0.04]'} transition-colors`}>
                          <Server size={18} className={running ? 'text-brand-400' : 'text-zinc-500'} />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm leading-tight truncate max-w-[140px]">{server.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${meta.color}`}>
                              {meta.label}
                            </span>
                            <span className="text-[11px] text-zinc-600">{server.version}</span>
                          </div>
                        </div>
                      </div>
                      {/* Status */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {running && <span className="text-[11px] text-brand-400 font-medium">online</span>}
                        <span className={`w-2 h-2 rounded-full ${running ? 'bg-brand-400 animate-pulse' : 'bg-zinc-700'}`} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <Stat icon={<MemoryStick size={11} />} value={server.ram >= 1024 ? `${server.ram / 1024}GB` : `${server.ram}MB`} label="RAM" />
                      <Stat icon={<Globe size={11} />} value={`:${server.port}`} label="Porta" />
                      <Stat icon={<Wifi size={11} />} value={server.playit ? 'Ativo' : 'Off'} label="Tunnel" highlight={server.playit} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {running ? (
                        <button
                          onClick={e => handleStop(e, server.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Square size={11} strokeWidth={2.5} />
                          Parar
                        </button>
                      ) : (
                        <button
                          onClick={e => handleStart(e, server.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 text-brand-400 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Play size={11} strokeWidth={2.5} />
                          Iniciar
                        </button>
                      )}
                      <button
                        onClick={e => handlePlugins(e, server.id)}
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] rounded-lg transition-colors"
                        title="Plugins"
                      >
                        <Puzzle size={14} />
                      </button>
                      <button
                        onClick={e => handleFolder(e, server.id)}
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] rounded-lg transition-colors"
                        title="Abrir pasta"
                      >
                        <FolderOpen size={14} />
                      </button>
                      <button
                        onClick={e => handleDelete(e, server.id)}
                        className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-auto"
                        title="Deletar"
                      >
                        <Trash2 size={14} />
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
              className="h-full min-h-[200px] rounded-2xl border border-dashed border-white/[0.08] hover:border-brand-500/40 hover:bg-brand-500/[0.03] flex flex-col items-center justify-center gap-3 text-zinc-600 hover:text-brand-400 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl border border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={18} />
              </div>
              <span className="text-xs font-medium">Novo servidor</span>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, value, label, highlight }: { icon: React.ReactNode; value: string; label: string; highlight?: boolean }) {
  return (
    <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
      <div className={`flex items-center gap-1 ${highlight ? 'text-brand-400' : 'text-zinc-600'} mb-0.5`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className={`text-xs font-semibold font-mono ${highlight ? 'text-brand-300' : 'text-zinc-300'}`}>{value}</p>
    </div>
  )
}
