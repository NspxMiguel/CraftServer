import { LayoutGrid, Plus, Puzzle, Settings, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Page } from '../../App'
import { useServerStore } from '../../store/serverStore'

interface Props { page: Page; navigate: (p: Page) => void }

const NAV = [
  { id: 'dashboard', label: 'Servidores', icon: LayoutGrid },
  { id: 'create',    label: 'Criar',      icon: Plus        },
  { id: 'plugins',   label: 'Plugins',    icon: Puzzle      },
] as const

export default function TopBar({ page, navigate }: Props) {
  const { runningIds, selectedId } = useServerStore()
  const running = runningIds.size

  return (
    <header className="drag-region shrink-0 flex items-center gap-0 px-4 border-b border-dark-600 bg-dark-900 relative z-10" style={{ height: 52 }}>
      {/* Subtle bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/25 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="no-drag flex items-center gap-2.5 mr-6 shrink-0">
        <div className="relative w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600" />
          <Flame size={14} className="text-white relative z-10" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[13px] text-white tracking-tight">CraftServer</span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-dark-600 mr-4 shrink-0" />

      {/* Nav */}
      <nav className="no-drag flex items-center gap-0.5 flex-1">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id
          const disabled = id === 'plugins' && !selectedId
          return (
            <button
              key={id}
              disabled={disabled}
              onClick={() => !disabled && navigate(id as Page)}
              className={`relative no-drag flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all
                ${active
                  ? 'text-white'
                  : disabled
                    ? 'text-dark-400 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`}
            >
              {active && (
                <motion.div
                  layoutId="topnav-bg"
                  className="absolute inset-0 rounded-lg bg-brand-500/15 border border-brand-500/25"
                  transition={{ type: 'spring', stiffness: 450, damping: 38 }}
                />
              )}
              <Icon size={13} strokeWidth={active ? 2.3 : 1.9} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Right side */}
      <div className="no-drag flex items-center gap-2 shrink-0">
        {running > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-400" />
            </span>
            <span className="text-[11px] text-brand-300 font-semibold">{running} online</span>
          </div>
        )}
        <button
          onClick={() => navigate('settings')}
          className={`p-1.5 rounded-lg text-[13px] transition-all
            ${page === 'settings'
              ? 'bg-brand-500/15 border border-brand-500/25 text-brand-300'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            }`}
          title="Configurações"
        >
          <Settings size={15} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}
