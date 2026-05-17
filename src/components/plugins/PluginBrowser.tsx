import { useState, useEffect } from 'react'
import { Search, Download, Loader2, Trash2, Puzzle, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import { useServerStore } from '../../store/serverStore'
import type { Plugin } from '../../types'

const isElectron = typeof window !== 'undefined' && !!window.electron

export default function PluginBrowser() {
  const { servers, selectedId } = useServerStore()
  const server = servers.find(s => s.id === selectedId)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Plugin[]>([])
  const [installed, setInstalled] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [tab, setTab] = useState<'browse' | 'installed'>('browse')

  const loadInstalled = () => {
    if (!isElectron || !selectedId) return
    window.electron.getInstalledPlugins(selectedId).then(setInstalled)
  }

  useEffect(() => { loadInstalled() }, [selectedId])

  const handleSearch = async (q = query) => {
    if (!isElectron || !q.trim()) return
    setLoading(true)
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
    setInstalling(null)
  }

  const handleRemove = async (filename: string) => {
    if (!isElectron || !selectedId) return
    await window.electron.removePlugin(selectedId, filename)
    loadInstalled()
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Plugins</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{server?.name}</p>
        </div>
        <div className="flex gap-1">
          {(['browse', 'installed'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'installed') loadInstalled() }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? 'bg-surface-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t === 'browse' ? <><Search size={11} className="inline mr-1" />Buscar</> : <><Package size={11} className="inline mr-1" />Instalados ({installed.length})</>}
            </button>
          ))}
        </div>
      </div>

      {tab === 'browse' && (
        <>
          {/* Search bar */}
          <form onSubmit={e => { e.preventDefault(); handleSearch() }} className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar plugins no Modrinth..."
                className="w-full bg-surface-700 border border-surface-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors">
              Buscar
            </button>
          </form>

          {/* Popular quick-search */}
          {results.length === 0 && !loading && (
            <div className="mb-4">
              <p className="text-xs text-zinc-600 mb-2">Buscas rápidas</p>
              <div className="flex flex-wrap gap-2">
                {['essentials', 'luckperms', 'worldedit', 'worldguard', 'vault', 'economy', 'chat', 'anti-grief'].map(q => (
                  <button
                    key={q}
                    onClick={() => { setQuery(q); handleSearch(q) }}
                    className="px-3 py-1 bg-surface-700 hover:bg-surface-600 text-zinc-400 hover:text-white rounded-full text-xs transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-zinc-400 py-12">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Buscando...</span>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-auto space-y-2">
            {results.map((plugin, i) => (
              <motion.div
                key={plugin.project_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3.5 bg-surface-800 border border-surface-700 hover:border-surface-600 rounded-xl"
              >
                {plugin.icon_url ? (
                  <img src={plugin.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
                    <Puzzle size={18} className="text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{plugin.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{plugin.description}</p>
                  <p className="text-xs text-zinc-700 mt-0.5">{plugin.downloads?.toLocaleString()} downloads</p>
                </div>
                <button
                  onClick={() => handleInstall(plugin)}
                  disabled={installing === plugin.project_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                >
                  {installing === plugin.project_id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  Instalar
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {tab === 'installed' && (
        <div className="flex-1 overflow-auto space-y-2">
          {installed.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Package size={28} className="text-zinc-600" />
              <p className="text-zinc-500 text-sm">Nenhum plugin instalado</p>
            </div>
          ) : (
            installed.map((filename, i) => (
              <motion.div
                key={filename}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3.5 bg-surface-800 border border-surface-700 rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Puzzle size={14} className="text-brand-400" />
                </div>
                <span className="flex-1 text-sm text-zinc-300 font-mono truncate">{filename}</span>
                <button
                  onClick={() => handleRemove(filename)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
