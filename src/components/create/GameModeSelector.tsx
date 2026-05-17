import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Check, Info, Zap, AlertTriangle } from 'lucide-react'
import { GAME_PRESETS, type GamePreset } from '../../data/gamePresets'
import { useT, getLang } from '../../i18n'

interface Props {
  onSelect: (preset: GamePreset, serverName: string) => void
  onBack: () => void
}

export default function GameModeSelector({ onSelect, onBack }: Props) {
  const t = useT()
  const lang = getLang()
  const [selected, setSelected] = useState<GamePreset | null>(null)
  const [name, setName] = useState('')

  const label = (ptStr: string, enStr: string) => lang === 'en' ? enStr : ptStr

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#08080e]/98 backdrop-blur-xl overflow-auto">
      {/* Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto w-full px-8 py-10 flex flex-col min-h-full">
        {/* Header */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-black text-white">
              {label('🎮 Escolha o Modo de Jogo', '🎮 Choose Game Mode')}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {label('Plugins e configurações instalados automaticamente', 'Plugins and settings installed automatically')}
            </p>
          </div>
        </motion.div>

        {/* Grid of modes */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
          {GAME_PRESETS.map((preset, i) => {
            const isSelected = selected?.id === preset.id
            return (
              <motion.button
                key={preset.id}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => { setSelected(preset); setName('') }}
                className={`relative text-left p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]
                  ${isSelected
                    ? `${preset.bg} ${preset.border} shadow-xl ${preset.glow}`
                    : 'bg-dark-800 border-dark-600 hover:border-dark-500'
                  }`}
              >
                {/* Ready badge */}
                {preset.readyToPlay && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 bg-green-500/15 border border-green-500/25 rounded-full">
                    <Zap size={8} className="text-green-400" />
                    <span className="text-[9px] font-bold text-green-400">
                      {label('Pronto', 'Ready')}
                    </span>
                  </div>
                )}

                <div className="text-3xl mb-2">{preset.emoji}</div>
                <p className={`font-black text-sm mb-1 ${isSelected ? preset.color : 'text-white'}`}>
                  {label(preset.name, preset.nameEN)}
                </p>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                  {label(preset.taglinePT, preset.taglineEN)}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-slate-600 font-mono">{preset.players}p</span>
                  <span className="text-[10px] text-dark-500">·</span>
                  <span className="text-[10px] text-slate-600">{preset.plugins.length} plugins</span>
                </div>

                {isSelected && (
                  <motion.div
                    layoutId="game-selected"
                    className={`absolute inset-0 rounded-2xl border-2 ${preset.border} pointer-events-none`}
                  />
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Detail panel — shown when a mode is selected */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`rounded-2xl border-2 ${selected.border} ${selected.bg} p-6 mb-6`}
            >
              <div className="flex gap-6">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{selected.emoji}</span>
                    <div>
                      <h3 className={`text-lg font-black ${selected.color}`}>
                        {label(selected.name, selected.nameEN)}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {label(selected.difficultyPT, selected.difficultyEN)}
                      </p>
                    </div>
                    {selected.readyToPlay ? (
                      <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-green-500/15 border border-green-500/25 rounded-full text-[10px] font-bold text-green-400">
                        <Check size={10} strokeWidth={3} />
                        {label('100% pronto para jogar', '100% ready to play')}
                      </span>
                    ) : (
                      <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/25 rounded-full text-[10px] font-bold text-amber-400">
                        <Info size={10} />
                        {label('Precisa de configuração extra', 'Needs extra setup')}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    {label(selected.descPT, selected.descEN)}
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
                    {(label('', '') === '' ? selected.featuresPT : selected.featuresEN).map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <Check size={11} className={`${selected.color} shrink-0 mt-0.5`} strokeWidth={3} />
                        {lang === 'en' ? selected.featuresEN[i] : selected.featuresPT[i]}
                      </div>
                    ))}
                  </div>

                  {/* Plugins list */}
                  <div className="flex flex-wrap gap-1.5">
                    {selected.plugins.map(p => (
                      <span key={p.name} className="text-[10px] px-2 py-0.5 bg-dark-700 border border-dark-600 text-slate-500 rounded-full font-mono">
                        {p.name}
                      </span>
                    ))}
                  </div>

                  {/* Note for modes that need extra setup */}
                  {!selected.readyToPlay && (selected.worldNotePT || selected.worldNoteEN) && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300/80">
                        {lang === 'en' ? selected.worldNoteEN : selected.worldNotePT}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: name input + create button */}
                <div className="w-64 shrink-0 flex flex-col justify-center gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                      {label('Nome do servidor', 'Server name')}
                    </label>
                    <input
                      autoFocus
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSelect(selected, name.trim()) }}
                      placeholder={lang === 'en' ? `My ${selected.nameEN}` : `Meu ${selected.name}`}
                      className={`w-full bg-dark-900 border ${selected.border} focus:border-opacity-80 rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none text-sm font-bold transition-colors`}
                    />
                  </div>
                  <button
                    onClick={() => name.trim() && onSelect(selected, name.trim())}
                    disabled={!name.trim()}
                    className={`w-full py-3.5 rounded-xl font-black text-white text-sm transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]
                      bg-gradient-to-r ${selected.gradient.replace('to-transparent', 'to-dark-700')} border ${selected.border}`}
                    style={{ background: undefined }}
                  >
                    <span className={`${selected.color}`}>
                      {label(`Criar ${selected.name} →`, `Create ${selected.nameEN} →`)}
                    </span>
                  </button>
                  <button
                    onClick={onBack}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors text-center"
                  >
                    {label('← Escolher outro modo', '← Choose another mode')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
