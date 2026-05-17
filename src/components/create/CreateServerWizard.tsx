import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Loader2, Server } from 'lucide-react'
import type { Page } from '../../App'
import type { ServerType } from '../../types'
import { PRESET_PLUGINS } from '../../data/presetPlugins'
import { useServerStore } from '../../store/serverStore'

const isElectron = typeof window !== 'undefined' && !!window.electron

const SERVER_TYPES = [
  { id: 'paper',   label: 'Paper',   desc: 'O mais popular — performance máxima com suporte a plugins Bukkit/Spigot', color: 'text-yellow-400', border: 'border-yellow-400/40' },
  { id: 'purpur',  label: 'Purpur',  desc: 'Fork do Paper com mais configurações e performance ainda melhor',          color: 'text-purple-400', border: 'border-purple-400/40' },
  { id: 'vanilla', label: 'Vanilla', desc: 'Servidor oficial da Mojang — sem plugins, apenas mods leves',              color: 'text-sky-400',    border: 'border-sky-400/40'    },
  { id: 'fabric',  label: 'Fabric',  desc: 'Ideal para mods técnicos e datapacks avançados',                          color: 'text-blue-400',   border: 'border-blue-400/40'   },
] as const

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
    })
  }, [])

  const togglePlugin = (idx: number) => {
    setPlugins(ps => ps.map((p, i) => i === idx ? { ...p, enabled: !p.enabled } : p))
  }

  const handleCreate = async () => {
    if (!name.trim() || !version) return
    setCreating(true)
    setProgress([])

    const selectedPlugins = plugins.filter(p => p.enabled).map(p => ({
      name: p.name, url: p.url, filename: p.filename,
    }))

    const res = isElectron
      ? await window.electron.createServer({ name: name.trim(), type, version, ram, port, plugins: selectedPlugins })
      : { ok: true, server: { id: '1', name, type, version, ram, port, dir: '', createdAt: Date.now(), playit: false } }

    if (res.ok) {
      const updated = await (isElectron ? window.electron.getServers() : Promise.resolve([res.server]))
      setServers(updated)
      setSelected(res.server.id)
      setTimeout(() => navigate('server'), 500)
    }
  }

  const canNext = step === 0 || (step === 1 && !!version) || (step === 2 && !!name.trim())

  return (
    <div className="h-full flex flex-col p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('dashboard')} className="p-1.5 rounded-lg hover:bg-surface-700 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-white">Criar Servidor</h1>
        <div className="ml-auto flex items-center gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-brand-500 w-6' : 'bg-surface-600 w-3'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* Step 0: Type */}
          {step === 0 && (
            <StepWrap key="type">
              <StepLabel>Tipo de servidor</StepLabel>
              <div className="grid grid-cols-2 gap-3">
                {SERVER_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id as ServerType)}
                    className={`text-left p-4 rounded-xl border transition-colors ${type === t.id ? `${t.border} border bg-surface-700` : 'border-surface-600 hover:border-surface-500 bg-surface-800'}`}
                  >
                    <p className={`font-semibold ${type === t.id ? t.color : 'text-white'}`}>{t.label}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{t.desc}</p>
                    {type === t.id && <div className={`mt-2 w-4 h-4 rounded-full ${t.color.replace('text-', 'bg-')} flex items-center justify-center`}><Check size={10} className="text-black" /></div>}
                  </button>
                ))}
              </div>
            </StepWrap>
          )}

          {/* Step 1: Version */}
          {step === 1 && (
            <StepWrap key="version">
              <StepLabel>Versão do Minecraft</StepLabel>
              {loadingVersions ? (
                <div className="flex items-center gap-2 text-zinc-400 py-8 justify-center">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Buscando versões...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-auto pr-1">
                  {versions.slice(0, 30).map(v => (
                    <button
                      key={v}
                      onClick={() => setVersion(v)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors ${version === v ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-600 bg-surface-800 text-zinc-300 hover:border-surface-500'}`}
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
              <StepLabel>Configurações</StepLabel>
              <div className="space-y-4">
                <Field label="Nome do servidor">
                  <input
                    className="w-full bg-surface-700 border border-surface-600 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 text-sm"
                    placeholder="Meu servidor épico"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label={`RAM: ${ram >= 1024 ? `${ram/1024}GB` : `${ram}MB`}`}>
                  <input
                    type="range" min={512} max={8192} step={512}
                    value={ram}
                    onChange={e => setRam(Number(e.target.value))}
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-600 mt-1">
                    <span>512MB</span><span>8GB</span>
                  </div>
                </Field>
                <Field label="Porta">
                  <input
                    type="number" min={1024} max={65535}
                    className="w-full bg-surface-700 border border-surface-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 text-sm"
                    value={port}
                    onChange={e => setPort(Number(e.target.value))}
                  />
                </Field>
              </div>
            </StepWrap>
          )}

          {/* Step 3: Plugins */}
          {step === 3 && !creating && (
            <StepWrap key="plugins">
              <StepLabel>Plugins recomendados</StepLabel>
              <p className="text-xs text-zinc-500 mb-4">Ative ou desative — você pode instalar mais depois</p>
              <div className="space-y-2">
                {plugins.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => togglePlugin(i)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${p.enabled ? 'border-brand-500/40 bg-brand-500/5' : 'border-surface-600 bg-surface-800 hover:border-surface-500'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${p.enabled ? 'bg-brand-500 border-brand-500' : 'border-zinc-600'}`}>
                      {p.enabled && <Check size={12} className="text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </StepWrap>
          )}

          {/* Creating state */}
          {creating && (
            <StepWrap key="creating">
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                  {progress[progress.length - 1]?.includes('sucesso') ? (
                    <Check size={28} className="text-brand-400" />
                  ) : (
                    <Loader2 size={28} className="text-brand-400 animate-spin" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Criando servidor...</p>
                  <p className="text-zinc-400 text-sm mt-1">{progress[progress.length - 1] || 'Iniciando...'}</p>
                </div>
                <div className="w-full bg-surface-700 rounded-xl p-3 max-h-40 overflow-auto font-mono text-xs text-zinc-400 space-y-0.5">
                  {progress.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
            </StepWrap>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {!creating && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-700">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('dashboard')}
            className="flex items-center gap-1.5 px-4 py-2 text-zinc-400 hover:text-white rounded-xl hover:bg-surface-700 text-sm transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => canNext && setStep(s => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-1.5 px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
              Próximo
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Server size={16} />
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-white mb-4">{children}</h2>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}
