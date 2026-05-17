import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, FolderOpen, Wifi, WifiOff, Puzzle,
  RefreshCw, ChevronLeft, Copy, Check, AlertTriangle,
  Server, Terminal, Settings, Shield, Circle
} from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'
import ServerSettings from './ServerSettings'
import WhitelistManager from './WhitelistManager'

const isElectron = typeof window !== 'undefined' && !!window.electron

type Tab = 'console' | 'settings' | 'whitelist'

interface Props { navigate: (p: Page) => void }

export default function ServerDetail({ navigate }: Props) {
  const { servers, runningIds, selectedId, markRunning, markStopped, updateServer } = useServerStore()
  const server = servers.find(s => s.id === selectedId)
  const running = selectedId ? runningIds.has(selectedId) : false

  const [logs, setLogs] = useState<{ text: string; type: 'info' | 'warn' | 'error' | 'cmd' }[]>([])
  const [cmd, setCmd] = useState('')
  const [tab, setTab] = useState<Tab>('console')
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

    window.electron.on('server-log', ({ id, line }: any) => {
      if (id !== selectedId) return
      const text = line.trimEnd()
      if (!text) return
      if (text.includes('Java não encontrado')) setJavaError(true)
      const type = text.includes('ERROR') || text.includes('SEVERE') ? 'error'
        : text.includes('WARN') ? 'warn' : 'info'
      setLogs(l => [...l.slice(-800), { text, type }])
    })
    window.electron.on('server-stopped', ({ id }: any) => {
      if (id === selectedId) { markStopped(id); addLog('── Servidor parado ──', 'warn') }
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

  useEffect(() => { logsEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  const addLog = (text: string, type: 'info' | 'warn' | 'error' | 'cmd' = 'info') =>
    setLogs(l => [...l, { text, type }])

  if (!server) return null

  const handleStart = async () => {
    if (!isElectron) return
    addLog('── Iniciando servidor... ──')
    const res = await window.electron.startServer(server.id)
    if (res.ok) markRunning(server.id)
    else { addLog(`Erro: ${res.error}`, 'error'); if (res.error?.includes('Java')) setJavaError(true) }
  }

  const handleStop = async () => {
    if (!isElectron) return
    addLog('── Enviando stop... ──', 'warn')
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
    window.electron.on('create-progress', ({ msg }: any) => addLog(`[UPDATE] ${msg}`))
    const res = await window.electron.updateServer(selectedId)
    if (res.ok) { updateServer(selectedId, { version: res.newVersion }); setUpdateAvail(null) }
    else addLog(`Erro: ${res.error}`, 'error')
    setUpdating(false)
  }

  const logColor = (type: string) => {
    if (type === 'error') return 'text-red-400'
    if (type === 'warn') return 'text-amber-400/90'
    if (type === 'cmd') return 'text-brand-300'
    return 'text-slate-400'
  }

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'console',   icon: <Terminal size={13} />,  label: 'Console'    },
    { id: 'settings',  icon: <Settings size={13} />,  label: 'Config'     },
    { id: 'whitelist', icon: <Shield size={13} />,    label: 'Whitelist'  },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-7 pb-4 border-b border-dark-600 bg-dark-900/50">
        <button onClick={() => navigate('dashboard')} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.05] transition-colors">
          <ChevronLeft size={17} />
        </button>

        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${running ? 'bg-brand-400/20' : 'bg-dark-700'}`}>
          <Server size={14} className={running ? 'text-brand-400' : 'text-slate-600'} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white truncate">{server.name}</h1>
            {running && (
              <span className="flex items-center gap-1 text-[10px] text-brand-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />ONLINE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600">{server.type} {server.version} · :{server.port} · {server.ram >= 1024 ? `${server.ram/1024}GB` : `${server.ram}MB`}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {updateAvail && !running && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleUpdate}
              disabled={updating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-400/20 transition-colors"
            >
              <RefreshCw size={11} className={updating ? 'animate-spin' : ''} />
              → {updateAvail.latestVersion}
            </motion.button>
          )}

          <button
            onClick={handlePlayit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
              ${playitRunning
                ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
                : 'bg-dark-700 border-dark-600 text-slate-500 hover:text-white hover:border-dark-500'
              }`}
          >
            {playitRunning ? <Wifi size={12} /> : <WifiOff size={12} />}
            playit.gg
          </button>

          <button onClick={() => isElectron && window.electron.openServerFolder(server.id)}
            className="p-1.5 rounded-lg bg-dark-700 border border-dark-600 text-slate-500 hover:text-white transition-colors" title="Pasta">
            <FolderOpen size={13} />
          </button>
          <button onClick={() => { useServerStore.getState().setSelected(server.id); navigate('plugins') }}
            className="p-1.5 rounded-lg bg-dark-700 border border-dark-600 text-slate-500 hover:text-white transition-colors" title="Plugins">
            <Puzzle size={13} />
          </button>

          {running ? (
            <button onClick={handleStop}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors">
              <Square size={11} strokeWidth={3} /> Parar
            </button>
          ) : (
            <button onClick={handleStart}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-500/20">
              <Play size={11} strokeWidth={3} /> Iniciar
            </button>
          )}
        </div>
      </div>

      {/* playit address bar */}
      <AnimatePresence>
        {playitAddr && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-5 py-2.5 bg-brand-400/8 border-b border-brand-400/20 overflow-hidden"
          >
            <Wifi size={13} className="text-brand-400 shrink-0" />
            <span className="text-xs font-mono text-slate-300 flex-1">{playitAddr}</span>
            <button onClick={() => { navigator.clipboard.writeText(playitAddr); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
              className="text-slate-500 hover:text-white transition-colors">
              {copied ? <Check size={12} className="text-brand-400" /> : <Copy size={12} />}
            </button>
          </motion.div>
        )}
        {javaError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/8 border-b border-red-500/20 overflow-hidden"
          >
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <p className="text-xs text-slate-400">Java não encontrado — instale <span className="text-brand-300 font-medium">Java 25 (Adoptium)</span> e clique em verificar novamente na tela inicial</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-5 pt-3 pb-0 border-b border-dark-600">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors rounded-t-lg
              ${tab === t.id ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {t.icon}
            {t.label}
            {tab === t.id && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === 'console' && (
            <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
              <div className="flex-1 overflow-auto p-5 font-mono text-xs leading-5 bg-dark-950">
                {logs.length === 0 ? (
                  <div className="flex items-center gap-2 text-slate-700 mt-2">
                    <Circle size={5} />Aguardando início do servidor...
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`${logColor(log.type)} whitespace-pre-wrap break-all`}>{log.text}</div>
                  ))
                )}
                <div ref={logsEnd} />
              </div>
              <form onSubmit={handleCmd} className="flex items-center gap-3 px-5 py-3 border-t border-dark-600 bg-dark-900">
                <span className="text-brand-400 font-mono font-bold">$</span>
                <input
                  value={cmd}
                  onChange={e => setCmd(e.target.value)}
                  disabled={!running}
                  placeholder={running ? 'Enviar comando ao servidor...' : 'Servidor parado'}
                  className="flex-1 bg-transparent text-sm font-mono text-white placeholder-slate-700 focus:outline-none disabled:cursor-not-allowed"
                />
                {running && cmd && <span className="text-[10px] text-brand-500 font-bold">Enter ↵</span>}
              </form>
            </motion.div>
          )}

          {tab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-hidden">
              <ServerSettings serverId={server.id} serverType={server.type} />
            </motion.div>
          )}

          {tab === 'whitelist' && (
            <motion.div key="whitelist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-hidden">
              <WhitelistManager serverId={server.id} serverType={server.type} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
