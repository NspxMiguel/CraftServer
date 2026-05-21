import { useEffect, useState } from 'react'
import { LayoutGrid, Plus, Puzzle, Settings, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Page } from '../../App'
import { useServerStore } from '../../store/serverStore'
import { useT } from '../../i18n'

interface Props { page: Page; navigate: (p: Page) => void }

const isElectron = typeof window !== 'undefined' && !!window.electron

export default function TopBar({ page, navigate }: Props) {
  const t = useT()
  const { runningIds, selectedId } = useServerStore()
  const running = runningIds.size
  const [isWindows, setIsWindows] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  const NAV = [
    { id: 'dashboard', label: t.nav_servers, icon: LayoutGrid },
    { id: 'create',    label: t.nav_create,  icon: Plus        },
    { id: 'plugins',   label: t.nav_plugins, icon: Puzzle      },
  ] as const

  useEffect(() => {
    if (!isElectron) return
    window.electron.getPlatform?.().then(p => setIsWindows(p === 'win32'))
    window.electron.windowIsMaximized?.().then(setIsMaximized)
  }, [])

  const winCtrl = async (action: 'minimize' | 'maximize' | 'close') => {
    if (!isElectron) return
    await window.electron.windowControl?.(action)
    if (action === 'maximize') {
      window.electron.windowIsMaximized?.().then(setIsMaximized)
    }
  }

  return (
    <header
      className="drag-region shrink-0 flex items-stretch border-b border-dark-600 relative z-10"
      style={{ height: 52, background: 'linear-gradient(180deg, #1a1916 0%, #141310 100%)' }}
    >
      {/* Bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/35 to-transparent pointer-events-none" />

      {/* Logo — full-height bordered panel */}
      <div className="no-drag flex items-center gap-2.5 px-5 shrink-0 border-r border-dark-600/80 bg-dark-800/40 self-stretch">
        <Flame size={16} className="text-brand-400" strokeWidth={2} />
        <span className="font-bold text-[13px] text-white tracking-tight">CraftServer</span>
      </div>

      {/* Nav — underline-style tabs, full height */}
      <nav className="no-drag flex items-stretch gap-0 flex-1">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id
          const disabled = id === 'plugins' && !selectedId
          return (
            <button
              key={id}
              disabled={disabled}
              onClick={() => !disabled && navigate(id as Page)}
              className={`relative no-drag flex items-center gap-2 px-4 text-[13px] font-medium transition-all duration-150
                ${active
                  ? 'text-white'
                  : disabled
                    ? 'text-dark-400 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
            >
              {/* Active bottom underline */}
              {active && (
                <motion.div
                  layoutId="topnav-underline"
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-brand-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              {/* Active top glow */}
              {active && (
                <div className="absolute inset-0 bg-gradient-to-b from-brand-500/8 to-transparent pointer-events-none" />
              )}
              <Icon size={13} strokeWidth={active ? 2.2 : 1.8} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Windows drag hint */}
      {isWindows && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-[3px] opacity-[0.1] pointer-events-none select-none">
          <div className="flex gap-[3px]">
            {[0,1,2,3,4].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full bg-slate-400" />)}
          </div>
          <div className="flex gap-[3px]">
            {[0,1,2,3,4].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full bg-slate-400" />)}
          </div>
        </div>
      )}

      {/* Right side */}
      <div className="no-drag flex items-center gap-2 px-4 shrink-0">
        {running > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-400" />
            </span>
            <span className="text-[11px] text-brand-300 font-semibold font-mono">{running} online</span>
          </div>
        )}
        <button
          onClick={() => navigate('settings')}
          className={`p-1.5 rounded-lg transition-all
            ${page === 'settings'
              ? 'bg-brand-500/15 border border-brand-500/25 text-brand-300'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
            }`}
          title={t.nav_settings}
        >
          <Settings size={15} strokeWidth={1.8} />
        </button>

        {/* Windows title bar controls */}
        {isWindows && (
          <div className="flex items-center ml-2 -mr-4">
            <button
              onClick={() => winCtrl('minimize')}
              className="no-drag w-11 h-[52px] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              title={t.minimize}
            >
              <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg>
            </button>
            <button
              onClick={() => winCtrl('maximize')}
              className="no-drag w-11 h-[52px] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              title={isMaximized ? t.restore : t.maximize}
            >
              {isMaximized ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="2" y="0" width="8" height="8"/>
                  <path d="M0 2v8h8"/>
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="0" y="0" width="10" height="10"/>
                </svg>
              )}
            </button>
            <button
              onClick={() => winCtrl('close')}
              className="no-drag w-11 h-[52px] flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-600 transition-colors"
              title={t.close}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="0" y1="0" x2="10" y2="10"/>
                <line x1="10" y1="0" x2="0" y2="10"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
