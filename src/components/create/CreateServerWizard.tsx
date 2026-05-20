import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Loader2, Server, Zap, Shield, Globe, Lock, UserCheck, Layers, Gamepad2 } from 'lucide-react'
import type { Page } from '../../App'
import type { ServerType } from '../../types'
import { PRESET_PLUGINS } from '../../data/presetPlugins'
import { GAME_PRESETS, type GamePreset } from '../../data/gamePresets'
import GameModeSelector from './GameModeSelector'
import { useServerStore } from '../../store/serverStore'

const isElectron = typeof window !== 'undefined' && !!window.electron

const FALLBACK_VERSIONS: Record<string, string[]> = {
  paper: [
    '26.1.2','26.1.1','26.1.0','26.0.3','26.0.2','26.0.1','26.0.0',
    '1.21.5','1.21.4','1.21.3','1.21.2','1.21.1','1.21',
    '1.20.6','1.20.5','1.20.4','1.20.3','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.3','1.19.2','1.19.1','1.19',
    '1.18.2','1.18.1','1.18','1.17.1','1.17',
    '1.16.5','1.16.4','1.16.3','1.16.2','1.16.1',
    '1.15.2','1.15.1','1.15','1.14.4','1.14.3','1.14.2','1.14.1','1.14',
    '1.13.2','1.13.1','1.13','1.12.2','1.12.1','1.12',
    '1.11.2','1.11','1.10.2','1.9.4','1.8.8',
  ],
  purpur: [
    '26.1.2','26.1.1','26.1.0','26.0.3','26.0.2','26.0.1',
    '1.21.5','1.21.4','1.21.3','1.21.1','1.21',
    '1.20.6','1.20.4','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.3','1.19.2','1.19','1.18.2','1.18.1','1.18',
    '1.17.1','1.17','1.16.5','1.16.4',
  ],
  fabric: [
    '26.1.2','26.1.1','26.1.0',
    '1.21.5','1.21.4','1.21.3','1.21.2','1.21.1','1.21',
    '1.20.6','1.20.4','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.3','1.19.2','1.19','1.18.2','1.18.1','1.18',
    '1.17.1','1.17','1.16.5','1.16.4','1.16.3','1.16.1',
    '1.15.2','1.15','1.14.4','1.13.2',
  ],
  bedrock: [
    '1.21.60','1.21.51','1.21.50','1.21.44','1.21.40',
    '1.21.31','1.21.30','1.21.23','1.21.20',
    '1.21.0','1.20.81','1.20.80','1.20.73','1.20.70',
    '1.20.62','1.20.60','1.20.51','1.20.50',
  ],
  hybrid: [
    '26.1.2','26.1.1','26.1.0',
    '1.21.5','1.21.4','1.21.3','1.21.1','1.21',
    '1.20.6','1.20.4','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.2','1.19','1.18.2','1.18',
  ],
  vanilla: [
    '26.1.2','26.1.1','26.1.0','26.0.3','26.0.2','26.0.1','26.0.0',
    '1.21.5','1.21.4','1.21.3','1.21.2','1.21.1','1.21',
    '1.20.6','1.20.5','1.20.4','1.20.3','1.20.2','1.20.1','1.20',
    '1.19.4','1.19.3','1.19.2','1.19.1','1.19','1.18.2','1.18.1','1.18',
    '1.17.1','1.17','1.16.5','1.16.4','1.16.3','1.16.2','1.16.1',
    '1.15.2','1.15','1.14.4','1.14','1.13.2','1.13',
    '1.12.2','1.12','1.11.2','1.11','1.10.2','1.9.4','1.9','1.8.9',
  ],
}

const SERVER_TYPES = [
  {
    id: 'paper', label: 'Java — Paper',
    emoji: '📄', recommended: true,
    desc: 'Performance máxima + suporte a todos os plugins Bukkit/Spigot. Ideal para servidores de jogos.',
    color: 'text-amber-300', border: 'border-amber-400/40', glow: 'shadow-amber-400/10',
    gradient: 'from-amber-500/15 to-transparent',
    tag: 'Mais popular',
  },
  {
    id: 'purpur', label: 'Java — Purpur',
    emoji: '🔮', recommended: false,
    desc: 'Fork do Paper com centenas de configurações extras. Performance superior ao Paper.',
    color: 'text-violet-300', border: 'border-violet-400/40', glow: 'shadow-violet-400/10',
    gradient: 'from-violet-500/15 to-transparent',
    tag: 'Alto desempenho',
  },
  {
    id: 'vanilla', label: 'Java — Vanilla',
    emoji: '🌿', recommended: false,
    desc: 'Servidor oficial da Mojang. Sem plugins, jogo puro. Ótimo para survival com amigos.',
    color: 'text-slate-300', border: 'border-slate-400/40', glow: 'shadow-slate-400/10',
    gradient: 'from-slate-500/15 to-transparent',
    tag: 'Oficial Mojang',
  },
  {
    id: 'fabric', label: 'Java — Fabric',
    emoji: '🧵', recommended: false,
    desc: 'Ideal para mods técnicos e datapacks. Leve e altamente modular.',
    color: 'text-blue-300', border: 'border-blue-400/40', glow: 'shadow-blue-400/10',
    gradient: 'from-blue-500/15 to-transparent',
    tag: 'Para modders',
  },
  {
    id: 'bedrock', label: 'Bedrock (PowerNukkit)',
    emoji: '🪨', recommended: false,
    desc: 'Servidor Bedrock em Java. Suporta mobile (iOS/Android), console e Windows 10/11.',
    color: 'text-orange-300', border: 'border-orange-400/40', glow: 'shadow-orange-400/10',
    gradient: 'from-orange-500/15 to-transparent',
    tag: 'Mobile/Console',
  },
  {
    id: 'hybrid', label: 'Java + Bedrock (Geyser)',
    emoji: '⚡', recommended: false,
    desc: 'Servidor Java com GeyserMC: jogadores Java e Bedrock (mobile/console) no mesmo servidor.',
    color: 'text-brand-300', border: 'border-brand-400/40', glow: 'shadow-brand-400/10',
    gradient: 'from-brand-400/15 to-transparent',
    tag: 'Melhor dos dois mundos',
  },
] as const

const STEPS = ['Tipo', 'Versão', 'Config', 'Plugins']

interface Props { navigate: (p: Page) => void; quickSetup?: boolean }

type WizardMode = 'choose' | 'manual' | 'gamemode'

// RAM reserved for the host machine (NOT given to the server)
function calcOverhead(gaming: boolean, voice: boolean): number {
  let overhead = 1024          // OS baseline (1 GB)
  if (gaming) overhead += 3072 // Minecraft client + GPU (~3 GB)
  if (voice)  overhead += 512  // Discord / Spotify
  return overhead
}

