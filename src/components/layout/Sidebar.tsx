import { LayoutGrid, Plus, Puzzle, Settings, Boxes } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Page } from '../../App'
import { useServerStore } from '../../store/serverStore'

interface Props {
  page: Page
  navigate: (p: Page) => void
}

const nav = [
  { id: 'dashboard', icon: LayoutGrid, label: 'Servidores' },
  { id: 'create',    icon: Plus,        label: 'Criar'      },
  { id: 'plugins',   icon: Puzzle,      label: 'Plugins'    },
] as const

export default function Sidebar({ page, navigate }: Props) {
  const { runningIds, selectedId } = useServerStore()
  const running = runningIds.size

  return (
    <aside className="w-52 flex flex-col border-r border-white/[0.06] bg-[#0d0d0d] shrink-0 drag-region">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-6 no-drag">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Boxes size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-white text-sm tracking-tight">CraftNest</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 no-drag">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 pb-2">Menu</p>
        {nav.map(({ id, icon: Icon, label }) => {
          const active = page === id
          const disabled = id === 'plugins' && !selectedId
          return (
            <button
              key={id}
              disabled={disabled}
              onClick={() => !disabled && navigate(id as Page)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-brand-500/15 text-brand-400'
                  : disabled
                    ? 'text-zinc-700 cursor-not-allowed'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-brand-500/10 border border-brand-500/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className="shrink-0 relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-0.5 no-drag">
        {running > 0 && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-xs text-brand-400 font-medium">{running} rodando</span>
          </div>
        )}
        <button
          onClick={() => navigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
            ${page === 'settings' ? 'bg-brand-500/15 text-brand-400' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'}`}
        >
          <Settings size={16} strokeWidth={1.8} />
          Configurações
        </button>
      </div>
    </aside>
  )
}
