import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, FileText, AlertTriangle, Info, Bug, FolderOpen } from 'lucide-react'

const isElectron = typeof window !== 'undefined' && !!window.electron
type Filter = 'all' | 'info' | 'warn' | 'error'

function levelOf(line: string): Filter {
  if (line.includes('[ERROR]')) return 'error'
  if (line.includes('[WARN]')) return 'warn'
  if (line.includes('[INFO]')) return 'info'
  return 'all'
}

export default function ErrorLogViewer() {
  const [lines, setLines] = useState<string[]>([])
  const [path, setPath] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!isElectron) return
    setLoading(true)
    setError('')
    try {
      const [recent, logPath] = await Promise.all([
        window.electron.getRecentLogs?.(500) ?? Promise.resolve([]),
        window.electron.getLogPath?.() ?? Promise.resolve(''),
      ])
      setLines(recent)
      setPath(logPath)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const visible = useMemo(() => {
    if (filter === 'all') return lines
    return lines.filter(line => levelOf(line) === filter)
  }, [filter, lines])

  const counts = useMemo(() => ({
    all: lines.length,
    info: lines.filter(line => levelOf(line) === 'info').length,
    warn: lines.filter(line => levelOf(line) === 'warn').length,
    error: lines.filter(line => levelOf(line) === 'error').length,
  }), [lines])

  return (
    <div className="h-full flex flex-col bg-dark-950">
      <div className="px-6 pt-7 pb-4 border-b border-dark-600 bg-dark-900/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-brand-400" />
              <h1 className="text-sm font-bold text-white">Logs do aplicativo</h1>
            </div>
            <p className="text-xs text-slate-600 mt-1 break-all">{path || 'Carregando caminho do log...'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => path && navigator.clipboard.writeText(path)}
              disabled={!path}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-700 border border-dark-600 text-xs font-bold text-slate-500 hover:text-slate-300 disabled:opacity-40"
            >
              <FolderOpen size={12} />Copiar caminho
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs font-bold text-brand-300 hover:bg-brand-500/20 disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />Atualizar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {([
            { id: 'all', label: 'Todos', icon: FileText },
            { id: 'info', label: 'Info', icon: Info },
            { id: 'warn', label: 'Avisos', icon: AlertTriangle },
            { id: 'error', label: 'Erros', icon: Bug },
          ] as const).map(item => {
            const Icon = item.icon
            const active = filter === item.id
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                  active
                    ? 'bg-brand-500/15 border-brand-400/30 text-brand-300'
                    : 'bg-dark-700 border-dark-600 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={11} />{item.label}<span className="text-slate-700">{counts[item.id]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 font-mono text-xs leading-5">
        {error && <div className="text-red-400 mb-3">{error}</div>}
        {!loading && visible.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 gap-3">
            <FileText size={28} className="text-slate-700" />
            <p className="text-sm">Nenhum log nesse filtro.</p>
          </div>
        ) : (
          visible.map((line, i) => {
            const level = levelOf(line)
            const color = level === 'error'
              ? 'text-red-300'
              : level === 'warn'
                ? 'text-amber-300'
                : level === 'info'
                  ? 'text-slate-400'
                  : 'text-slate-500'
            return <div key={`${line}-${i}`} className={`${color} whitespace-pre-wrap break-words py-0.5`}>{line}</div>
          })
        )}
      </div>
    </div>
  )
}