// How much RAM the Minecraft server itself needs for a given player count
const PLAYER_RAM: Record<string, number> = {
  small:  2048,  // 2–5   players → 2 GB (1 GB was barely enough; Paper + plugins needs 2 GB)
  medium: 4096,  // 6–15  players → 4 GB
  large:  6144,  // 16–30 players → 6 GB
  huge:   10240, // 30+   players → 10 GB
}

function calcRecommendedRam(
  totalMb: number,
  gaming: boolean,
  voice: boolean,
  players: 'small'|'medium'|'large'|'huge'
): number {
  if (totalMb < 512) return 512

  const overhead    = calcOverhead(gaming, voice)
  const wantedByMC  = PLAYER_RAM[players]               // what the server needs
  const freeForSrv  = Math.max(512, totalMb - overhead) // what's left after host apps
  const maxAllowed  = Math.floor(totalMb * 0.75 / 512) * 512 // hard 75% cap

  // Give the server what it needs — but never more than what's actually free
  const raw = Math.min(wantedByMC, freeForSrv)
  return Math.max(512, Math.min(maxAllowed, Math.round(raw / 512) * 512))
}

export default function CreateServerWizard({ navigate, quickSetup: _quickSetup = false }: Props) {
  const { setServers, setSelected, setActiveTab } = useServerStore()
  // 'choose' = show mode selection; 'manual' = step wizard; 'gamemode' = game mode grid
  const [mode, setMode] = useState<WizardMode>('choose')
  const [step, setStep] = useState(0)
  const [type, setType] = useState<ServerType>('purpur')
  const [versions, setVersions] = useState<string[]>([])
  const [version, setVersion] = useState('')
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [name, setName] = useState('')
  const [ram, setRam] = useState(2048)  // 2 GB default; updated by getSystemRam on mount
  const [port, setPort] = useState(25565)
  const [plugins, setPlugins] = useState(PRESET_PLUGINS.map(p => ({ ...p })))
  const [offlineMode, setOfflineMode] = useState(false)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null)
  const [showOptional, setShowOptional] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [systemRam, setSystemRam] = useState<number>(0) // total MB
  const [gamingMode, setGamingMode] = useState(false)    // playing MC same PC
  const [voiceApp, setVoiceApp] = useState(false)        // Discord/Spotify open
  const [playerCount, setPlayerCount] = useState<'small'|'medium'|'large'|'huge'>('small')
  const [manualRam, setManualRam] = useState(false)

  // Fetch system RAM on mount so it's ready for both wizard and preset create
  useEffect(() => {
    if (!isElectron) return
    window.electron.getSystemRam?.().then(({ totalMb }: { totalMb: number }) => {
      setSystemRam(totalMb)
      // Set smart default (will be refined when user picks player count at step 2)
      const rec = calcRecommendedRam(totalMb, false, false, 'small')
      setRam(rec)
    }).catch(() => {
      // Sane fallback if RAM detection fails
      setRam(2048)
    })
  }, [])

  // Focus name input after step animation completes (autoFocus breaks on Windows Electron)
  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 220)
      return () => clearTimeout(t)
    }
  }, [step])
  const [showChunkyModal, setShowChunkyModal] = useState(false)
  const [showPlayitModal, setShowPlayitModal] = useState(false)
  const [chunkyRadius, setChunkyRadius] = useState<number>(10)
  const [customRadius, setCustomRadius] = useState(10)
  const [chunkyPreset, setChunkyPreset] = useState<'small'|'medium'|'large'|'huge'|'custom'>('medium')
  const [hybridInfoOpen, setHybridInfoOpen] = useState(false)
  // Pending game mode create — set when user picks a preset, waiting for PlayIt decision
  const [pendingPresetCreate, setPendingPresetCreate] = useState<{ preset: GamePreset; serverName: string } | null>(null)

  // Derived plugin buckets (based on static flags, not stateful enabled)
  const corePlugins    = plugins.filter(p => !p.silent && !p.offlineOnly && PRESET_PLUGINS.find(pp => pp.name === p.name)?.enabled)
  const optionalPlugins = plugins.filter(p => !p.silent && !p.offlineOnly && !PRESET_PLUGINS.find(pp => pp.name === p.name)?.enabled)
  const offlinePlugins  = plugins.filter(p => p.offlineOnly)
  const silentPlugins   = plugins.filter(p => p.silent)

  const fetchVersions = (t: ServerType) => {
    setLoadingVersions(true)
    setVersion('')
    const fn = isElectron
      ? window.electron.getVersions
      : (type: string) => Promise.resolve(FALLBACK_VERSIONS[type] || FALLBACK_VERSIONS.paper)
    fn(t).then(v => {
      const list = v.length ? v : (FALLBACK_VERSIONS[t] || FALLBACK_VERSIONS.paper)
      setVersions(list)
      setVersion(list[0] || '')
      setLoadingVersions(false)
    })
  }

  useEffect(() => { fetchVersions(type) }, [type])

  useEffect(() => {
    if (!isElectron) return
    const onProgress = ({ msg }: { msg: string }) => {
      setProgress(p => [...p, msg])
      if (msg.includes('sucesso')) setDone(true)
    }
    window.electron.on('create-progress', onProgress)
    return () => window.electron.off?.('create-progress', onProgress)
  }, [])

  const togglePlugin = (name: string) => {
    setPlugins(ps => ps.map(p => p.name === name ? { ...p, enabled: !p.enabled } : p))
  }

  const handleOfflineToggle = (v: boolean) => {
    setOfflineMode(v)
  }

  const handleCreate = async (radius: number | null, nameOverride?: string) => {
    const effectiveName = nameOverride ?? name
    if (!effectiveName.trim() || !version) return
    setShowChunkyModal(false)
    setCreating(true)
    setProgress([])
    setDone(false)

    // If user chose a Chunky radius, force-enable Chunky in the install list
    const chunkyPlugin = PRESET_PLUGINS.find(p => p.name === 'Chunky')
    const pluginsWithChunky = radius !== null && chunkyPlugin
      ? plugins.map(p => p.name === 'Chunky' ? { ...p, enabled: true } : p)
      : plugins

    const coreList    = pluginsWithChunky.filter(p => !p.silent && !p.offlineOnly && PRESET_PLUGINS.find(pp => pp.name === p.name)?.enabled)
    const optList     = pluginsWithChunky.filter(p => !p.silent && !p.offlineOnly && !PRESET_PLUGINS.find(pp => pp.name === p.name)?.enabled)

    const toInstall = [
      // silent: always included
      ...silentPlugins,
      // offline-only: only if offline mode
      ...(offlineMode ? offlinePlugins : []),
      // core + optional: only if enabled
      ...coreList.filter(p => p.enabled),
      ...optList.filter(p => p.enabled),
    ]
    const selectedPlugins = toInstall.map(p => ({ name: p.name, url: p.url, filename: p.filename, modrinthSlug: p.modrinthSlug }))
    const res = isElectron
      ? await window.electron.createServer({ name: effectiveName.trim(), type, version, ram, port, plugins: selectedPlugins, offlineMode, chunkyRadius: radius })
      : { ok: true, server: { id: Date.now().toString(), name: effectiveName.trim(), type, version, ram, port, dir: '', createdAt: Date.now(), playit: false } }

    if (res.ok) {
      const updated = isElectron ? await window.electron.getServers() : [res.server]
      setServers(updated)
      setSelected(res.server.id)
      setActiveTab('console')
      setLastCreatedId(res.server.id)
    } else {
      setCreating(false)
      setProgress([])
      alert(`Erro: ${(res as any).error ?? 'erro desconhecido'}`)
    }
  }

  const onClickCreate = () => {
    if (!name.trim()) return
    if (type === 'bedrock') {
      handleCreate(null)       // bedrock: straight to create (no PlayIt/Chunky)
    } else {
      setShowPlayitModal(true) // always ask about PlayIt for Java/Fabric/etc
    }
  }

  // ── Game Preset create ─────────────────────────────────────────────────────
  const handlePresetCreate = async (preset: GamePreset, serverName: string, includePlayit = false) => {
    setCreating(true)
    setMode('manual') // use the creating overlay from manual mode

    // Use purpur for game modes (better performance than paper)
    const serverType = preset.type || 'purpur'
    const versions = await (isElectron
      ? window.electron.getVersions(serverType)
      : Promise.resolve(['1.21.5', '1.21.4']))
    const version = versions[0] || '1.21.5'

    // Smart RAM — prefer already-fetched systemRam, otherwise refetch
    let ramMb = systemRam > 0
      ? calcRecommendedRam(systemRam, false, false, 'medium')
      : 2048
    if (!systemRam && isElectron) {
      try {
        const { totalMb } = await window.electron.getSystemRam?.() ?? { totalMb: 4096 }
        ramMb = calcRecommendedRam(totalMb, false, false, 'medium')
      } catch {}
    }

    const authMePlugin = { name: 'AuthMe', filename: 'AuthMe.jar', url: 'https://github.com/AuthMe/AuthMeReloaded/releases/latest/download/AuthMe.jar' }
    const skinsPlugin = { name: 'SkinsRestorer', filename: 'SkinsRestorer.jar', url: 'https://github.com/SkinsRestorer/SkinsRestorer/releases/latest/download/SkinsRestorer.jar' }
    const extraPlugins = [authMePlugin, skinsPlugin]
    const basePlugins = includePlayit
        ? [...preset.plugins, ...extraPlugins, { name: 'PlayIt.gg', filename: 'playit-minecraft.jar', modrinthSlug: 'playit', url: 'https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft.jar' }]
        : [...preset.plugins, ...extraPlugins]
    const seen = new Set<string>()
    const pluginList = basePlugins.filter(p => {
      if (seen.has(p.filename)) return false
      seen.add(p.filename)
      return true
    })

    const progressHandler = ({ msg }: any) => setProgress(p => [...p, msg])
    if (isElectron) window.electron.on('create-progress', progressHandler)

    const res = isElectron
      ? await window.electron.createServer({
          name: serverName,
          type: serverType as any,
          version,
          ram: ramMb,
          port: 25565,
          plugins: pluginList,
          offlineMode: true,
          extraServerProperties: preset.serverProperties ?? {},
          gamePresetId: preset.id,
        })
      : { ok: true as const, server: { id: Date.now().toString(), name: serverName, type: serverType as any, version, ram: ramMb, port: 25565, dir: '', createdAt: Date.now(), playit: false }, error: undefined }

    if (isElectron) window.electron.off('create-progress', progressHandler)

    if (res.ok) {
      setDone(true)
      const updated = isElectron ? await window.electron.getServers() : [res.server]
      setServers(updated)
      setSelected(res.server.id)
      setActiveTab('console')
      setLastCreatedId(res.server.id)
    } else {
      setCreating(false)
      setProgress([])
      alert(`Erro: ${(res as any).error ?? 'erro desconhecido'}`)
    }
  }

  const selectedTypeMeta = SERVER_TYPES.find(t => t.id === type)!
  const canNext = step === 0 || (step === 1 && !!version) || (step === 2 && !!name.trim()) || step === 3

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-dark bg-grid opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Game Mode Selector — fullscreen overlay, same treatment as choose screen */}
      {mode === 'gamemode' && !creating && (
        <div className="absolute inset-0 z-40">
          <GameModeSelector
            onSelect={(preset, serverName) => {
              // Don't create immediately — show PlayIt modal first
              setPendingPresetCreate({ preset, serverName })
              setShowPlayitModal(true)
            }}
            onBack={() => setMode('choose')}
          />
        </div>
      )}

      {/* Mode Choice Screen */}
      {mode === 'choose' && !showPlayitModal && !showChunkyModal && !creating && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8 py-10 bg-[#08080e]/98 backdrop-blur-xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col items-center max-w-md w-full">
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-black text-white tracking-tight">Criar servidor</h2>
              <p className="text-slate-500 text-sm mt-2">Escolha como quer configurar</p>
            </motion.div>

            <div className="flex flex-col gap-3 w-full">
              {/* Quick Setup → Game Mode grid */}
              <motion.button
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                onClick={() => setMode('gamemode')}
                className="group text-left p-5 rounded-2xl bg-brand-500/10 border-2 border-brand-400/30 hover:border-brand-400/60 hover:bg-brand-500/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-400/20 border border-brand-400/30 flex items-center justify-center">
                    <Gamepad2 size={20} className="text-brand-400" />
                  </div>
                  <div>
                    <p className="text-white font-black text-base">🎮 Escolher Modo de Jogo</p>
                    <span className="text-[10px] font-bold text-brand-400 bg-brand-400/10 border border-brand-400/20 px-2 py-0.5 rounded-full">Recomendado</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Survival, Skyblock, OneBlock, KitPvP, SkyWars e mais — tudo pré-configurado, só jogar!
                </p>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {['🌿 Survival', '🏝️ Skyblock', '⬛ OneBlock', '💰 Ilha Eco', '🌌 SkyWars', '🥊 KitPvP'].map(m => (
                    <span key={m} className="text-[10px] px-2 py-0.5 bg-dark-700 border border-dark-600 text-slate-500 rounded-full">{m}</span>
                  ))}
                </div>
              </motion.button>

              {/* Manual card */}
              <motion.button
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.16 }}
                onClick={() => setMode('manual')}
                className="group text-left p-5 rounded-2xl bg-dark-800 border-2 border-dark-600 hover:border-slate-500/40 hover:bg-dark-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center">
                    <Server size={18} className="text-slate-400" />
                  </div>
                  <p className="text-white font-black text-base">⚙️ Configurar Manualmente</p>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Escolha o tipo de servidor, versão, plugins e RAM no detalhe.
                </p>
              </motion.button>
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 }}
              onClick={() => navigate('dashboard')}
              className="mt-6 text-sm text-dark-400 hover:text-slate-400 transition-colors"
            >
              ← Voltar
            </motion.button>
          </div>
        </div>
      )}


      {/* Wizard body — hidden when choose/gamemode overlays are active so they don't bleed through */}
      <div className={`relative flex flex-col h-full max-w-3xl mx-auto w-full px-8 py-8 ${(mode === 'choose' || mode === 'gamemode') && !creating ? 'invisible pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => mode === 'manual' ? setMode('choose') : navigate('dashboard')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Criar Servidor</h1>
            <p className="text-xs text-slate-600 mt-0.5">Configure seu servidor passo a passo</p>
          </div>

          {/* Steps */}
          <div className="ml-auto flex items-center gap-1.5">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300
                  ${i < step ? 'bg-brand-400/20 text-brand-400 border border-brand-400/30'
                    : i === step ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                    : 'bg-dark-700 text-slate-600 border border-dark-500'
                  }`}>
                  {i < step ? <Check size={9} strokeWidth={3} /> : <span className="text-[10px]">{i + 1}</span>}
                  {label}
                </div>
                {i < STEPS.length - 1 && <div className={`w-3 h-px ${i < step ? 'bg-brand-400/40' : 'bg-dark-500'} transition-colors`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">

            {/* Step 0: Type */}
            {step === 0 && (
              <StepWrap key="type">
                <h2 className="text-xl font-bold text-white mb-1.5">Qual tipo de servidor?</h2>
                <p className="text-sm text-slate-500 mb-5">Escolha baseado em quem vai jogar e o que quer fazer</p>
                <div className="grid grid-cols-2 gap-3">
                  {SERVER_TYPES.map(t => {
                    const active = type === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setType(t.id as ServerType); if (t.id === 'hybrid') setHybridInfoOpen(true) }}
                        className={`relative text-left p-4 rounded-2xl border overflow-hidden transition-all duration-200
                          ${active ? `${t.border} border shadow-lg ${t.glow}` : 'border-dark-500 bg-dark-800 hover:border-dark-400'}`}
                      >
                        {active && <div className={`absolute inset-0 bg-gradient-to-br ${t.gradient} pointer-events-none`} />}
                        <div className="relative">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{t.emoji}</span>
                              <div>
                                <p className={`font-bold text-sm leading-tight ${active ? t.color : 'text-slate-200'}`}>{t.label}</p>
                                <span className="text-[10px] text-slate-600 font-medium">{t.tag}</span>
                              </div>
                            </div>
                            {t.recommended && (
                              <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-brand-500/20 text-brand-300 border border-brand-400/30 rounded-full font-bold shrink-0">
                                <Zap size={8} />REC
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                          {active && (
                            <div className={`mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold ${t.color}`}>
                              <Check size={11} strokeWidth={3} /> Selecionado
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Hybrid info panel */}
                <AnimatePresence>
                  {type === 'hybrid' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-4 bg-brand-400/[0.05] border border-brand-400/20 rounded-2xl">
                        <button
                          onClick={() => setHybridInfoOpen(v => !v)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="text-sm font-bold text-brand-300">⚡ Como funciona o servidor Híbrido (Geyser)?</span>
                          <motion.span animate={{ rotate: hybridInfoOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronRight size={14} className="text-brand-400 rotate-90" />
                          </motion.span>
                        </button>
                        <AnimatePresence>
                          {hybridInfoOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 space-y-2 text-xs text-slate-400 leading-relaxed">
                                <p>O servidor roda normalmente em Java e o GeyserMC funciona como uma "ponte" que traduz o protocolo Bedrock em tempo real.</p>
                                <div className="space-y-1.5 mt-2">
                                  <div className="flex items-center gap-2 text-slate-300">
                                    <span className="font-mono text-[11px] bg-dark-700 border border-dark-500 px-2 py-0.5 rounded">Java</span>
                                    <span className="text-slate-500">→</span>
                                    <span>entram na porta <code className="text-brand-300 font-mono">25565</code> (normal)</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-300">
                                    <span className="font-mono text-[11px] bg-dark-700 border border-dark-500 px-2 py-0.5 rounded">Bedrock</span>
                                    <span className="text-slate-500">→</span>
                                    <span>celular, console, Win10 entram na porta <code className="text-orange-300 font-mono">19132</code></span>
                                  </div>
                                </div>
                                <div className="mt-3 p-2.5 bg-brand-400/[0.06] border border-brand-400/15 rounded-xl">
                                  <p className="text-brand-300 font-semibold text-[11px] mb-1">Com PlayIt.gg: ambas as portas são tuneladas automaticamente!</p>
                                  <p className="text-slate-500 text-[11px]">→ Java: <code className="text-brand-300">xxxx.playit.gg:25565</code></p>
                                  <p className="text-slate-500 text-[11px]">→ Bedrock: <code className="text-orange-300">xxxx.playit.gg:19132</code></p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </StepWrap>
            )}

            {/* Step 1: Version */}
            {step === 1 && (
              <StepWrap key="version">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{selectedTypeMeta.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">Versão do Minecraft</h2>
                    <p className="text-sm text-slate-500">{selectedTypeMeta.label} — {versions.length} versões disponíveis</p>
                  </div>
                </div>
                {loadingVersions ? (
                  <div className="flex items-center justify-center gap-2 text-slate-500 py-16">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Buscando versões...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2 max-h-96 overflow-auto pr-1">
                    {versions.map(v => (
                      <button
                        key={v}
                        onClick={() => setVersion(v)}
                        className={`py-2 px-1 rounded-xl border text-xs font-mono font-bold transition-all duration-150
                          ${version === v
                            ? `${selectedTypeMeta.border} bg-gradient-to-b ${selectedTypeMeta.gradient} ${selectedTypeMeta.color}`
                            : 'border-dark-500 bg-dark-800 text-slate-500 hover:border-dark-400 hover:text-slate-300'
                          }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </StepWrap>
            )}

            {/* Step 2: Config */}
            {step === 2 && (
              <StepWrap key="config">
                <h2 className="text-xl font-bold text-white mb-5">Configurações básicas</h2>
                <div className="space-y-5">
                  <Field label="Nome do servidor">
                    <input
                      ref={nameInputRef}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Survival dos Amigos"
                      className="w-full bg-dark-800 border border-dark-500 hover:border-brand-400/30 focus:border-brand-400/60 rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none text-sm font-medium transition-colors"
                    />
                  </Field>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">RAM do servidor</label>

                    {/* Smart questions */}
                    <div className="space-y-2 mb-3">

                      {/* Gaming toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const ng = !gamingMode
                          setGamingMode(ng)
                          if (!manualRam && systemRam > 0) setRam(calcRecommendedRam(systemRam, ng, voiceApp, playerCount))
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-all text-left
                          ${gamingMode ? 'border-brand-400/30 bg-brand-400/[0.06]' : 'border-dark-600 bg-dark-800 hover:border-dark-500'}`}
                      >
                        <span className={gamingMode ? 'text-brand-300 font-medium' : 'text-slate-400'}>🎮 Vou jogar Minecraft no mesmo PC</span>
                        <div className={`relative shrink-0 rounded-full transition-colors ${gamingMode ? 'bg-brand-500' : 'bg-dark-500'}`} style={{height: 18, width: 36}}>
                          <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${gamingMode ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                      </button>

                      {/* Voice app toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const nv = !voiceApp
                          setVoiceApp(nv)
                          if (!manualRam && systemRam > 0) setRam(calcRecommendedRam(systemRam, gamingMode, nv, playerCount))
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-all text-left
                          ${voiceApp ? 'border-brand-400/30 bg-brand-400/[0.06]' : 'border-dark-600 bg-dark-800 hover:border-dark-500'}`}
                      >
                        <span className={voiceApp ? 'text-brand-300 font-medium' : 'text-slate-400'}>🎙️ Discord / Spotify abertos</span>
                        <div className={`relative shrink-0 rounded-full transition-colors ${voiceApp ? 'bg-brand-500' : 'bg-dark-500'}`} style={{height: 18, width: 36}}>
                          <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${voiceApp ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                      </button>

                      {/* Player count */}
                      <div>
                        <p className="text-[10px] text-slate-600 font-semibold mb-1.5 px-0.5">Quantos jogadores ao mesmo tempo?</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {([
                            { id: 'small',  label: '2–5',   sub: '1 GB min' },
                            { id: 'medium', label: '6–15',  sub: '2 GB min' },
                            { id: 'large',  label: '16–30', sub: '4 GB min' },
                            { id: 'huge',   label: '30+',   sub: '8 GB min' },
                          ] as const).map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setPlayerCount(opt.id)
                                if (!manualRam && systemRam > 0) setRam(calcRecommendedRam(systemRam, gamingMode, voiceApp, opt.id))
                              }}
                              className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5
                                ${playerCount === opt.id
                                  ? 'border-brand-400/40 bg-brand-400/[0.08] text-brand-300'
                                  : 'border-dark-600 bg-dark-800 text-slate-500 hover:border-dark-500'}`}
                            >
                              <span className="text-xs font-bold">{opt.label}</span>
                              <span className={`text-[10px] font-mono ${playerCount === opt.id ? 'text-brand-400/70' : 'text-slate-700'}`}>{opt.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Result card */}
                    <div className={`rounded-xl border mb-2 overflow-hidden ${manualRam ? 'border-dark-500 bg-dark-800' : 'border-brand-400/25 bg-brand-400/[0.04]'}`}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide">
                            {manualRam ? 'Manual' : '✨ Recomendado para seu PC'}
                          </p>
                          <p className={`text-2xl font-black font-mono leading-tight ${manualRam ? 'text-slate-300' : 'text-brand-300'}`}>
                            {ram >= 1024 ? `${ram/1024}GB` : `${ram}MB`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !manualRam
                            setManualRam(next)
                            if (!next && systemRam > 0) setRam(calcRecommendedRam(systemRam, gamingMode, voiceApp, playerCount))
                          }}
                          className="text-[11px] text-slate-600 hover:text-slate-400 underline transition-colors"
                        >
                          {manualRam ? 'Usar recomendado' : 'Ajustar manual'}
                        </button>
                      </div>

                      {/* Breakdown — only shown in auto mode with known system RAM */}
                      {!manualRam && systemRam > 0 && (
                        <div className="px-4 pb-3 flex items-center gap-3 text-[10px] font-mono text-slate-700">
                          <span>💻 {Math.round(systemRam/1024)}GB total</span>
                          <span className="text-dark-500">─</span>
                          <span>{Math.round(calcOverhead(gamingMode, voiceApp)/1024)}GB reservado (SO{gamingMode ? ' + jogo' : ''}{voiceApp ? ' + Discord' : ''})</span>
                          <span className="text-dark-500">─</span>
                          <span className="text-brand-400/60">{ram >= 1024 ? `${ram/1024}GB` : `${ram}MB`} pro servidor ✓</span>
                        </div>
                      )}
                    </div>

                    {/* Manual slider */}
                    {manualRam && (
                      <div className="px-1 mb-1">
                        <input
                          type="range"
                          min={512}
                          max={systemRam > 0 ? Math.floor(systemRam * 0.85 / 512) * 512 : 16384}
                          step={512}
                          value={ram}
                          onChange={e => setRam(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-400 bg-dark-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-700 mt-1.5 font-mono font-bold">
                          <span>512MB</span>
                          <span>2GB</span>
                          <span>4GB</span>
                          <span>8GB</span>
                          {systemRam >= 12288 && <span>12GB</span>}
                          {systemRam >= 16384 && <span>16GB</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <Field label="Porta do servidor">
                    <input
                      type="number" min={1024} max={65535} value={port}
                      onChange={e => setPort(Number(e.target.value))}
                      className="w-full bg-dark-800 border border-dark-500 hover:border-brand-400/30 focus:border-brand-400/60 rounded-xl px-4 py-3 text-white focus:outline-none text-sm font-mono font-bold transition-colors"
                    />
                    <p className="text-xs text-slate-700 mt-1.5 font-medium">
                      {type === 'bedrock' || type === 'hybrid' ? 'Bedrock usa porta 19132 por padrão · Java usa 25565' : 'Padrão: 25565'}
                    </p>
                  </Field>

                  {(type === 'bedrock' || type === 'hybrid') && (
                    <div className="flex items-start gap-3 p-3.5 bg-orange-400/5 border border-orange-400/20 rounded-xl">
                      <Globe size={14} className="text-orange-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {type === 'hybrid'
                          ? 'Modo híbrido: jogadores Java conectam na porta Java (25565), Bedrock na porta 19132. GeyserMC e Floodgate serão instalados automaticamente.'
                          : 'PowerNukkit roda o protocolo Bedrock em Java. Compatível com Mac, Windows e Linux.'
                        }
                      </p>
                    </div>
                  )}

                  {/* Offline mode toggle — only for Java-based servers */}
                  {type !== 'bedrock' && (
                    <div>
                      <button
                        onClick={() => handleOfflineToggle(!offlineMode)}
                        className={`w-full flex items-center justify-between text-left px-4 py-3.5 rounded-xl border transition-all
                          ${offlineMode ? 'bg-amber-500/8 border-amber-500/30' : 'bg-dark-800 border-dark-500 hover:border-dark-400'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${offlineMode ? 'bg-amber-500/15 text-amber-400' : 'bg-dark-700 text-slate-500'}`}>
                            <Lock size={16} />
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${offlineMode ? 'text-amber-300' : 'text-slate-300'}`}>Modo offline (pirata)</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">Aceita jogadores sem Minecraft original</p>
                          </div>
                        </div>
                        <div className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${offlineMode ? 'bg-amber-500' : 'bg-dark-500'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${offlineMode ? 'left-5' : 'left-0.5'}`} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {offlineMode && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 p-3.5 bg-dark-800 border border-dark-600 rounded-xl space-y-2">
                              <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                                <UserCheck size={13} />
                                Auto-configurado para modo offline:
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Check size={10} className="text-green-400 shrink-0" strokeWidth={3} />
                                  <span><strong className="text-slate-200">AuthMe</strong> instalado e configurado</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Check size={10} className="text-green-400 shrink-0" strokeWidth={3} />
                                  <span><strong className="text-slate-200">SkinsRestorer</strong> para skins offline</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Check size={10} className="text-green-400 shrink-0" strokeWidth={3} />
                                  <span>Auto-login para quem tem <strong className="text-slate-200">jogo original</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Check size={10} className="text-green-400 shrink-0" strokeWidth={3} />
                                  <span>Pirata faz <strong className="text-slate-200">/register</strong> uma vez</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </StepWrap>
            )}

            {/* Step 3: Plugins */}
            {step === 3 && !creating && (
              <StepWrap key="plugins">
                <h2 className="text-xl font-bold text-white mb-1">Plugins pré-configurados</h2>
                <p className="text-sm text-slate-500 mb-4">Desative o que não precisar — tudo pode ser mudado depois</p>

                {type === 'bedrock' && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-orange-400/5 border border-orange-400/20 rounded-xl mb-4">
                    <Shield size={13} className="text-orange-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Servidores Bedrock (PowerNukkit) usam plugins NukkitX. Os plugins abaixo são para servidores Java.
                    </p>
                  </div>
                )}

                {/* Core plugins */}
                <div className="space-y-1.5">
                  {corePlugins.map(p => (
                    <PluginRow
                      key={p.name}
                      plugin={p}
                      disabled={type === 'bedrock'}
                      onToggle={() => togglePlugin(p.name)}
                    />
                  ))}
                </div>

                {/* Offline-only plugins */}
                <AnimatePresence>
                  {offlineMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Lock size={9} /> Modo offline
                      </p>
                      <div className="space-y-1.5">
                        {offlinePlugins.map(p => (
                          <PluginRow key={p.name} plugin={{ ...p, enabled: true }} disabled={false} locked onToggle={() => {}} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Silent plugins note */}
                <div className="flex items-center gap-2 mt-3 px-1">
                  <Zap size={11} className="text-brand-400 shrink-0" />
                  <p className="text-[11px] text-slate-600">
                    {silentPlugins.map(p => p.name).join(', ')} instalado{silentPlugins.length > 1 ? 's' : ''} automaticamente para melhorar a performance
                  </p>
                </div>

                {/* Optional plugins toggle */}
                <button
                  onClick={() => setShowOptional(v => !v)}
                  className="mt-4 w-full flex items-center justify-between px-4 py-2.5 bg-dark-800 border border-dark-600 hover:border-dark-500 rounded-xl text-sm transition-colors"
                >
                  <span className="text-slate-400 font-medium">
                    {showOptional ? 'Ocultar' : 'Ver'} plugins adicionais
                    <span className="ml-2 text-[11px] text-slate-600">({optionalPlugins.length} disponíveis)</span>
                  </span>
                  <motion.div animate={{ rotate: showOptional ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight size={14} className="text-slate-500 rotate-90" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showOptional && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 mt-2">
                        {optionalPlugins.map(p => (
                          <PluginRow
                            key={p.name}
                            plugin={p}
                            disabled={type === 'bedrock'}
                            onToggle={() => togglePlugin(p.name)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </StepWrap>
            )}

            {/* Creating */}
            {creating && (
              <StepWrap key="creating">
                <div className="flex flex-col items-center gap-6 py-12">
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-700
                    ${done ? 'bg-brand-400/20 shadow-xl shadow-brand-400/20' : 'bg-dark-700'}`}>
                    {done ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <Check size={40} className="text-brand-400" strokeWidth={2.5} />
                      </motion.div>
                    ) : (
                      <Loader2 size={40} className="text-brand-400 animate-spin" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-xl">{done ? 'Servidor pronto!' : 'Criando servidor...'}</p>
                    <p className="text-slate-400 text-sm mt-1">{progress[progress.length - 1] || 'Iniciando...'}</p>
                  </div>
                  <div className="w-full bg-dark-950 border border-dark-600 rounded-2xl p-4 max-h-48 overflow-auto font-mono text-xs text-slate-600 space-y-0.5">
                    {progress.map((line, i) => (
                      <div key={i} className={i === progress.length - 1 ? 'text-slate-300' : ''}>{line}</div>
                    ))}
                  </div>
                  {done && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (lastCreatedId) setSelected(lastCreatedId)
                          setActiveTab('console')
                          navigate('server')
                        }}
                        className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold transition-colors"
                      >
                        Abrir console
                      </button>
                      <button
                        onClick={() => {
                          setCreating(false)
                          setDone(false)
                          setProgress([])
                          setLastCreatedId(null)
                          setName('')
                          setStep(0)
                          setMode('choose')
                        }}
                        className="px-5 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500 text-slate-300 text-sm font-bold transition-colors"
                      >
                        Criar outro
                      </button>
                    </div>
                  )}
                </div>
              </StepWrap>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!creating && (
          <div className="flex items-center justify-between pt-5 mt-4 border-t border-dark-600">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : navigate('dashboard')}
              className="flex items-center gap-1.5 px-4 py-2 text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] rounded-xl text-sm font-semibold transition-colors"
            >
              <ChevronLeft size={15} />
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </button>
            {step < 3 ? (
              <button
                onClick={() => canNext && setStep(s => s + 1)}
                disabled={!canNext}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20"
              >
                Próximo <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={onClickCreate}
                disabled={!name.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-30 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20"
              >
                <Server size={15} /> Criar servidor
              </button>
            )}
          </div>
        )}
      </div>

      {/* PlayIt.gg Fullscreen Onboarding */}
      <AnimatePresence>
        {showPlayitModal && (
          <PlayItModal
            onUsePlayit={() => {
              setShowPlayitModal(false)
              if (pendingPresetCreate) {
                // Game mode flow: create directly with PlayIt included — no Chunky (void/flat worlds)
                handlePresetCreate(pendingPresetCreate.preset, pendingPresetCreate.serverName, true)
                setPendingPresetCreate(null)
              } else {
                // Manual wizard flow: enable PlayIt in plugins state → Chunky modal
                setPlugins(ps => ps.map(p => p.name === 'PlayIt.gg' ? { ...p, enabled: true } : p))
                setShowChunkyModal(true)
              }
            }}
            onSkipPlayit={() => {
              setShowPlayitModal(false)
              if (pendingPresetCreate) {
                // Game mode flow: create directly without PlayIt — no Chunky
                handlePresetCreate(pendingPresetCreate.preset, pendingPresetCreate.serverName, false)
                setPendingPresetCreate(null)
              } else {
                // Manual wizard flow: disable PlayIt → Chunky modal
                setPlugins(ps => ps.map(p => p.name === 'PlayIt.gg' ? { ...p, enabled: false } : p))
                setShowChunkyModal(true)
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Chunky Fullscreen Modal */}
      <AnimatePresence>
        {showChunkyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex flex-col bg-[#0a0a0d]/95 backdrop-blur-xl"
          >
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-400/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex-1 flex flex-col items-center justify-center px-8 py-10 max-w-2xl mx-auto w-full">

              {/* Icon */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="w-20 h-20 rounded-3xl bg-brand-400/15 border border-brand-400/30 flex items-center justify-center mb-6 shadow-2xl shadow-brand-400/10"
              >
                <Layers size={36} className="text-brand-400" />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-center mb-2"
              >
                <h2 className="text-3xl font-black text-white tracking-tight">Pré-carregar o mapa?</h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-md mx-auto">
                  O <strong className="text-white">Chunky</strong> gera os pedaços do mundo ao redor do spawn <em>antes</em> dos jogadores entrarem.
                  Resultado: <span className="text-white font-semibold">zero lag de terreno</span> quando alguém explora — o mapa já está pronto.
                  Roda em background e para sozinho quando terminar.
                </p>
              </motion.div>

              {/* Info strip */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-6 my-6 text-xs text-slate-500"
              >
                <span className="flex items-center gap-1.5"><Check size={11} className="text-brand-400" strokeWidth={3} /> Zero lag de geração</span>
                <span className="w-px h-3 bg-dark-500" />
                <span className="flex items-center gap-1.5"><Check size={11} className="text-brand-400" strokeWidth={3} /> Roda em background</span>
                <span className="w-px h-3 bg-dark-500" />
                <span className="flex items-center gap-1.5"><Check size={11} className="text-brand-400" strokeWidth={3} /> Para sozinho ao terminar</span>
              </motion.div>

              {/* Preset grid */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="w-full grid grid-cols-4 gap-2.5 mb-3"
              >
                {([
                  { id: 'small',  label: 'Pequeno',  radius: 5,  chunks: 121,   time: '~30 seg',  desc: 'Spawn + arredores' },
                  { id: 'medium', label: 'Médio',    radius: 15, chunks: 961,   time: '~3 min',   desc: 'Área de vila' },
                  { id: 'large',  label: 'Grande',   radius: 30, chunks: 3721,  time: '~15 min',  desc: 'Região de jogo' },
                  { id: 'huge',   label: 'Enorme',   radius: 75, chunks: 22801, time: '~1 hora',  desc: 'Mapa completo' },
                ] as const).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setChunkyPreset(p.id); setChunkyRadius(p.radius); setCustomRadius(p.radius) }}
                    className={`relative flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-150
                      ${chunkyPreset === p.id
                        ? 'border-brand-400/40 bg-brand-400/[0.08] shadow-lg shadow-brand-400/5'
                        : 'border-dark-500 bg-dark-800 hover:border-dark-400'}`}
                  >
                    <p className={`font-bold text-sm ${chunkyPreset === p.id ? 'text-brand-300' : 'text-slate-300'}`}>{p.label}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{p.desc}</p>
                    <div className="mt-2.5 pt-2.5 border-t border-dark-600">
                      <p className={`text-xs font-mono font-bold ${chunkyPreset === p.id ? 'text-brand-400' : 'text-slate-500'}`}>{p.radius} chunks</p>
                      <p className="text-[10px] text-slate-700 mt-0.5">{p.time} · {p.chunks.toLocaleString()} chunks</p>
                    </div>
                    {chunkyPreset === p.id && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                        <Check size={8} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </motion.div>

              {/* Custom row */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={`w-full p-3.5 rounded-2xl border transition-all duration-150 mb-6
                  ${chunkyPreset === 'custom' ? 'border-brand-400/40 bg-brand-400/[0.06]' : 'border-dark-500 bg-dark-800'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setChunkyPreset('custom')}
                    className={`text-sm font-bold ${chunkyPreset === 'custom' ? 'text-brand-300' : 'text-slate-400'}`}
                  >
                    Personalizado
                  </button>
                  <span className={`font-mono text-sm font-bold ${chunkyPreset === 'custom' ? 'text-brand-400' : 'text-slate-600'}`}>
                    {customRadius} chunks · {((2*customRadius+1)**2).toLocaleString()} chunks totais
                  </span>
                </div>
                <input
                  type="range" min={1} max={200} step={1} value={customRadius}
                  onChange={e => { const v = Number(e.target.value); setCustomRadius(v); setChunkyRadius(v); setChunkyPreset('custom') }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-400 bg-dark-600"
                />
                <div className="flex justify-between text-[10px] text-slate-700 mt-1.5 font-mono">
                  <span>1</span><span>50</span><span>100</span><span>150</span><span>200</span>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex items-center gap-3 w-full"
              >
                <button
                  onClick={() => handleCreate(null)}
                  className="flex-1 py-3 rounded-xl border border-dark-500 text-slate-400 hover:text-white hover:border-dark-400 text-sm font-semibold transition-colors"
                >
                  Pular por agora
                </button>
                <button
                  onClick={() => handleCreate(chunkyRadius)}
                  className="flex-[2] py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                >
                  <Layers size={15} />
                  Ativar Chunky ({chunkyPreset === 'custom' ? customRadius : chunkyRadius} chunks)
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlayItModal({ onUsePlayit, onSkipPlayit }: { onUsePlayit: () => void; onSkipPlayit: () => void }) {
  const [manualMode, setManualMode] = useState(false)

  const openExternal = (url: string) => {
    if (typeof window !== 'undefined' && window.electron?.openExternal) {
      window.electron.openExternal(url)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex flex-col bg-[#08080e]/97 backdrop-blur-xl overflow-auto"
    >
      {/* Background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[350px] h-[250px] bg-indigo-400/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-8 py-10 max-w-[700px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {!manualMode ? (
            <motion.div
              key="playit-main"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 280, damping: 20 }}
                className="w-20 h-20 rounded-3xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center mb-6 shadow-2xl shadow-violet-500/15"
              >
                <Globe size={38} className="text-violet-400" />
              </motion.div>

              {/* Heading */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12 }}
                className="text-center mb-4"
              >
                <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-2">Jogar com amigos online?</p>
                <h2 className="text-3xl font-black text-white tracking-tight leading-tight">Quer jogar com amigos online?</h2>
              </motion.div>

              {/* Two-column layout */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.18 }}
                className="w-full grid grid-cols-2 gap-4 mb-6"
              >
                {/* Problem */}
                <div className="p-4 bg-red-500/[0.05] border border-red-400/15 rounded-2xl">
                  <p className="text-xs font-bold text-red-300 mb-2">⚠️ O problema</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Normalmente você precisaria <span className="text-slate-300 font-semibold">abrir portas no roteador</span> — uma configuração técnica que varia de aparelho pra aparelho e muita gente não consegue fazer.
                  </p>
                </div>
                {/* Solution */}
                <div className="p-4 bg-violet-500/[0.06] border border-violet-400/15 rounded-2xl">
                  <p className="text-xs font-bold text-violet-300 mb-2">✅ A solução</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    O <span className="text-violet-300 font-bold">PlayIt.gg</span> resolve automaticamente criando um <span className="text-slate-300 font-semibold">endereço público gratuito</span> pro seu servidor. Sem mexer no roteador.
                  </p>
                </div>
              </motion.div>

              {/* Tutorial steps — shown after choosing PlayIt */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.22 }}
                className="w-full mb-6"
              >
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Como configurar (depois de criar o servidor)</p>
                <div className="space-y-2">
                  {[
                    { icon: '🌐', text: <>Acesse <span className="text-violet-300 font-semibold">playit.gg</span> e crie sua conta gratuita</> },
                    { icon: '🚀', text: 'Inicie o servidor no CraftServer' },
                    { icon: '💬', text: <>No console do servidor, execute o comando: <code className="font-mono text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded text-[11px]">/playit</code></> },
                    { icon: '🔗', text: 'Siga o link que aparecer para vincular sua conta PlayIt' },
                    { icon: '🎉', text: <>Você receberá um endereço tipo <code className="font-mono text-violet-300 text-[11px]">xxxx.playit.gg:25565</code> para compartilhar</> },
                    { icon: '🎮', text: <>Para testar localmente: entre no Minecraft com endereço <code className="font-mono text-slate-300 text-[11px]">localhost</code> (sem porta)</> },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs text-slate-400">
                      <span className="text-base leading-none mt-0.5 shrink-0">{step.icon}</span>
                      <span className="leading-relaxed">{step.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.28 }}
                className="flex flex-col gap-2.5 w-full"
              >
                <button
                  onClick={onUsePlayit}
                  className="w-full py-3.5 rounded-xl bg-violet-500 hover:bg-violet-400 active:bg-violet-600 text-white text-sm font-bold transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
                >
                  <Globe size={15} /> ✅ Sim, usar PlayIt.gg
                </button>
                <button
                  onClick={() => setManualMode(true)}
                  className="w-full py-3 rounded-xl border border-dark-500 hover:border-dark-400 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors"
                >
                  🔧 Prefiro configurar o roteador manualmente
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="manual-mode"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center"
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-slate-500/15 border border-slate-400/25 flex items-center justify-center mb-6">
                <Server size={30} className="text-slate-400" />
              </div>

              <h2 className="text-2xl font-black text-white mb-2">Configuração manual de porta</h2>
              <p className="text-sm text-slate-400 mb-6 text-center max-w-md">
                Seus amigos precisarão do seu <span className="text-slate-300 font-semibold">IP público</span> + porta <code className="font-mono text-slate-300">25565</code>
              </p>

              {/* Steps */}
              <div className="w-full space-y-2.5 mb-6">
                {[
                  { icon: '🌍', text: <>Descubra seu IP público em: <span className="text-slate-300 font-semibold">whatismyip.com</span></> },
                  { icon: '🔓', text: <>Abra a porta <code className="font-mono text-slate-300">25565</code> no seu roteador (protocolo TCP)</> },
                  { icon: '📤', text: <>Passe seu IP público para os amigos — eles entram com <code className="font-mono text-slate-300">IP:25565</code></> },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-slate-400 p-3 bg-dark-800 border border-dark-600 rounded-xl">
                    <span className="text-base leading-none mt-0.5 shrink-0">{step.icon}</span>
                    <span className="leading-relaxed">{step.text}</span>
                  </div>
                ))}
              </div>

              {/* Resource links */}
              <div className="w-full flex gap-2.5 mb-6">
                <button
                  onClick={() => openExternal('https://portforward.com')}
                  className="flex-1 py-2.5 rounded-xl border border-dark-500 hover:border-dark-400 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
                >
                  📖 Tutorial completo → portforward.com
                </button>
                <button
                  onClick={() => openExternal('https://www.youtube.com/results?search_query=como+abrir+porta+minecraft')}
                  className="flex-1 py-2.5 rounded-xl border border-dark-500 hover:border-dark-400 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
                >
                  🎥 Ver tutorial no YouTube
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setManualMode(false)}
                  className="flex-1 py-3 rounded-xl border border-dark-600 hover:border-dark-400 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  onClick={onSkipPlayit}
                  className="flex-[2] py-3 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-500 text-slate-300 text-sm font-bold transition-colors"
                >
                  Continuar sem PlayIt →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function PluginRow({ plugin, disabled, locked, onToggle }: {
  plugin: { name: string; description: string; enabled: boolean }
  disabled?: boolean
  locked?: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={() => !disabled && !locked && onToggle()}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-150
        ${disabled ? 'opacity-40 cursor-not-allowed border-dark-500 bg-dark-800'
          : locked ? 'border-amber-500/30 bg-amber-500/[0.06] cursor-default'
          : plugin.enabled ? 'border-brand-400/20 bg-brand-400/[0.05] hover:border-brand-400/35'
          : 'border-dark-600 bg-dark-800 hover:border-dark-500'
        }`}
    >
      <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all
        ${locked ? 'bg-amber-500 border-amber-500'
          : plugin.enabled && !disabled ? 'bg-brand-500 border-brand-500'
          : 'border-dark-400'}`}>
        {locked
          ? <Lock size={8} className="text-white" strokeWidth={3} />
          : plugin.enabled && !disabled && <Check size={9} className="text-white" strokeWidth={3} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold leading-none mb-0.5 ${locked ? 'text-amber-300' : plugin.enabled && !disabled ? 'text-white' : 'text-slate-500'}`}>
          {plugin.name}
        </p>
        <p className="text-[11px] text-slate-700 truncate">{plugin.description}</p>
      </div>
    </button>
  )
}

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">{label}</label>
      {children}
    </div>
  )
}
