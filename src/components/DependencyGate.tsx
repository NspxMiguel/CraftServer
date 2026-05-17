import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, CheckCircle2, XCircle, RefreshCw, Flame, Coffee } from 'lucide-react'
import { useT } from '../i18n'

const isElectron = typeof window !== 'undefined' && !!window.electron

interface DepState {
  java: { ok: boolean; version: string | null; cmd: string | null }
}

interface Props { children: React.ReactNode }

export default function DependencyGate({ children }: Props) {
  const t = useT()
  const [state, setState] = useState<'checking' | 'ok' | 'missing'>('checking')
  const [deps, setDeps] = useState<DepState | null>(null)
  const [rechecking, setRechecking] = useState(false)

  const check = async () => {
    if (!isElectron) { setState('ok'); return }
    const result = await window.electron.checkDependencies()
    setDeps(result)
    setState(result.java.ok ? 'ok' : 'missing')
  }

  const recheck = async () => {
    setRechecking(true)
    await check()
    setRechecking(false)
  }

  useEffect(() => { check() }, [])

  if (state === 'ok') return <>{children}</>

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-900 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-dark bg-grid opacity-100 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-brand-500/8 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Flame size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">CraftServer</span>
        </div>

        {state === 'checking' && (
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">{t.checkingDeps}</p>
          </div>
        )}

        {state === 'missing' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-white font-bold text-lg">{t.missingDeps}</p>
              <p className="text-slate-500 text-sm mt-1">{t.missingDepsDesc}</p>
            </div>

            {/* Java card */}
            <AnimatePresence>
              {deps && !deps.java.ok && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-dark-800 border border-red-500/20 rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <XCircle size={18} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm">{t.javaRequired}</p>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                        {t.javaRequiredDesc}
                      </p>
                      <p className="text-red-400/70 text-[11px] font-mono mt-1.5">
                        {deps.java.version ? `${t.javaOld}: ${deps.java.version} ${t.javaTooOld}` : t.javaNotFound}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => isElectron && window.electron.openExternal('https://adoptium.net/temurin/releases/?version=25')}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download size={14} />
                    {t.javaInstallBtn}
                  </button>
                </motion.div>
              )}

              {deps && deps.java.ok && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-dark-800 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3"
                >
                  <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                  <div>
                    <p className="text-white font-bold text-sm">Java {deps.java.version}</p>
                    <p className="text-slate-600 text-xs">{t.javaInstalled}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Re-check button */}
            <button
              onClick={recheck}
              disabled={rechecking}
              className="w-full flex items-center justify-center gap-2 py-3 bg-dark-700 hover:bg-dark-600 border border-brand-500/30 hover:border-brand-500/60 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={rechecking ? 'animate-spin text-brand-400' : 'text-brand-400'} />
              {rechecking ? t.rechecking : t.recheckBtn}
            </button>

            <p className="text-center text-xs text-dark-400 flex items-center justify-center gap-1.5">
              <Coffee size={11} />
              {t.recheckNote}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
