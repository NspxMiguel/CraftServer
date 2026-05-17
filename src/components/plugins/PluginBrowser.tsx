import { useState, useEffect, useRef } from 'react'
import { Search, Download, Loader2, Trash2, Puzzle, Package, Check, Database, Pickaxe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useServerStore } from '../../store/serverStore'
import type { Plugin, ServerType } from '../../types'

const isElectron = typeof window !== 'undefined' && !!window.electron

const QUICK_SEARCHES: Record<string, string[]> = {
  paper:  ['essentials', 'luckperms', 'worldedit', 'economy', 'anti-grief', 'chat', 'shop', 'coreprotect'],
  purpur: ['essentials', 'luckperms', 'worldedit', 'economy', 'anti-grief', 'chat', 'shop', 'coreprotect'],
  hybrid: ['essentials', 'luckperms', 'worldedit', 'economy', 'anti-grief', 'chat', 'shop', 'coreprotect'],
  fabric: ['sodium', 'lithium', 'carpet', 'styled-chat', 'ledger', 'fabric-api', 'chunky', 'bluemap'],
  vanilla: [],
  bedrock: [],
}

function loaderFor(type: ServerType): 'paper' | 'fabric' {
  return type === 'fabric' ? 'fabric' : 'paper'
}

export default function PluginBrowser() {
  const { servers, selectedId } = useServerStore()
  const server = servers.find(s => s.id === selectedId)
  const type = (server?.type ?? 'paper') as ServerType

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Plugin[]>([])
  const [installed, setInstalled] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [tab, setTab] = useState<'browse' | 'installed'>('browse')
  const [justInstalled, setJustInstalled] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const noPluginSupport = type === 'vanilla' || type === 'bedrock'

  const loadInstalled = () => {
    if (!isElectron || !selectedId) return
    window.electron.getInstalledPlugins(selectedId).then(setInstalled)
  }

  useEffect(() => {
    setQuery('')
    setResults([])
    setJustInstalled(new Set())
    if (!noPluginSupport) loadInstalled()
  }, [selectedId, type])

  // Live search with debounce
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { handleSearch(query) }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const handleSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!isElectron || !trimmed || noPluginSupport) return
    setLoading(true)
    setResults([])

    const isFabric = loaderFor(type) === 'fabric'

    const [modrinthRes, hangarRes] = await Promise.all([
      window.electron.searchPlugins(trimmed, loaderFor(type), server?.version).catch(() => [] as Plugin[]),
      // Hangar only for bukkit-compatible servers
      (!isFabric && window.electron.searchHangar)
        ? window.electron.searchHangar(trimmed).catch(() => [] as Plugin[])
        : Promise.resolve([] as Plugin[]),
    ])

    // Merge & deduplicate by title (Modrinth first, then Hangar)
    const seen = new Set<string>()
    const merged = [...modrinthRes, ...hangarRes].filter(p => {
      const key = p.title.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    setResults(merged)
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

  /* ── Unsupported server types ── */
  if (type === 'vanilla') return (
    <div className="h-full flex flex-col items-center justify-center gap-5 text-center px-10">
      <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-500 flex items-center justify-center">
        <Database size={24} className="text-slate-600" />
      </div>
      <div>
        <p className="text-white font-bold text-base">Vanilla não suporta plugins</p>
        <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">
          Servidores Vanilla puro não têm API de plugins. Para usar plugins, mude o tipo do servidor para <strong className="text-brand-300">Paper</strong> ou <strong className="text-brand-300">Purpur</strong>.
        </p>
        <p className="text-slate-600 text-xs mt-3">
          Quer extensões sem plugins? Use <span className="text-slate-400">Datapacks</span> — coloque na pasta{' '}
          <code className="font-mono text-[11px] bg-dark-700 px-1.5 py-0.5 rounded">world/datapacks/</code>
        </p>
      </div>
    </div>
  )

  if (type === 'bedrock') return (
    <div className="h-full flex flex-col items-center justify-center gap-5 text-center px-10">
      <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-500 flex items-center justify-center">
        <Pickaxe size={24} className="text-slate-600" />
      </div>
      <div>
        <p className="text-white font-bold text-base">Plugins PowerNukkit</p>
        <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">
          Servidores Bedrock (PowerNukkit) usam um sistema de plugins próprio, incompatível com Modrinth/Bukkit.
        </p>
        <p className="text-slate-600 text-xs mt-3 leading-relaxed">
          Baixe plugins PowerNukkit diretamente em{' '}
          <span className="text-brand-300 font-medium">cloudburstmc.org/software/nukkit</span>{' '}
          e coloque na pasta <code className="font-mono text-[11px] bg-dark-700 px-1.5 py-0.5 rounded">plugins/</code> do servidor.
        </p>
        <p className="text-slate-700 text-xs mt-2">
          Tip: Quer Java + Bedrock no mesmo servidor? Use o tipo <strong className="text-slate-500">Hybrid</strong>.
        </p>
      </div>
    </div>
  )

  /* ── Supported types: paper, purpur, fabric, hybrid ── */
  const quickSearches = QUICK_SEARCHES[type] ?? QUICK_SEARCHES.paper
  const loaderLabel = type === 'fabric' ? 'Modrinth · Fabric' : 'Modrinth + Hangar · Bukkit/Paper'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-7 pb-4 border-b border-dark-600">
        <div>
          <h1 className="text-sm font-bold text-white">Plugins</h1>
          <p className="text-xs text-slate-600 mt-0.5">{server?.name} · {loaderLabel}</p>
        </div>
        <div className="flex bg-dark-800 rounded-xl p-1 gap-0.5 border border-dark-600">
          {(['browse', 'installed'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'installed') loadInstalled() }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${tab === t ? 'bg-dark-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t === 'browse'
                ? <><Search size={11} />Buscar</>
                : <><Package size={11} />Instalados <span className="ml-0.5 text-slate-700">({installed.length})</span></>
              }
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {tab === 'browse' && (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4 pb-3">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  {loading && (
                    <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 animate-spin" />
                  )}
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={type === 'fabric' ? 'Buscar mods Fabric (busca automática)...' : 'Buscar plugins — Modrinth + Hangar (busca automática)...'}
                    className="w-full bg-dark-700 border border-dark-500 hover:border-brand-400/30 focus:border-brand-400/60 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none transition-colors"
                  />
                </div>

                {results.length === 0 && !loading && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {quickSearches.map(q => (
                      <button
                        key={q}
                        onClick={() => setQuery(q)}
                        className="px-3 py-1 bg-dark-700 hover:bg-dark-600 border border-dark-500 hover:border-dark-400 text-slate-500 hover:text-slate-300 rounded-full text-xs transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto px-6 pb-6 space-y-2">
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-slate-600 py-16">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Buscando plugins...</span>
                  </div>
                )}

                {!loading && results.length === 0 && query.trim() && (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Puzzle size={28} className="text-slate-700" />
                    <p className="text-slate-600 text-sm">Nenhum resultado para "{query}"</p>
                    <p className="text-slate-700 text-xs">Tente outro nome ou verifique a conexão com a internet.</p>
                  </div>
                )}

                {results.map((plugin, i) => {
                  const isInstalling = installing === plugin.project_id
                  const alreadyInstalled = justInstalled.has(plugin.project_id)
                  const isHangar = plugin.source === 'hangar'
                  return (
                    <motion.div
                      key={plugin.project_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.18 }}
                      className="flex items-center gap-3.5 p-3.5 bg-dark-800 hover:bg-dark-750 border border-dark-600 hover:border-dark-500 rounded-2xl transition-all"
                    >
                      {plugin.icon_url ? (
                        <img src={plugin.icon_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 border border-dark-500" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-dark-700 border border-dark-500 flex items-center justify-center shrink-0">
                          <Puzzle size={18} className="text-slate-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{plugin.title}</p>
                          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isHangar
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                          }`}>
                            {isHangar ? 'Hangar' : 'Modrinth'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{plugin.description}</p>
                        <p className="text-[11px] text-slate-700 mt-1">{plugin.downloads?.toLocaleString()} downloads</p>
                      </div>
                      <button
                        onClick={() => handleInstall(plugin)}
                        disabled={isInstalling || alreadyInstalled}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0
                          ${alreadyInstalled
                            ? 'bg-brand-500/15 border border-brand-500/20 text-brand-400 cursor-default'
                            : 'bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 hover:border-brand-500/40 text-brand-400 disabled:opacity-50'
                          }`}
                      >
                        {isInstalling
                          ? <Loader2 size={12} className="animate-spin" />
                          : alreadyInstalled
                            ? <><Check size={12} />Instalado</>
                            : <><Download size={12} />Instalar</>
                        }
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
                  <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-500 flex items-center justify-center">
                    <Package size={24} className="text-slate-700" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">Nenhum plugin instalado</p>
                    <p className="text-slate-600 text-xs mt-1">Busque e instale plugins na aba Buscar</p>
                  </div>
                </div>
              ) : (
                installed.map((filename, i) => (
                  <motion.div
                    key={filename}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3.5 p-3.5 bg-dark-800 border border-dark-600 rounded-2xl group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <Puzzle size={14} className="text-brand-400" />
                    </div>
                    <span className="flex-1 text-sm text-slate-300 font-mono truncate">{filename}</span>
                    <button
                      onClick={() => handleRemove(filename)}
                      className="p-1.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
