import { useState, useEffect } from 'react'
import { Save, Globe, Shield, Gamepad2, Mountain, Zap, Image, Info, Check, Loader2, Cpu, AlertTriangle, Upload } from 'lucide-react'
import { motion } from 'framer-motion'

const isElectron = typeof window !== 'undefined' && !!window.electron

interface Props {
  serverId: string
  serverType: string
  serverRam: number
  onRamChange: (ram: number) => void
}

const GAMEMODES = ['survival', 'creative', 'adventure', 'spectator']
const DIFFICULTIES = ['peaceful', 'easy', 'normal', 'hard']
const RAM_PRESETS = [
  { id: 'low', label: 'Low', value: 2048 },
  { id: 'recommended', label: 'Recomendado', value: 4096 },
  { id: 'high', label: 'High', value: 8192 },
  { id: 'extreme', label: 'Extreme', value: 16384 },
]

const clampRam = (value: number, maxRam: number) => {
  const clean = Number.isFinite(value) ? value : 2048
  return Math.max(512, Math.min(maxRam, Math.round(clean / 512) * 512))
}

const fmtRam = (mb: number) => mb >= 1024 ? `${Number((mb / 1024).toFixed(1))} GB` : `${mb} MB`

export default function ServerSettings({ serverId, serverType, serverRam, onRamChange }: Props) {
  const [props, setProps] = useState<Record<string, any>>({})
  const [initialProps, setInitialProps] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [importingWorld, setImportingWorld] = useState(false)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [systemRam, setSystemRam] = useState({ totalMb: 8192, freeMb: 4096 })
  const [ram, setRam] = useState(serverRam || 2048)
  const [ramInput, setRamInput] = useState(String(serverRam || 2048))

  const isBedrock = serverType === 'bedrock'
  const maxRam = Math.max(512, Math.min(16384, Math.floor((systemRam.totalMb * 0.8) / 512) * 512))
  const recommendedRam = Math.max(2048, Math.min(maxRam, Math.floor(Math.min(systemRam.totalMb * 0.35, 6144) / 512) * 512))
  const ramRatio = ram / Math.max(systemRam.totalMb, 1)
  const dangerousRam = ramRatio > 0.75
  const dirty = JSON.stringify(props) !== JSON.stringify(initialProps) || ram !== serverRam

  useEffect(() => {
    let alive = true
    setLoading(true)
    setSaveError('')
    setRam(serverRam || 2048)
    setRamInput(String(serverRam || 2048))

    const load = async () => {
      if (!isElectron) {
        setLoading(false)
        return
      }
      try {
        const detected = await window.electron.getSystemRam?.()
        if (alive && detected) setSystemRam(detected)
      } catch {}

      if (isBedrock) {
        setLoading(false)
        return
      }

      const p = await window.electron.getServerProperties(serverId)
      if (!alive) return
      setProps(p || {})
      setInitialProps(p || {})
      setLoading(false)
    }

    load().catch(e => {
      setLoading(false)
      setSaveError(String(e?.message || e))
    })
    return () => { alive = false }
  }, [serverId, serverRam, isBedrock])

  const setSafeRam = (value: number) => {
    const next = clampRam(value, maxRam)
    setRam(next)
    setRamInput(String(next))
  }

  const set = (key: string, value: any) => setProps(p => ({ ...p, [key]: value }))

  const handleImportWorld = async () => {
    if (!isElectron || importingWorld) return
    setImportingWorld(true)
    setImportMsg(null)
    const res = await window.electron.importWorld?.(serverId)
    setImportingWorld(false)
    if (!res || res.canceled) return
    if (res.ok) setImportMsg({ ok: true, text: `Mapa importado para "${res.worldName}"! Reinicie o servidor.` })
    else setImportMsg({ ok: false, text: res.error ?? 'Erro ao importar mapa' })
    setTimeout(() => setImportMsg(null), 6000)
  }

  const handleSave = async () => {
    if (!isElectron) return
    setSaving(true)
    setSaveError('')
    const safeRam = clampRam(ram, maxRam)
    const [propsRes, ramRes] = await Promise.all([
      isBedrock ? Promise.resolve({ ok: true }) : window.electron.setServerProperties(serverId, props),
      window.electron.setServerRam?.(serverId, safeRam) ?? Promise.resolve({ ok: true }),
    ])
    setSaving(false)
    if (!propsRes?.ok || !ramRes?.ok) {
      setSaveError((propsRes as any)?.error || (ramRes as any)?.error || 'Falha ao salvar configurações')
      return
    }
    onRamChange(safeRam)
    setRam(safeRam)
    setRamInput(String(safeRam))
    setInitialProps(props)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-24 rounded-2xl bg-dark-800 border border-dark-600 overflow-hidden">
          <div className="h-full w-1/2 bg-white/[0.03] animate-pulse" />
        </div>
      ))}
    </div>
  )

  if (isBedrock) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <Info size={24} className="text-slate-600" />
      <p className="text-slate-400 font-semibold">Servidor Bedrock</p>
      <p className="text-slate-600 text-sm max-w-xs">Servidores PowerNukkit usam <code className="font-mono text-xs bg-dark-700 px-1 py-0.5 rounded">server.properties</code> próprio. Edite diretamente na pasta do servidor.</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        <Section icon={<Cpu size={14} />} title="Memória RAM">
          <div className="rounded-2xl border border-brand-400/20 bg-brand-400/[0.04] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 font-semibold">RAM do servidor</p>
                <p className="text-3xl font-black font-mono text-white mt-1">{fmtRam(ram)}</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  PC: {fmtRam(systemRam.totalMb)} total · limite seguro: {fmtRam(maxRam)} · recomendado: {fmtRam(recommendedRam)}
                </p>
              </div>
              <div className="w-32">
                <input
                  value={ramInput}
                  inputMode="numeric"
                  onChange={e => {
                    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 6)
                    setRamInput(raw)
                    if (raw) setRam(clampRam(Number(raw), maxRam))
                  }}
                  onBlur={() => setSafeRam(Number(ramInput))}
                  className={input + ' font-mono text-right'}
                  aria-label="RAM em MB"
                />
                <p className="text-[10px] text-slate-700 mt-1 text-right">MB</p>
              </div>
            </div>

            <input
              type="range"
              min={512}
              max={maxRam}
              step={512}
              value={ram}
              onChange={e => setSafeRam(Number(e.target.value))}
              className="w-full accent-brand-400 mt-4"
              aria-label="RAM do servidor"
            />

            <div className="grid grid-cols-4 gap-2 mt-3">
              {RAM_PRESETS.map(preset => {
                const value = preset.id === 'recommended' ? recommendedRam : clampRam(preset.value, maxRam)
                const active = ram === value
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSafeRam(value)}
                    className={`px-2 py-2 rounded-xl border text-xs font-bold transition-colors ${
                      active
                        ? 'bg-brand-500/20 border-brand-400/40 text-brand-300'
                        : 'bg-dark-700 border-dark-500 text-slate-500 hover:text-slate-300 hover:border-dark-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            {dangerousRam && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3">
                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-200/80 leading-relaxed">
                  Essa alocação usa mais de 75% da RAM do PC. Pode travar navegador, Discord ou o próprio sistema se vários servidores rodarem juntos.
                </p>
              </motion.div>
            )}
          </div>
        </Section>

        {/* Geral */}
        <Section icon={<Globe size={14} />} title="Geral">
          <Row label="Nome do servidor (MOTD)">
            <input value={String(props['motd'] ?? '')} onChange={e => set('motd', e.target.value)}
              className={input} placeholder="Meu servidor" />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Porta">
              <input type="number" value={Number(props['server-port'] ?? 25565)} onChange={e => set('server-port', Number(e.target.value))}
                className={input + ' font-mono'} />
            </Row>
            <Row label="Máx. jogadores">
              <input type="number" value={Number(props['max-players'] ?? 20)} onChange={e => set('max-players', Number(e.target.value))}
                className={input + ' font-mono'} />
            </Row>
          </div>
          <Row label="IP do servidor (deixe vazio para aceitar todos)">
            <input value={String(props['server-ip'] ?? '')} onChange={e => set('server-ip', e.target.value)}
              className={input + ' font-mono'} placeholder="0.0.0.0" />
          </Row>
        </Section>

        {/* Acesso */}
        <Section icon={<Shield size={14} />} title="Acesso & Autenticação">
          <Toggle
            label="Modo Online (autenticação Mojang)"
            desc="Desative para aceitar jogadores com jogo pirata (cracked). Requer plugin de auth como AuthMe."
            value={Boolean(props['online-mode'] ?? true)}
            onChange={v => set('online-mode', v)}
          />
          {!Boolean(props['online-mode'] ?? true) && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 p-3 bg-amber-400/8 border border-amber-400/20 rounded-xl">
              <Info size={13} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Com modo offline ativo, instale <strong className="text-white">AuthMe Reloaded</strong> + <strong className="text-white">SkinsRestorer</strong> para segurança e skins. Jogadores com jogo original podem usar login automático com AuthMe Premium.
              </p>
            </motion.div>
          )}
          <Toggle
            label="Whitelist ativa"
            desc="Somente jogadores na whitelist podem entrar. Gerencie a lista na aba Whitelist."
            value={Boolean(props['white-list'] ?? false)}
            onChange={v => set('white-list', v)}
          />
          <Toggle
            label="Permitir voo"
            desc="Permite que jogadores voem sem estar em modo criativo."
            value={Boolean(props['allow-flight'] ?? false)}
            onChange={v => set('allow-flight', v)}
          />
          <Row label="Raio de proteção do spawn (blocos)">
            <input type="number" min={0} max={100} value={Number(props['spawn-protection'] ?? 16)}
              onChange={e => set('spawn-protection', Number(e.target.value))} className={input + ' font-mono w-28'} />
          </Row>
        </Section>

        {/* Gameplay */}
        <Section icon={<Gamepad2 size={14} />} title="Gameplay">
          <Row label="Modo de jogo padrão">
            <div className="flex gap-2 flex-wrap">
              {GAMEMODES.map(gm => (
                <button key={gm} onClick={() => set('gamemode', gm)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border capitalize transition-all
                    ${String(props['gamemode'] ?? 'survival') === gm
                      ? 'bg-brand-500/15 border-brand-400/40 text-brand-300'
                      : 'bg-dark-700 border-dark-500 text-slate-500 hover:border-dark-400 hover:text-slate-300'
                    }`}>
                  {gm}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Dificuldade">
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => set('difficulty', d)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border capitalize transition-all
                    ${String(props['difficulty'] ?? 'normal') === d
                      ? 'bg-brand-500/15 border-brand-400/40 text-brand-300'
                      : 'bg-dark-700 border-dark-500 text-slate-500 hover:border-dark-400 hover:text-slate-300'
                    }`}>
                  {d}
                </button>
              ))}
            </div>
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="PvP" desc="Jogadores podem se atacar." value={Boolean(props['pvp'] ?? true)} onChange={v => set('pvp', v)} compact />
            <Toggle label="Spawn de monstros" desc="" value={Boolean(props['spawn-monsters'] ?? true)} onChange={v => set('spawn-monsters', v)} compact />
            <Toggle label="Spawn de animais" desc="" value={Boolean(props['spawn-animals'] ?? true)} onChange={v => set('spawn-animals', v)} compact />
            <Toggle label="Spawn de NPCs (aldeões)" desc="" value={Boolean(props['spawn-npcs'] ?? true)} onChange={v => set('spawn-npcs', v)} compact />
          </div>
        </Section>

        {/* Mundo */}
        <Section icon={<Mountain size={14} />} title="Mundo">
          <div className="grid grid-cols-2 gap-3">
            <Row label="Nome do mundo (pasta)">
              <input value={String(props['level-name'] ?? 'world')} onChange={e => set('level-name', e.target.value)}
                className={input + ' font-mono'} />
            </Row>
            <Row label="Semente (seed)">
              <input value={String(props['level-seed'] ?? '')} onChange={e => set('level-seed', e.target.value)}
                placeholder="Aleatória" className={input + ' font-mono'} />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Distância de visão (chunks)">
              <input type="range" min={2} max={32} value={Number(props['view-distance'] ?? 10)}
                onChange={e => set('view-distance', Number(e.target.value))}
                className="w-full accent-brand-400 mt-1" />
              <p className="text-xs text-brand-400 font-mono font-bold mt-1">{props['view-distance'] ?? 10} chunks</p>
            </Row>
            <Row label="Distância de simulação (chunks)">
              <input type="range" min={2} max={16} value={Number(props['simulation-distance'] ?? 10)}
                onChange={e => set('simulation-distance', Number(e.target.value))}
                className="w-full accent-brand-400 mt-1" />
              <p className="text-xs text-brand-400 font-mono font-bold mt-1">{props['simulation-distance'] ?? 10} chunks</p>
            </Row>
          </div>
        </Section>

        {/* Map import */}
        <Section icon={<Upload size={14} />} title="Importar Mapa">
          <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-4 space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              Substitui o mundo atual pelo mapa importado. Aceita arquivos <span className="font-mono text-slate-400">.zip</span> com um mundo Minecraft válido (contendo <span className="font-mono text-slate-400">level.dat</span> ou pasta <span className="font-mono text-slate-400">region/</span>).
            </p>
            <button
              onClick={handleImportWorld}
              disabled={importingWorld}
              className="flex items-center gap-2 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 border border-dark-500 hover:border-brand-500/40 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              {importingWorld
                ? <Loader2 size={14} className="animate-spin text-brand-400" />
                : <Upload size={14} className="text-brand-400" />}
              {importingWorld ? 'Importando...' : 'Selecionar mapa (.zip)'}
            </button>
            {importMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs
                  ${importMsg.ok
                    ? 'bg-green-500/10 border-green-500/20 text-green-300'
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                  }`}
              >
                {importMsg.ok ? <Check size={12} /> : <AlertTriangle size={12} />}
                {importMsg.text}
              </motion.div>
            )}
          </div>
        </Section>

        {/* Resource Pack */}
        <Section icon={<Image size={14} />} title="Pacote de Textura (Resource Pack)">
          <Row label="URL do resource pack">
            <input value={String(props['resource-pack'] ?? '')} onChange={e => set('resource-pack', e.target.value)}
              placeholder="https://exemplo.com/pack.zip" className={input} />
          </Row>
          {String(props['resource-pack'] ?? '') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <Toggle
                label="Forçar uso da textura"
                desc="Jogadores que recusarem o pacote serão desconectados do servidor."
                value={Boolean(props['require-resource-pack'] ?? false)}
                onChange={v => set('require-resource-pack', v)}
              />
              <Row label="Mensagem de prompt (o que aparece para o jogador)">
                <input value={String(props['resource-pack-prompt'] ?? '')} onChange={e => set('resource-pack-prompt', e.target.value)}
                  placeholder="Este servidor usa um pacote de textura personalizado." className={input} />
              </Row>
              <Row label="SHA-1 do arquivo (para validação, opcional)">
                <input value={String(props['resource-pack-sha1'] ?? '')} onChange={e => set('resource-pack-sha1', e.target.value)}
                  placeholder="abc123..." className={input + ' font-mono text-xs'} />
              </Row>
            </motion.div>
          )}
        </Section>

        {/* Performance */}
        <Section icon={<Zap size={14} />} title="Performance">
          <div className="grid grid-cols-2 gap-3">
            <Row label="Tempo máximo de tick (ms, -1 = desativado)">
              <input type="number" value={Number(props['max-tick-time'] ?? 60000)}
                onChange={e => set('max-tick-time', Number(e.target.value))} className={input + ' font-mono'} />
            </Row>
            <Row label="Compressão de rede (bytes, -1 = desativado)">
              <input type="number" value={Number(props['network-compression-threshold'] ?? 256)}
                onChange={e => set('network-compression-threshold', Number(e.target.value))} className={input + ' font-mono'} />
            </Row>
          </div>
          <Row label="Threshold de rateio (ms)">
            <input type="number" value={Number(props['rate-limit'] ?? 0)}
              onChange={e => set('rate-limit', Number(e.target.value))} className={input + ' font-mono w-36'} />
          </Row>
        </Section>

      </div>

      {/* Save bar */}
      <div className="border-t border-dark-600 px-6 py-3 flex items-center justify-between bg-dark-900">
        <div>
          <p className="text-xs text-slate-600">Reinicie o servidor para aplicar RAM e alterações do server.properties</p>
          {saveError && <p className="text-xs text-red-400 mt-1">{saveError}</p>}
          {!saveError && dirty && <p className="text-xs text-amber-400/80 mt-1">Alterações não salvas</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-500/20"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}

const input = 'w-full bg-dark-700 border border-dark-500 hover:border-brand-400/30 focus:border-brand-400/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none transition-colors'

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-brand-400">{icon}</div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="space-y-3 pl-5 border-l border-dark-600">
        {children}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-medium mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, desc, value, onChange, compact }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void; compact?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-full flex items-center justify-between text-left transition-colors rounded-xl border px-3.5 py-3
        ${value ? 'bg-brand-400/8 border-brand-400/20' : 'bg-dark-700 border-dark-600 hover:border-dark-500'}`}
    >
      <div className="min-w-0 mr-3">
        <p className={`text-sm font-semibold ${value ? 'text-white' : 'text-slate-400'}`}>{label}</p>
        {!compact && desc && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <div className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${value ? 'bg-brand-500' : 'bg-dark-500'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${value ? 'left-5' : 'left-0.5'}`} />
      </div>
    </button>
  )
}
