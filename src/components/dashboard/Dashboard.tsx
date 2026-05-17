import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Server, Play, Square, FolderOpen, Trash2, Wifi } from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'

const isElectron = typeof window !== 'undefined' && !!window.electron

const TYPE_COLORS: Record<string, string> = {
  paper:  'text-yellow-400 bg-yellow-400/10',
  purpur: 'text-purple-400 bg-purple-400/10',
  vanilla:'text-sky-400 bg-sky-400/10',
  fabric: 'text-blue-400 bg-blue-400/10',
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
    if (!confirm('Deletar este servidor? Isso apagará todos os arquivos.')) return
    if (isElectron) await window.electron.deleteServer(id)
    removeServer(id)
  }

  const handleOpenFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (isElectron) window.electron.openServerFolder(id)
  }

  const handleSelect = (id: string) => {
    setSelected(id)
    navigate('server')
  }

  return (
    <div className="h-full p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Meus Servidores</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{servers.length} servidor{servers.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => navigate('create')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novo servidor
        </button>
      </div>

      {/* Empty state */}
      {servers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-700 flex items-center justify-center">
            <Server size={28} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-zinc-300 font-medium">Nenhum servidor ainda</p>
            <p className="text-zinc-600 text-sm mt-1">Crie seu primeiro servidor Minecraft abaixo</p>
          </div>
          <button
            onClick={() => navigate('create')}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Criar servidor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 overflow-auto pb-4">
          {servers.map((server, i) => {
            const running = runningIds.has(server.id)
            return (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(server.id)}
                className="relative bg-surface-800 border border-surface-600 hover:border-surface-500 rounded-2xl p-4 cursor-pointer group transition-colors"
              >
                {/* Status dot */}
                <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${running ? 'bg-brand-400 animate-pulse' : 'bg-zinc-600'}`} />

                {/* Server icon */}
                <div className="w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center mb-3">
                  <Server size={20} className={running ? 'text-brand-400' : 'text-zinc-500'} />
                </div>

                <p className="font-semibold text-white truncate pr-4">{server.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[server.type] || 'text-zinc-400 bg-zinc-400/10'}`}>
                    {server.type}
                  </span>
                  <span className="text-xs text-zinc-500">{server.version}</span>
                  {server.playit && <Wifi size={11} className="text-brand-400" />}
                </div>

                <div className="text-xs text-zinc-600 mt-1">:{server.port} · {server.ram}MB RAM</div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  {running ? (
                    <button
                      onClick={e => handleStop(e, server.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Square size={12} />
                      Parar
                    </button>
                  ) : (
                    <button
                      onClick={e => handleStart(e, server.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Play size={12} />
                      Iniciar
                    </button>
                  )}
                  <button
                    onClick={e => handleOpenFolder(e, server.id)}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-surface-600 rounded-lg transition-colors"
                    title="Abrir pasta"
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button
                    onClick={e => handleDelete(e, server.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-auto"
                    title="Deletar servidor"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
