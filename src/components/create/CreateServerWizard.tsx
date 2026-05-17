import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Loader2, Server, Zap } from 'lucide-react'
import type { Page } from '../../App'
import type { ServerType } from '../../types'
import { PRESET_PLUGINS } from '../../data/presetPlugins'
import { useServerStore } from '../../store/serverStore'

const isElectron = typeof window !== 'undefined' && !!window.electron

const SERVER_TYPES = [
  {
    id: 'paper', label: 'Paper', recommended: true,
    desc: 'Performance máxima + plugins Bukkit/Spigot',
    color: 'from-yellow-500/20 to-yellow-600/5', border: 'border-yellow-500/30', badge: 'text-yellow-400',
  },
  {
    id: 'purpur', label: 'Purpur', recommended: false,
    desc: 'Fork do Paper com mais configurações',
    color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/30', badge: 'text-purple-400',
  },
  {
    id: 'vanilla', label: 'Vanilla', recommended: false,
    desc: 'Servidor oficial da Mojang, sem plugins',
    color: 'from-sky-500/20 to-sky-600/5', border: 'border-sky-500/30', badge: 'text-sky-400',
  },
  {
    id: 'fabric', label: 'Fabric', recommended: false,
    desc: 'Ideal para mods técnicos e datapacks',
    color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/30', badge: 'text-blue-400',
  },
] as const

