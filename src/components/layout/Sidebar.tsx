import { LayoutGrid, Plus, Puzzle, Settings, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Page } from '../../App'
import { useServerStore } from '../../store/serverStore'

interface Props { page: Page; navigate: (p: Page) => void }

const nav = [
  { id: 'dashboard', icon: LayoutGrid, label: 'Servidores' },
  { id: 'create',    icon: Plus,        label: 'Criar Servidor' },
  { id: 'plugins',   icon: Puzzle,      label: 'Plugins'        },
] as const

export default function Sidebar({ page, navigate }: Props) {
  const { runningIds, selectedId } = useServerStore()
  const running = runningIds.size

  return (
    <aside className="w-56 flex flex-col bg-dark-900 border-r border-brand-400/10 shrink-0 drag-region relative overflow-hidden">
      {/* Top glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-8 no-drag">
        <div className="relative w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10" />
          <Cpu size={18} className="text-white relative z-10" strokeWidth={2} />
        </div>
        <div>
          <p className="font-bold text-sm text-white tracking-tight leading-none">CraftServer</p>
          <p className="text-[10px] text-brand-400/70 font-medium mt-0.5">Server Manager</p>
        </div>
      </div>

      {/* Nav section */}
      <nav className="flex-1 px-3 space-y-0.5 no-drag">
        <p className="text-[10px] font-bold text-dark-300 uppercase tracking-widest px-3 pb-2.5">Navegação</p>
        {nav.map(({ id, icon: Icon, label }) => {
          const active = page === id
          const disabled = id === 'plugins' && !selectedId
          return (
            <button
              key={id}
              disabled={disabled}
              onClick={() => !disabled && navigate(id as Page)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${active
                  ? 'text-white'
                  : disabled
                    ? 'text-dark-300 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-bg"
                  className="absolute inset-0 rounded-lg bg-brand-500/10 border border-brand-400/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <div className={`relative z-10 w-7 h-7 rounded-md flex items-center justify-center transition-colors
                ${active ? 'bg-brand-400/20 text-brand-300' : 'text-current'}`}>
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              </div>
              <span className="relative z-10 text-[13px]">{label}</span>
              {active && <motion.div layoutId="sidebar-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 relative z-10" />}
            </button>
          )
        })}
      </nav>

      {/* Status + Settings */}
      <div className="px-3 pb-6 space-y-1 no-drag">
        {running > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-400/10 border border-brand-400/20 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" />
            </span>
            <span className="text-[12px] text-brand-300 font-semibold">{running} servidor{running > 1 ? 'es' : ''} ativo{running > 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="h-px bg-brand-400/10 mx-2 mb-2" />

        <button
          onClick={() => navigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all
            ${page === 'settings'
              ? 'bg-brand-500/10 border border-brand-400/20 text-brand-300'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
            }`}
        >
          <div className="w-7 h-7 rounded-md flex items-center justify-center">
            <Settings size={15} strokeWidth={1.8} />
          </div>
          Configurações
        </button>
      </div>

      {/* Bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-400/20 to-transparent" />
    </aside>
  )
}
