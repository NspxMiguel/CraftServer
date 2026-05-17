import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, FolderOpen, Wifi, WifiOff,
  Puzzle, RefreshCw, ChevronLeft, Copy, Check,
  AlertTriangle, Circle, Server, MemoryStick, Globe, Calendar
} from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'

const isElectron = typeof window !== 'undefined' && !!window.electron

interface Props { navigate: (p: Page) => void }

export default function ServerDetail({ navigate }: Props) {
  const { servers, runningIds, selectedId, markRunning, markStopped, updateServer } = useServerStore()
  const server = servers.find(s => s.id === selectedId)
  const running = selectedId ? runningIds.has(selectedId) : false

  const [logs, setLogs] = useState<{ text: string; type: 'info' | 'warn' | 'error' | 'cmd' }[]>([])
  const [cmd, setCmd] = useState('')
  const [playitAddr, setPlayitAddr] = useState('')
  const [playitRunning, setPlayitRunning] = useState(false)
  const [updateAvail, setUpdateAvail] = useState<{ latestVersion: string } | null>(null)
  const [updating, setUpdating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [javaError, setJavaError] = useState(false)
  const logsEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isElectron || !selectedId) return
    setLogs([])
    setPlayitAddr('')
    setPlayitRunning(false)
    setJavaError(false)
    setUpdateAvail(null)

    window.electron.on('server-log', ({ id, line }: { id: string; line: string }) => {
      if (id !== selectedId) return
      const text = line.trimEnd()
      if (!text) return
      if (text.includes('Java não encontrado')) setJavaError(true)
      const type = text.includes('ERROR') || text.includes('SEVERE') ? 'error'
        : text.includes('WARN') ? 'warn'
        : 'info'
      setLogs(l => [...l.slice(-800), { text, type }])
    })
    window.electron.on('server-stopped', ({ id }: { id: string }) => {
      if (id === selectedId) {
        markStopped(id)
        addLog('── Servidor parado ──', 'warn')
      }
    })
    window.electron.on('playit-address', ({ serverId, address }: any) => {
      if (serverId === selectedId) setPlayitAddr(address)
    })
    window.electron.on('playit-stopped', ({ serverId }: any) => {
      if (serverId === selectedId) { setPlayitRunning(false); setPlayitAddr('') }
    })

    window.electron.checkUpdate(selectedId).then((r: any) => {
      if (r.hasUpdate) setUpdateAvail({ latestVersion: r.latestVersion })
    })
  }, [selectedId])

  useEffect(() => {
    logsEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = (text: string, type: 'info' | 'warn' | 'error' | 'cmd' = 'info') => {
    setLogs(l => [...l, { text, type }])
  }

  if (!server) return null

  const handleStart = async () => {
    if (!isElectron) return
    addLog('── Iniciando servidor... ──', 'info')
    const res = await window.electron.startServer(server.id)
    if (res.ok) markRunning(server.id)
    else { addLog(`Erro: ${res.error}`, 'error'); if (res.error?.includes('Java')) setJavaError(true) }
  }

  const handleStop = async () => {
    if (!isElectron) return
    addLog('── Enviando comando de parada... ──', 'warn')
    await window.electron.stopServer(server.id)
  }

  const handleCmd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cmd.trim() || !isElectron) return
    window.electron.sendCommand(server.id, cmd.trim())
    addLog(`> ${cmd.trim()}`, 'cmd')
    setCmd('')
  }

  const handlePlayit = async () => {
    if (!isElectron) return
    const enable = !playitRunning
    setPlayitRunning(enable)
    if (!enable) setPlayitAddr('')
    const res = await window.electron.togglePlayit(server.id, enable)
    if (!res.ok && enable) setPlayitRunning(false)
  }

  const handleUpdate = async () => {
    if (!isElectron || !selectedId || running) return
    setUpdating(true)
    window.electron.on('create-progress', ({ msg }: any) => addLog(`[UPDATE] ${msg}`, 'info'))
    const res = await window.electron.updateServer(selectedId)
    if (res.ok) { updateServer(selectedId, { version: res.newVersion }); setUpdateAvail(null) }
    else addLog(`Erro no update: ${res.error}`, 'error')
    setUpdating(false)
  }

  const copyAddr = () => {
    navigator.clipboard.writeText(playitAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const logColor = (type: string) => {
    if (type === 'error') return 'text-red-400'
    if (type === 'warn') return 'text-yellow-400/90'
    if (type === 'cmd') return 'text-brand-400'
    return 'text-zinc-400'
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-5 border-b border-white/[0.05]">
        <button
          onClick={() => navigate('dashboard')}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${running ? 'bg-brand-500/15' : 'bg-white/[0.04]'}`}>
          <Server size={15} className={running ? 'text-brand-400' : 'text-zinc-500'} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white truncate">{server.name}</h1>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${running ? 'bg-brand-400 animate-pulse' : 'bg-zinc-700'}`} />
            {running && <span className="text-xs text-brand-400 font-medium shrink-0">online</span>}
          </div>
          <p className="text-xs text-zinc-600">{server.type} {server.version} · :{server.port} · {server.ram >= 1024 ? `${server.ram / 1024}GB` : `${server.ram}MB`} RAM</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {updateAvail && !running && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleUpdate}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={updating ? 'animate-spin' : ''} />
              {updating ? 'Atualizando...' : `→ ${updateAvail.latestVersion}`}
            </motion.button>
          )}

          <button
            onClick={handlePlayit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
              ${playitRunning
                ? 'bg-brand-500/15 border-brand-500/30 text-brand-400 hover:bg-brand-500/25'
                : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.07]'
              }`}
          >
            {playitRunning ? <Wifi size={12} /> : <WifiOff size={12} />}
            playit.gg
          </button>

          <button
            onClick={() => isElectron && window.electron.openServerFolder(server.id)}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.07] transition-colors"
            title="Abrir pasta"
          >
            <FolderOpen size={14} />
          </button>

          <button
            onClick={() => { useServerStore.getState().setSelected(server.id); navigate('plugins') }}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.07] transition-colors"
            title="Plugins"
          >
            <Puzzle size={14} />
          </button>

          {running ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition-colors"
            >
              <Square size={12} strokeWidth={2.5} />
              Parar
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-md shadow-brand-500/20"
            >
              <Play size={12} strokeWidth={2.5} />
              Iniciar
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left panel — info */}
        <div className="w-56 shrink-0 border-r border-white/[0.05] flex flex-col p-4 gap-3 overflow-auto">
          {/* playit address */}
          <AnimatePresence>
            {playitAddr && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider">Tunnel ativo</span>
                  <button onClick={copyAddr} className="text-zinc-500 hover:text-white transition-colors">
                    {copied ? <Check size={11} className="text-brand-400" /> : <Copy size={11} />}
                  </button>
                </div>
                <p className="text-xs font-mono text-zinc-300 break-all leading-relaxed">{playitAddr}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Java error */}
          {javaError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={11} className="text-red-400" />
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Java ausente</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">Instale Java 17+ em adoptium.net</p>
            </div>
          )}

          {/* Server info cards */}
          <InfoBlock label="Tipo" value={server.type} />
          <InfoBlock label="Versão" value={server.version} />
          <InfoBlock label="RAM" value={server.ram >= 1024 ? `${server.ram / 1024}GB` : `${server.ram}MB`} icon={<MemoryStick size={11} />} />
          <InfoBlock label="Porta" value={`:${server.port}`} icon={<Globe size={11} />} />
          <InfoBlock label="playit.gg" value={server.playit ? 'Ativado' : 'Desligado'} highlight={server.playit} />
          <InfoBlock label="Criado" value={new Date(server.createdAt).toLocaleDateString('pt-BR')} icon={<Calendar size={11} />} />
        </div>

        {/* Right panel — console */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Console area */}
          <div className="flex-1 overflow-auto bg-[#080808] p-5 font-mono text-xs leading-5">
            {logs.length === 0 ? (
              <div className="flex items-center gap-2 text-zinc-700 mt-2">
                <Circle size={6} />
                <span>Aguardando o servidor iniciar...</span>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`${logColor(log.type)} whitespace-pre-wrap break-all`}>
                  {log.text}
                </div>
              ))
            )}
            <div ref={logsEnd} />
          </div>

          {/* Command input */}
          <form
            onSubmit={handleCmd}
            className="flex items-center gap-3 px-5 py-3 border-t border-white/[0.06] bg-[#0a0a0a]"
          >
            <span className="text-brand-500 font-mono text-sm shrink-0">$</span>
            <input
              value={cmd}
              onChange={e => setCmd(e.target.value)}
              disabled={!running}
              placeholder={running ? 'Digite um comando do servidor...' : 'Inicie o servidor para enviar comandos'}
              className="flex-1 bg-transparent text-sm font-mono text-white placeholder-zinc-700 focus:outline-none disabled:cursor-not-allowed"
            />
            {running && cmd && (
              <button type="submit" className="text-xs text-brand-500 hover:text-brand-400 font-medium shrink-0">
                Enter ↵
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.04]">
      <div className={`flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider ${highlight ? 'text-brand-500' : 'text-zinc-600'}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-xs font-semibold font-mono ${highlight ? 'text-brand-300' : 'text-zinc-300'}`}>{value}</p>
    </div>
  )
}