const STEP_LABELS = ['Tipo', 'Versão', 'Config', 'Plugins']

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
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    setLoadingVersions(true)
    setVersion('')
    const fn = isElectron ? window.electron.getVersions : () => Promise.resolve([])
    fn(type).then(v => {
      setVersions(v)
      setVersion(v[0] || '')
      setLoadingVersions(false)
    })
  }, [type])

  useEffect(() => {
    if (!isElectron) return
    window.electron.on('create-progress', ({ msg }: { msg: string }) => {
      setProgress(p => [...p, msg])
      if (msg.includes('sucesso')) setDone(true)
    })
  }, [])

  const togglePlugin = (idx: number) =>
    setPlugins(ps => ps.map((p, i) => i === idx ? { ...p, enabled: !p.enabled } : p))

  const handleCreate = async () => {
    if (!name.trim() || !version) return
    setCreating(true)
    setProgress([])
    setDone(false)

    const selectedPlugins = plugins.filter(p => p.enabled).map(p => ({ name: p.name, url: p.url, filename: p.filename }))
    const res = isElectron
      ? await window.electron.createServer({ name: name.trim(), type, version, ram, port, plugins: selectedPlugins })
      : { ok: true, server: { id: '1', name, type, version, ram, port, dir: '', createdAt: Date.now(), playit: false } }

    if (res.ok) {
      const updated = isElectron ? await window.electron.getServers() : [res.server]
      setServers(updated)
      setSelected(res.server.id)
      setTimeout(() => navigate('server'), 900)
    }
  }

  const canNext = step === 0 || (step === 1 && !!version) || (step === 2 && !!name.trim()) || step === 3

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('dashboard')}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-white">Criar Servidor</h1>

        {/* Step indicators */}
        <div className="ml-auto flex items-center gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300
                ${i < step ? 'bg-brand-500/20 text-brand-400'
                  : i === step ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'bg-white/[0.04] text-zinc-600'
                }`}>
                {i < step ? <Check size={10} strokeWidth={2.5} /> : <span>{i + 1}</span>}
                <span>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-4 h-px ${i < step ? 'bg-brand-500/40' : 'bg-white/[0.06]'} transition-colors`} />
              )}
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
              <StepTitle>Que tipo de servidor?</StepTitle>
              <div className="grid grid-cols-2 gap-3">
                {SERVER_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id as ServerType)}
                    className={`relative text-left p-4 rounded-2xl border transition-all duration-200 overflow-hidden
                      ${type === t.id ? `${t.border} border` : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]'}`}
                  >
                    {type === t.id && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${t.color} pointer-events-none`} />
                    )}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`font-bold text-base ${type === t.id ? t.badge : 'text-white'}`}>{t.label}</span>
                        {t.recommended && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded-full font-semibold">
                            <Zap size={9} />Recomendado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{t.desc}</p>
                    </div>
                    {type === t.id && (
                      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full ${t.badge.replace('text-', 'bg-')} flex items-center justify-center`}>
                        <Check size={11} className="text-black" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </StepWrap>
          )}

          {/* Step 1: Version */}
          {step === 1 && (
            <StepWrap key="version">
              <StepTitle>Versão do Minecraft</StepTitle>
              {loadingVersions ? (
                <div className="flex items-center justify-center gap-2 text-zinc-500 py-16">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Buscando versões disponíveis...</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-600 mb-3">{versions.length} versões encontradas · Mais recentes primeiro</p>
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-auto pr-1">
                    {versions.slice(0, 40).map(v => (
                      <button
                        key={v}
                        onClick={() => setVersion(v)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-mono font-medium transition-all duration-150
                          ${version === v
                            ? 'border-brand-500/60 bg-brand-500/15 text-brand-300 shadow-sm shadow-brand-500/10'
                            : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200'
                          }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </StepWrap>
          )}

          {/* Step 2: Config */}
          {step === 2 && (
            <StepWrap key="config">
              <StepTitle>Configurações básicas</StepTitle>
              <div className="space-y-5">
                <Field label="Nome do servidor">
                  <input
                    autoFocus
                    className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] focus:border-brand-500/60 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none text-sm transition-colors"
                    placeholder="Ex: Survival do João"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </Field>

                <Field label={`RAM — ${ram >= 1024 ? `${ram / 1024}GB` : `${ram}MB`}`}>
                  <div className="px-1">
                    <input
                      type="range" min={512} max={8192} step={512}
                      value={ram}
                      onChange={e => setRam(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-white/[0.08]"
                    />
                    <div className="flex justify-between text-[11px] text-zinc-700 mt-1.5">
                      <span>512MB</span><span>2GB</span><span>4GB</span><span>8GB</span>
                    </div>
                  </div>
                </Field>

                <Field label="Porta">
                  <input
                    type="number" min={1024} max={65535}
                    className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] focus:border-brand-500/60 rounded-xl px-4 py-3 text-white focus:outline-none text-sm font-mono transition-colors"
                    value={port}
                    onChange={e => setPort(Number(e.target.value))}
                  />
                  <p className="text-xs text-zinc-700 mt-1.5">Padrão: 25565</p>
                </Field>
              </div>
            </StepWrap>
          )}

          {/* Step 3: Plugins */}
          {step === 3 && !creating && (
            <StepWrap key="plugins">
              <StepTitle>Plugins recomendados</StepTitle>
              <p className="text-xs text-zinc-600 mb-4">Pré-selecionamos os mais essenciais. Você pode mudar depois.</p>
              <div className="space-y-2">
                {plugins.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => togglePlugin(i)}
                    className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all duration-150
                      ${p.enabled
                        ? 'border-brand-500/25 bg-brand-500/[0.06]'
                        : 'border-white/[0.05] bg-white/[0.02] hover:border-white/[0.1]'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all
                      ${p.enabled ? 'bg-brand-500 border-brand-500' : 'border-zinc-700'}`}>
                      {p.enabled && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${p.enabled ? 'text-white' : 'text-zinc-400'}`}>{p.name}</p>
                      <p className="text-xs text-zinc-600 truncate mt-0.5">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </StepWrap>
          )}

          {/* Creating */}
          {creating && (
            <StepWrap key="creating">
              <div className="flex flex-col items-center gap-6 py-12">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-colors duration-500
                  ${done ? 'bg-brand-500/20' : 'bg-white/[0.04]'}`}>
                  {done
                    ? <Check size={36} className="text-brand-400" strokeWidth={2.5} />
                    : <Loader2 size={36} className="text-brand-400 animate-spin" />
                  }
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{done ? 'Servidor criado!' : 'Criando servidor...'}</p>
                  <p className="text-zinc-500 text-sm mt-1">{progress[progress.length - 1] || 'Preparando...'}</p>
                </div>
                <div className="w-full bg-[#080808] border border-white/[0.05] rounded-2xl p-4 max-h-44 overflow-auto font-mono text-xs text-zinc-500 space-y-0.5">
                  {progress.map((line, i) => (
                    <div key={i} className={i === progress.length - 1 ? 'text-zinc-300' : ''}>{line}</div>
                  ))}
                </div>
              </div>
            </StepWrap>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {!creating && (
        <div className="flex items-center justify-between pt-5 mt-4 border-t border-white/[0.05]">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('dashboard')}
            className="flex items-center gap-1.5 px-4 py-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] rounded-xl text-sm transition-colors"
          >
            <ChevronLeft size={15} />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => canNext && setStep(s => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20"
            >
              Próximo
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20"
            >
              <Server size={15} />
              Criar servidor
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-white mb-5">{children}</h2>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">{label}</label>
      {children}
    </div>
  )
}
