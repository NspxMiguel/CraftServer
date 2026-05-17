import { useState, useEffect } from 'react'
import { Save, RefreshCw, Globe, Shield, Gamepad2, Mountain, Zap, Image, Info, Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

const isElectron = typeof window !== 'undefined' && !!window.electron

interface Props { serverId: string; serverType: string }

const GAMEMODES = ['survival', 'creative', 'adventure', 'spectator']
const DIFFICULTIES = ['peaceful', 'easy', 'normal', 'hard']

export default function ServerSettings({ serverId, serverType }: Props) {
  const [props, setProps] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isBedrock = serverType === 'bedrock'

  useEffect(() => {
    if (!isElectron || isBedrock) { setLoading(false); return }
    window.electron.getServerProperties(serverId).then(p => {
      setProps(p || {})
      setLoading(false)
    })
  }, [serverId])

  const set = (key: string, value: any) => setProps(p => ({ ...p, [key]: value }))

  const handleSave = async () => {
    if (!isElectron) return
    setSaving(true)
    await window.electron.setServerProperties(serverId, props)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      <Loader2 size={20} className="animate-spin mr-2" /> Carregando configurações...
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
        <p className="text-xs text-slate-600">Reinicie o servidor para aplicar as alterações</p>
        <button
          onClick={handleSave}
          disabled={saving}
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
