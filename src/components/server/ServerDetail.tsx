import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Play, Square, RotateCcw, FolderOpen, Wifi, WifiOff,
  Terminal, Puzzle, RefreshCw, ChevronLeft, Copy, Check,
  AlertTriangle
} from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'

const isElectron = typeof window !== 'undefined' && !!window.electron

interface Props { navigate: (p: Page) => void }

export default function ServerDetail({ navigate }: Props) {
  const { servers, runningIds, selectedId, markRunning, markStopped, updateServer } = useServerStore()
  const server = servers.find(s => s.id === selectedId)
  const running = selectedId ? runningIds.has(selectedId) : false

  const [logs, setLogs] = useState<string[]>([])
  const [cmd, setCmd] = useState('')
  const [tab, setTab] = useState<'console' | 'info'>('console')
  const [playitLog, setPlayitLog] = useState<string[]>([])
  const [playitAddr, setPlayitAddr] = useState('')
  const [playitRunning, setPlayitRunning] = useState(false)
  const [updateAvail, setUpdateAvail] = useState<{ latestVersion: string } | null>(null)
  const [updating, setUpdating] = useState(false)
  const [copied, setCopied] = useState(false)
  const logsEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isElectron || !selectedId) return
    setLogs([])
    setPlayitLog([])
    setPlayitAddr('')

    window.electron.on('server-log', ({ id, line }: { id: string; line: string }) => {
      if (id === selectedId) setLogs(l => [...l.slice(-500), line])
    })
    window.electron.on('server-stopped', ({ id }: { id: string }) => {
      if (id === selectedId) markStopped(id)
    })
    window.electron.on('playit-address', ({ serverId, address }: any) => {
      if (serverId === selectedId) setPlayitAddr(address)
    })
    window.electron.on('playit-log', ({ serverId, line }: any) => {
      if (serverId === selectedId) setPlayitLog(l => [...l.slice(-100), line])
    })
    window.electron.on('playit-stopped', ({ serverId }: any) => {
      if (serverId === selectedId) setPlayitRunning(false)
    })

    // Check for updates
    window.electron.checkUpdate(selectedId).then((r: any) => {
      if (r.hasUpdate) setUpdateAvail({ latestVersion: r.latestVersion })
    })
  }, [selectedId])

  useEffect(() => {
    logsEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!server) return null

  const handleStart = async () => {
    if (!isElectron) return
    const res = await window.electron.startServer(server.id)
    if (res.ok) markRunning(server.id)
    else alert(res.error)
  }

  const handleStop = async () => {
    if (!isElectron) return
    await window.electron.stopServer(server.id)
  }

  const handleCmd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cmd.trim() || !isElectron) return
    window.electron.sendCommand(server.id, cmd.trim())
    setLogs(l => [...l, `> ${cmd.trim()}`])
    setCmd('')
  }

  const handlePlayit = async () => {
    if (!isElectron) return
    const enable = !playitRunning
    setPlayitRunning(enable)
    if (!enable) setPlayitAddr('')
    await window.electron.togglePlayit(server.id, enable)
  }

  const handleUpdate = async () => {
    if (!isElectron || !selectedId) return
    setUpdating(true)
    window.electron.on('create-progress', ({ msg }: any) => setLogs(l => [...l, `[UPDATE] ${msg}`]))
    const res = await window.electron.updateServer(selectedId)
    if (res.ok) {
      updateServer(selectedId, { version: res.newVersion })
      setUpdateAvail(null)
    }
    setUpdating(false)
  }

  const copyAddr = () => {
    navigator.clipboard.writeText(playitAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const colorLine = (line: string) => {
    if (line.includes('ERROR') || line.includes('SEVERE')) return 'text-red-400'
    if (line.includes('WARN')) return 'text-yellow-400'
    if (line.includes('INFO')) return 'text-zinc-300'
    if (line.startsWith('>')) return 'text-brand-400'
    return 'text-zinc-400'
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('dashboard')} className="p-1.5 rounded-lg hover:bg-surface-700 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">{server.name}</h1>
          <p className="text-xs text-zinc-500">{server.type} {server.version} · :{server.port} · {server.ram}MB</p>
        </div>

        {/* Update banner */}
        {updateAvail && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleUpdate}
            disabled={updating || running}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-medium hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={updating ? 'animate-spin' : ''} />
            {updating ? 'Atualizando...' : `Atualizar para ${updateAvail.latestVersion}`}
          </motion.button>
        )}

        <div className={`ml-auto flex items-center gap-2 ${updateAvail ? 'ml-2' : 'ml-auto'}`}>
          {/* Start/Stop */}
          {running ? (
            <button onClick={handleStop} className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-colors">
              <Square size={14} /> Parar
            </button>
          ) : (
            <button onClick={handleStart} className="flex items-center gap-1.5 px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-xl text-sm font-medium transition-colors">
              <Play size={14} /> Iniciar
            </button>
          )}

          {/* playit.gg */}
          <button
            onClick={handlePlayit}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${playitRunning ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-700 text-zinc-400 hover:text-white'}`}
            title={playitRunning ? 'Desligar tunnel' : 'Ligar tunnel playit.gg'}
          >
            {playitRunning ? <Wifi size={14} /> : <WifiOff size={14} />}
            playit.gg
          </button>

          <button onClick={() => isElectron && window.electron.openServerFolder(server.id)} className="p-2 rounded-xl bg-surface-700 text-zinc-400 hover:text-white transition-colors" title="Abrir pasta">
            <FolderOpen size={14} />
          </button>
          <button onClick={() => navigate('plugins')} className="p-2 rounded-xl bg-surface-700 text-zinc-400 hover:text-white transition-colors" title="Plugins">
            <Puzzle size={14} />
          </button>
        </div>
      </div>

      {/* playit address bar */}
      {playitAddr && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-brand-500/10 border border-brand-500/30 rounded-xl"
        >
          <Wifi size={14} className="text-brand-400 shrink-0" />
          <span className="text-sm text-zinc-300 font-mono flex-1">{playitAddr}</span>
          <button onClick={copyAddr} className="p-1 text-zinc-400 hover:text-white transition-colors">
            {copied ? <Check size={13} className="text-brand-400" /> : <Copy size={13} />}
          </button>
        </motion.div>
      )}

      {/* Java missing warning */}
      {logs.some(l => l.includes('Java não encontrado')) && (
        <div className="flex items-center gap-2 mb-3 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertTriangle size={14} />
          Java não encontrado. Instale Java 17+ em java.com e tente novamente.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(['console', 'info'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${tab === t ? 'bg-surface-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {t === 'console' ? <><Terminal size={11} className="inline mr-1" />Console</> : 'Info'}
          </button>
        ))}
      </div>

      {/* Console */}
      {tab === 'console' && (
        <div className="flex-1 flex flex-col bg-surface-900 rounded-xl border border-surface-700 overflow-hidden min-h-0">
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
            {logs.length === 0 ? (
              <span className="text-zinc-600">Inicie o servidor para ver os logs...</span>
            ) : (
              logs.map((line, i) => (
                <div key={i} className={colorLine(line)}>{line}</div>
              ))
            )}
            <div ref={logsEnd} />
          </div>
          <form onSubmit={handleCmd} className="flex items-center gap-2 border-t border-surface-700 px-3 py-2">
            <span className="text-brand-500 font-mono text-xs">&gt;</span>
            <input
              value={cmd}
              onChange={e => setCmd(e.target.value)}
              disabled={!running}
              placeholder={running ? 'Digite um comando...' : 'Inicie o servidor para enviar comandos'}
              className="flex-1 bg-transparent text-xs font-mono text-white placeholder-zinc-700 focus:outline-none disabled:cursor-not-allowed"
            />
          </form>
        </div>
      )}

      {/* Info tab */}
      {tab === 'info' && (
        <div className="flex-1 overflow-auto space-y-3">
          {[
            ['Nome', server.name],
            ['Tipo', server.type],
            ['Versão', server.version],
            ['RAM', `${server.ram >= 1024 ? server.ram / 1024 + 'GB' : server.ram + 'MB'}`],
            ['Porta', String(server.port)],
            ['playit.gg', server.playit ? 'Ativado' : 'Desativado'],
            ['Criado em', new Date(server.createdAt).toLocaleDateString('pt-BR')],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-3 bg-surface-800 rounded-xl border border-surface-700">
              <span className="text-xs text-zinc-500">{k}</span>
              <span className="text-sm text-white font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
