import { useState, useEffect } from 'react'
import { Search, Download, Loader2, Trash2, Puzzle, Package, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useServerStore } from '../../store/serverStore'
import type { Plugin } from '../../types'

const isElectron = typeof window !== 'undefined' && !!window.electron

const QUICK_SEARCHES = ['essentials', 'luckperms', 'worldedit', 'economy', 'anti-grief', 'chat', 'teleport', 'shop']

export default function PluginBrowser() {
  const { servers, selectedId } = useServerStore()
  const server = servers.find(s => s.id === selectedId)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Plugin[]>([])
  const [installed, setInstalled] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [tab, setTab] = useState<'browse' | 'installed'>('browse')
  const [justInstalled, setJustInstalled] = useState<Set<string>>(new Set())

  const loadInstalled = () => {
    if (!isElectron || !selectedId) return
    window.electron.getInstalledPlugins(selectedId).then(setInstalled)
  }

  useEffect(() => { loadInstalled() }, [selectedId])

  const handleSearch = async (q = query) => {
    if (!isElectron || !q.trim()) return
    setLoading(true)
    setResults([])
    const loader = server?.type === 'fabric' ? 'fabric' : 'paper'
    const res = await window.electron.searchPlugins(q.trim(), loader)
    setResults(res)
    setLoading(false)
  }

  const handleInstall = async (plugin: Plugin) => {
    if (!isElectron || !selectedId) return
    setInstalling(plugin.project_id)
    await window.electron.installPlugin(selectedId, plugin.project_id, plugin.title)
    loadInstalled()
    setJustInstalled(s => new Set([...s, plugin.project_id]))
    setInstalling(null)
  }

  const handleRemove = async (filename: string) => {
    if (!isElectron || !selectedId) return
    await window.electron.removePlugin(selectedId, filename)
    loadInstalled()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-5 border-b border-white/[0.05]">
        <div>
          <h1 className="text-lg font-bold text-white">Plugins</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{server?.name} · {server?.type}</p>
        </div>
        <div className="flex bg-white/[0.04] rounded-xl p-1 gap-0.5">
          {(['browse', 'installed'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'installed') loadInstalled() }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${tab === t ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t === 'browse' ? <><Search size={11} />Buscar</> : <><Package size={11} />Instalados <span className="ml-0.5 text-zinc-600">({installed.length})</span></>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {tab === 'browse' && (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
              {/* Search */}
              <div className="px-6 pt-4 pb-3">
                <form onSubmit={e => { e.preventDefault(); handleSearch() }} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Buscar plugins no Modrinth..."
                      className="w-full bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.13] focus:border-brand-500/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none transition-colors"
                    />
                  </div>
                  <button type="submit" className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-brand-500/20">
                    Buscar
                  </button>
                </form>

                {/* Quick searches */}
                {results.length === 0 && !loading && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {QUICK_SEARCHES.map(q => (
                      <button
                        key={q}
                        onClick={() => { setQuery(q); handleSearch(q) }}
                        className="px-3 py-1 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-zinc-500 hover:text-zinc-300 rounded-full text-xs transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="flex-1 overflow-auto px-6 pb-6 space-y-2">
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-zinc-600 py-16">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Buscando no Modrinth...</span>
                  </div>
                )}

                {!loading && results.length === 0 && query && (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Puzzle size={28} className="text-zinc-700" />
                    <p className="text-zinc-600 text-sm">Nenhum resultado para "{query}"</p>
                  </div>
                )}

                {results.map((plugin, i) => {
                  const isInstalling = installing === plugin.project_id
                  const installed_ = justInstalled.has(plugin.project_id)
                  return (
                    <motion.div
                      key={plugin.project_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.2 }}
                      className="flex items-center gap-3.5 p-3.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-white/[0.1] rounded-2xl transition-all"
                    >
                      {plugin.icon_url ? (
                        <img src={plugin.icon_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/[0.08]" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                          <Puzzle size={18} className="text-zinc-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{plugin.title}</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{plugin.description}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={9} className="text-zinc-700" />
                          <span className="text-[11px] text-zinc-700">{plugin.downloads?.toLocaleString()} downloads</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInstall(plugin)}
                        disabled={isInstalling || installed_}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0
                          ${installed_
                            ? 'bg-brand-500/15 border border-brand-500/20 text-brand-400 cursor-default'
                            : 'bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/15 hover:border-brand-500/30 text-brand-400 disabled:opacity-50'
                          }`}
                      >
                        {isInstalling ? <Loader2 size={12} className="animate-spin" /> : installed_ ? <><Check size={12} />Instalado</> : <><Download size={12} />Instalar</>}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {tab === 'installed' && (
            <motion.div key="installed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto px-6 py-4 space-y-2">
              {installed.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Package size={24} className="text-zinc-700" />
                  </div>
                  <div>
                    <p className="text-zinc-400 font-semibold">Nenhum plugin instalado</p>
                    <p className="text-zinc-700 text-sm mt-0.5">Busque e instale plugins na aba Buscar</p>
                  </div>
                </div>
              ) : (
                installed.map((filename, i) => (
                  <motion.div
                    key={filename}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3.5 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl"
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/15 flex items-center justify-center shrink-0">
                      <Puzzle size={14} className="text-brand-400" />
                    </div>
                    <span className="flex-1 text-sm text-zinc-300 font-mono truncate">{filename}</span>
                    <button
                      onClick={() => handleRemove(filename)}
                      className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Check({ size, className, strokeWidth }: { size: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
