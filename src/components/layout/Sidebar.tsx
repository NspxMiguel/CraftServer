import { LayoutGrid, Plus, Puzzle, Settings, Server, Boxes } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Page } from '../../App'
import { useServerStore } from '../../store/serverStore'

interface Props {
  page: Page
  navigate: (p: Page) => void
}

const items = [
  { id: 'dashboard', icon: LayoutGrid, label: 'Servidores' },
  { id: 'create',    icon: Plus,        label: 'Criar'      },
  { id: 'plugins',   icon: Puzzle,      label: 'Plugins'    },
  { id: 'settings',  icon: Settings,    label: 'Config'     },
] as const

export default function Sidebar({ page, navigate }: Props) {
  const { servers, runningIds, selectedId, setSelected } = useServerStore()
  const running = runningIds.size

  return (
    <aside className="w-16 flex flex-col items-center py-4 gap-1 border-r border-surface-700 bg-surface-800 shrink-0 drag-region">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center mb-4 no-drag">
        <Boxes size={20} className="text-white" strokeWidth={2} />
      </div>

      {items.map(({ id, icon: Icon, label }) => {
        const active = page === id
        const disabled = (id === 'plugins') && !selectedId
        return (
          <button
            key={id}
            title={label}
            disabled={disabled}
            onClick={() => !disabled && navigate(id as Page)}
            className={`no-drag relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-150
              ${active
                ? 'bg-brand-500 text-white'
                : disabled
                  ? 'text-surface-500 cursor-not-allowed'
                  : 'text-zinc-400 hover:bg-surface-600 hover:text-white'
              }`}
          >
            <Icon size={18} strokeWidth={1.8} />
            {active && (
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute left-0 w-0.5 h-5 bg-brand-400 rounded-r-full -translate-x-[1px]"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
          </button>
        )
      })}

      {/* Running badge */}
      {running > 0 && (
        <div className="mt-auto mb-1 no-drag">
          <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" title={`${running} servidor(es) rodando`} />
        </div>
      )}
    </aside>
  )
}
