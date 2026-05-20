import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Square, FolderOpen, Wifi, WifiOff, Puzzle,
  RefreshCw, ChevronLeft, Copy, Check, AlertTriangle,
  Server, Terminal, Settings, Shield, Circle, Loader2,
  Sparkles, Code2
} from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import type { Page } from '../../App'
import ServerSettings from './ServerSettings'
import WhitelistManager from './WhitelistManager'
import PluginBrowser from '../plugins/PluginBrowser'
import { useT, getLang } from '../../i18n'
import { translateLog, rawLogType } from '../../utils/logTranslator'

const isElectron = typeof window !== 'undefined' && !!window.electron

type Tab = 'console' | 'plugins' | 'settings' | 'whitelist'

interface Props { navigate: (p: Page) => void }

export default function ServerDetail({ navigate }: Props) {
  const t = useT()
  const { servers, runningIds, selectedId, markRunning, markStopped, updateServer, activeTab, setActiveTab } = useServerStore()
  const server = servers.find(s => s.id === selectedId)
  const running = selectedId ? runningIds.has(selectedId) : false

  const [logs, setLogs] = useState<{ text: string; type: 'info' | 'warn' | 'error' | 'cmd' }[]>([])
  const [friendlyMode, setFriendlyMode] = useState(true) // translate logs by default
  const [cmd, setCmd] = useState('')
  const tab = activeTab
  const setTab = (newTab: Tab) => setActiveTab(newTab)
  const [playitInstalled, setPlayitInstalled] = useState(false)
  const [playitLoading, setPlayitLoading] = useState(false)
  const [updateAvail, setUpdateAvail] = useState<{ latestVersion: string } | null>(null)
  const [updating, setUpdating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [javaError, setJavaError] = useState(false)
  const logsEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isElectron || !selectedId) return
    setLogs([])
    setPlayitInstalled(false)
    setPlayitLoading(false)
    setJavaError(false)
    setUpdateAvail(null)

    const onLog = ({ id, text, line }: any) => {
      if (id !== selectedId) return
      const trimmed = ((text ?? line) ?? '').trimEnd()
      if (!trimmed) return
      if (trimmed.includes('Java não encontrado')) setJavaError(true)
      const type = rawLogType(trimmed)
      setLogs(l => [...l.slice(-800), { text: trimmed, type }])
    }
    const onStopped = ({ id }: any) => {
      if (id === selectedId) { markStopped(id); addLog(t.serverStopped, 'warn') }
    }
    window.electron.on('server-log', onLog)
    window.electron.on('server-stopped', onStopped)

    window.electron.checkUpdate(selectedId).then((r: any) => {
      if (r.hasUpdate) setUpdateAvail({ latestVersion: r.latestVersion })
    })
    window.electron.checkPlayitPlugin?.(selectedId).then((r: any) => {
      if (r?.installed) setPlayitInstalled(true)
    })

    // Cleanup listeners when component unmounts or selectedId changes
    return () => {
      window.electron.off?.('server-log', onLog)
      window.electron.off?.('server-stopped', onStopped)
    }
  }, [selectedId])

  useEffect(() => { logsEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  const addLog = (text: string, type: 'info' | 'warn' | 'error' | 'cmd' = 'info') =>
    setLogs(l => [...l, { text, type }])

  if (!server) return null

  const handleStart = async () => {
    if (!isElectron) return
    addLog(t.serverStarting)
    const res = await window.electron.startServer(server.id)
    if (res.ok) markRunning(server.id)
    else { addLog(`${t.error}: ${res.error}`, 'error'); if (res.error?.includes('Java')) setJavaError(true) }
  }

  const handleStop = async () => {
    if (!isElectron) return
    addLog(t.sendingStop, 'warn')
    await window.electron.stopServer(server.id)
  }

  const handleCmd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cmd.trim() || !isElectron) return
    window.electron.sendCommand(server.id, cmd.trim())
    addLog(`> ${cmd.trim()}`, 'cmd')
    setCmd('')
  }

  // playit.gg: install the Minecraft plugin (JAR) into plugins/ folder
  // After install, user needs to restart the server — the plugin handles the tunnel inside the JVM.
  const handlePlayit = async () => {
    if (!isElectron || playitLoading) return
    setPlayitLoading(true)
    addLog('── Baixando plugin playit.gg... ──')
    const res = await window.electron.installPlayitPlugin?.(server.id)
    setPlayitLoading(false)
    if (!res?.ok) {
      addLog(`Erro ao instalar playit.gg: ${res?.error ?? 'erro desconhecido'}`, 'error')
      return
    }
    if (res.alreadyInstalled) {
      addLog('── Plugin playit.gg já está instalado! Use /playit no servidor. ──')
    } else {
      setPlayitInstalled(true)
      addLog('── Plugin playit.gg instalado! Reinicie o servidor e use /playit in-game ──')
    }
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

  const lang = getLang()

  const logColor = (type: string) => {
    if (type === 'error') return 'text-red-400'
    if (type === 'warn') return 'text-amber-400/90'
    if (type === 'cmd') return 'text-brand-300'
    if (type === 'success') return 'text-green-400'
    if (type === 'player') return 'text-sky-300'
    return 'text-slate-400'
  }

  // In friendly mode: translate and filter logs
  const friendlyLogs = logs.reduce<{ text: string; emoji: string; type: string }[]>((acc, log) => {
    if (log.type === 'cmd') {
      acc.push({ text: log.text, emoji: '⌨️', type: 'cmd' })
      return acc
    }
    const friendly = translateLog(log.text, lang)
    if (friendly) acc.push(friendly)
    return acc
  }, [])

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'console',   icon: <Terminal size={13} />,  label: t.console    },
    { id: 'plugins',   icon: <Puzzle size={13} />,    label: t.nav_plugins },
    { id: 'settings',  icon: <Settings size={13} />,  label: t.settings   },
    { id: 'whitelist', icon: <Shield size={13} />,    label: t.whitelist  },
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
            disabled={playitLoading || playitInstalled}
            title={playitInstalled
              ? 'Plugin playit.gg instalado — use /playit no servidor para ativar o túnel'
              : 'Instalar plugin playit.gg para jogar com amigos sem abrir portas'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
              ${playitInstalled
                ? 'bg-brand-500/15 border-brand-500/30 text-brand-300 cursor-default'
                : playitLoading
                  ? 'bg-dark-700 border-brand-500/30 text-brand-400 cursor-wait'
                  : 'bg-dark-700 border-dark-600 text-slate-500 hover:text-white hover:border-dark-500'
              }`}
          >
            {playitLoading
              ? <Loader2 size={12} className="animate-spin" />
              : playitInstalled ? <Wifi size={12} /> : <WifiOff size={12} />}
            {playitLoading ? 'Instalando...' : playitInstalled ? 'PlayIt.gg ✓' : 'PlayIt.gg'}
          </button>

          <button onClick={() => isElectron && window.electron.openServerFolder(server.id)}
            className="p-1.5 rounded-lg bg-dark-700 border border-dark-600 text-slate-500 hover:text-white transition-colors" title="Pasta">
            <FolderOpen size={13} />
          </button>
          <button onClick={() => setTab('plugins')}
            className={`p-1.5 rounded-lg border transition-colors
              ${tab === 'plugins'
                ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
                : 'bg-dark-700 border-dark-600 text-slate-500 hover:text-white'
              }`}
            title="Plugins"
          >
            <Puzzle size={13} />
          </button>

          {running ? (
            <button onClick={handleStop}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors">
              <Square size={11} strokeWidth={3} /> {t.stop}
            </button>
          ) : (
            <button onClick={handleStart}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-brand-500/20">
              <Play size={11} strokeWidth={3} /> {t.start}
            </button>
          )}
        </div>
      </div>

      {/* Info bars */}
      <AnimatePresence>
        {playitInstalled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-5 py-2.5 bg-brand-400/8 border-b border-brand-400/15 overflow-hidden"
          >
            <Wifi size={13} className="text-brand-400 shrink-0" />
            <span className="text-xs text-slate-400">Plugin <span className="text-brand-300 font-semibold">PlayIt.gg</span> instalado — inicie o servidor e use <span className="font-mono text-brand-300">/playit</span> para criar o túnel gratuito</span>
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
              {/* Console toolbar */}
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-dark-700 bg-dark-900/80">
                {/* Left: friendly mode toggle — always visible */}
                <button
                  onClick={() => setFriendlyMode(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all
                    ${friendlyMode
                      ? 'bg-brand-500/15 border-brand-500/25 text-brand-300'
                      : 'bg-dark-700 border-dark-600 text-slate-500 hover:text-slate-300'
                    }`}
                  title={friendlyMode
                    ? (lang === 'en' ? 'Click to see raw technical logs' : 'Clique para ver logs técnicos brutos')
                    : (lang === 'en' ? 'Click to see friendly logs' : 'Clique para ver logs amigáveis')
                  }
                >
                  {friendlyMode
                    ? <><Sparkles size={9} />{lang === 'en' ? 'Friendly' : 'Traduzido'}</>
                    : <><Code2 size={9} />{lang === 'en' ? 'Technical' : 'Técnico'}</>
                  }
                </button>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-700 font-mono mr-2">
                    {friendlyMode ? friendlyLogs.length : logs.length} {t.consoleLines}
                  </span>
                  <button
                    onClick={() => {
                      const text = logs.map(l => l.text).join('\n')
                      navigator.clipboard.writeText(text)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1800)
                    }}
                    disabled={logs.length === 0}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-colors disabled:opacity-30"
                    title="Copiar todos os logs"
                  >
                    {copied ? <Check size={10} className="text-brand-400" /> : <Copy size={10} />}
                    {copied ? t.copied : t.copyAll}
                  </button>
                  <button
                    onClick={() => setLogs([])}
                    disabled={logs.length === 0}
                    className="px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-700 hover:text-slate-400 hover:bg-white/[0.04] transition-colors disabled:opacity-30"
                  >
                    {t.clear}
                  </button>
                </div>
              </div>

              {/* Log area */}
              <div className="flex-1 overflow-auto p-5 font-mono text-xs leading-5 bg-dark-950 select-text cursor-text">
                {friendlyMode ? (
                  /* ── Friendly mode ── */
                  friendlyLogs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 mt-10 select-none text-center">
                      <span className="text-3xl">🎮</span>
                      <p className="text-slate-600 text-xs">
                        {lang === 'en'
                          ? 'Waiting for the server to start...'
                          : 'Aguardando o servidor iniciar...'}
                      </p>
                      <p className="text-slate-700 text-[10px]">
                        {lang === 'en'
                          ? 'Click the ⌨️ Technical button to see all raw logs'
                          : 'Clique no botão ⌨️ Técnico para ver todos os logs brutos'}
                      </p>
                    </div>
                  ) : (
                    friendlyLogs.map((log, i) => (
                      <div key={i} className={`flex items-start gap-2 py-0.5 ${logColor(log.type)}`}>
                        <span className="shrink-0 text-sm leading-5">{log.emoji}</span>
                        <span className="font-sans leading-5">{log.text}</span>
                      </div>
                    ))
                  )
                ) : (
                  /* ── Raw / Technical mode ── */
                  logs.length === 0 ? (
                    <div className="flex items-center gap-2 text-slate-700 mt-2 select-none">
                      <Circle size={5} />{t.noLogs}
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={`${logColor(log.type)} whitespace-pre-wrap break-all`}>{log.text}</div>
                    ))
                  )
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

          {tab === 'plugins' && (
            <motion.div key="plugins" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-hidden">
              <PluginBrowser />
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
