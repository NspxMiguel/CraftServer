import { useState } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { setLang, type Lang } from '../i18n'

interface Props { onDone: () => void }

export default function FirstLaunchLang({ onDone }: Props) {
  const [selected, setSelected] = useState<Lang>('pt')

  const handleContinue = () => {
    setLang(selected)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-dark-900 relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 bg-grid-dark bg-grid opacity-100 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-brand-500/8 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 22 }}
        className="relative z-10 flex flex-col items-center max-w-sm w-full px-8"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-xl shadow-brand-500/30">
            <Flame size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">CraftServer</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white text-center mb-2">
          {selected === 'pt' ? 'Bem-vindo!' : 'Welcome!'}
        </h1>
        <p className="text-slate-500 text-sm text-center mb-8">
          {selected === 'pt' ? 'Escolha o idioma da interface:' : 'Choose your interface language:'}
        </p>

        {/* Language cards */}
        <div className="flex flex-col gap-3 w-full mb-8">
          {([
            { lang: 'pt' as Lang, label: '🇧🇷 Português', sub: 'Padrão recomendado' },
            { lang: 'en' as Lang, label: '🇺🇸 English', sub: 'Recommended default' },
          ]).map(({ lang, label, sub }) => (
            <button
              key={lang}
              onClick={() => setSelected(lang)}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left
                ${selected === lang
                  ? 'bg-brand-500/15 border-brand-400/60 shadow-lg shadow-brand-500/15'
                  : 'bg-dark-800 border-dark-600 hover:border-dark-500'
                }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                ${selected === lang ? 'border-brand-400 bg-brand-400' : 'border-dark-400'}`}>
                {selected === lang && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-white"
                  />
                )}
              </div>
              <div>
                <p className="text-white font-bold text-base">{label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="w-full py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-base transition-all shadow-lg shadow-brand-500/25 hover:scale-[1.02] active:scale-[0.98]"
        >
          {selected === 'pt' ? 'Continuar →' : 'Continue →'}
        </button>
      </motion.div>
    </div>
  )
}
