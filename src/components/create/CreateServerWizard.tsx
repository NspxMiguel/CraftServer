import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Loader2, Server, Zap, Shield, Globe, Lock, UserCheck } from 'lucide-react'
import type { Page } from '../../App'
import type { ServerType } from '../../types'
import { PRESET_PLUGINS } from '../../data/presetPlugins'
import { useServerStore } from '../../store/serverStore'

const isElectron = typeof window !== 'undefined' && !!window.electron

const FALLBACK_VERSIONS: Record<string, string[]> = {
  paper:   ['1.21.5','1.21.4','1.21.3','1.21.1','1.20.6','1.20.4','1.20.2','1.20.1','1.19.4','1.19.2','1.18.2','1.17.1','1.16.5','1.8.8'],
  purpur:  ['1.21.5','1.21.4','1.21.3','1.21.1','1.20.6','1.20.4','1.20.1','1.19.4','1.19.2','1.18.2','1.16.5'],
  fabric:  ['1.21.5','1.21.4','1.21.3','1.21.1','1.20.6','1.20.4','1.20.1','1.19.4','1.18.2','1.17.1'],
  bedrock: ['1.21.60','1.21.50','1.21.30','1.21.0','1.20.80','1.20.50'],
  hybrid:  ['1.21.5','1.21.4','1.21.3','1.21.1','1.20.6','1.20.4','1.20.1','1.19.4'],
  vanilla: ['1.21.5','1.21.4','1.21.3','1.21.1','1.20.6','1.20.4','1.20.2','1.20.1','1.19.4','1.19.2','1.18.2','1.17.1','1.16.5','1.8.9'],
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

interface Props { navigate: (p: Page) => void }

export default function CreateServerWizard({ navigate }: Props) {
  const { setServers, setSelected } = useServerStore()
  const [step, setStep] = useState(0)
  const [type, setType] = useState<ServerType>('paper')
  const [versions, setVersions] = useState<string[]>([])
  const [version, setVersion] = useState('')
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [name, setName] = useState('')
  const [ram, setRam] = useState(1024)
  const [port, setPort] = useState(25565)
  const [plugins, setPlugins] = useState(PRESET_PLUGINS.map(p => ({ ...p })))
  const [offlineMode, setOfflineMode] = useState(false)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [showOptional, setShowOptional] = useState(false)

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
    window.electron.on('create-progress', ({ msg }: { msg: string }) => {
      setProgress(p => [...p, msg])
      if (msg.includes('sucesso')) setDone(true)
    })
  }, [])

  const togglePlugin = (name: string) => {
    setPlugins(ps => ps.map(p => p.name === name ? { ...p, enabled: !p.enabled } : p))
  }

  const handleOfflineToggle = (v: boolean) => {
    setOfflineMode(v)
  }

  const handleCreate = async () => {
    if (!name.trim() || !version) return
    setCreating(true)
    setProgress([])
    setDone(false)

    const toInstall = [
      // silent: always included
      ...silentPlugins,
      // offline-only: only if offline mode
      ...(offlineMode ? offlinePlugins : []),
      // core + optional: only if enabled
      ...corePlugins.filter(p => p.enabled),
      ...optionalPlugins.filter(p => p.enabled),
    ]
    const selectedPlugins = toInstall.map(p => ({ name: p.name, url: p.url, filename: p.filename, modrinthSlug: p.modrinthSlug }))
    const res = isElectron
      ? await window.electron.createServer({ name: name.trim(), type, version, ram, port, plugins: selectedPlugins, offlineMode })
      : { ok: true, server: { id: Date.now().toString(), name, type, version, ram, port, dir: '', createdAt: Date.now(), playit: false } }

    if (res.ok) {
      const updated = isElectron ? await window.electron.getServers() : [res.server]
      setServers(updated)
      setSelected(res.server.id)
      setTimeout(() => navigate('server'), 900)
    }
  }

  const selectedTypeMeta = SERVER_TYPES.find(t => t.id === type)!
  const canNext = step === 0 || (step === 1 && !!version) || (step === 2 && !!name.trim()) || step === 3

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-dark bg-grid opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col h-full max-w-3xl mx-auto w-full px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('dashboard')}
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
                        onClick={() => setType(t.id as ServerType)}
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
                      autoFocus
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Survival dos Amigos"
                      className="w-full bg-dark-800 border border-dark-500 hover:border-brand-400/30 focus:border-brand-400/60 rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none text-sm font-medium transition-colors"
                    />
                  </Field>

                  <Field label={`RAM — ${ram >= 1024 ? `${ram/1024}GB` : `${ram}MB`}`}>
                    <div className="px-1 pt-1">
                      <input
                        type="range" min={512} max={8192} step={512} value={ram}
                        onChange={e => setRam(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-400 bg-dark-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-700 mt-2 font-mono font-bold">
                        <span>512MB</span><span>2GB</span><span>4GB</span><span>6GB</span><span>8GB</span>
                      </div>
                    </div>
                  </Field>

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
                onClick={handleCreate}
                disabled={!name.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-30 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20"
              >
                <Server size={15} /> Criar servidor
              </button>
            )}
          </div>
        )}
      </div>
    </div>
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
