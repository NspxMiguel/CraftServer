import { useEffect, useMemo, useState } from 'react'
import { Archive, Cloud, FolderOpen, HardDrive, Loader2, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

const isElectron = typeof window !== 'undefined' && !!window.electron

interface Backup {
  name: string
  path: string
  size: number
  createdAt: number
}

interface Props {
  serverId: string
  running: boolean
}

const fmtSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const fmtDate = (value: number) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value))

export default function BackupManager({ serverId, running }: Props) {
  const [backups, setBackups] = useState<Backup[]>([])
  const [backupDir, setBackupDirState] = useState('')
  const [googleDirs, setGoogleDirs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const usingGoogleDrive = useMemo(
    () => googleDirs.some(dir => backupDir && backupDir.startsWith(dir)),
    [backupDir, googleDirs],
  )

  const load = async (alive = { value: true }) => {
    if (!isElectron) { setLoading(false); return }
    setError('')
    setLoading(true)
    try {
      const [config, list] = await Promise.all([
        window.electron.getBackupConfig?.(),
        window.electron.listServerBackups?.(serverId),
      ])
      if (!alive.value) return
      if (config) {
        setBackupDirState(config.backupDir)
        setGoogleDirs(config.googleDriveDirs || [])
      }
      setBackups(list || [])
    } catch (e: any) {
      if (alive.value) setError(String(e?.message || e))
    } finally {
      if (alive.value) setLoading(false)
    }
  }

  useEffect(() => {
    const alive = { value: true }
    load(alive)
    return () => { alive.value = false }
  }, [serverId])

  const createBackup = async () => {
    if (!isElectron || creating) return
    setCreating(true)
    setError('')
    setMessage('')
    const res = await window.electron.createServerBackup?.(serverId)
    setCreating(false)
    if (!res?.ok) {
      setError(res?.error || 'Falha ao criar backup')
      return
    }
    setMessage('Backup criado com sucesso.')
    await load()
  }

  const chooseDir = async () => {
    if (!isElectron) return
    const res = await window.electron.chooseBackupDir?.()
    if (res?.ok && res.backupDir) {
      setBackupDirState(res.backupDir)
      await load()
    }
  }

  const useGoogleDrive = async (dir: string) => {
    if (!isElectron) return
    const target = `${dir.replace(/[\\/]+$/, '')}/CraftServer Backups`
    const res = await window.electron.setBackupDir?.(target)
    if (res?.ok && res.backupDir) {
      setBackupDirState(res.backupDir)
      setMessage('Backups serão salvos na pasta sincronizada do Google Drive.')
      await load()
    } else {
      setError(res?.error || 'Não consegui configurar a pasta do Google Drive')
    }
  }

  return (
    <div className="h-full flex flex-col bg-dark-950">
      <div className="px-6 pt-7 pb-4 border-b border-dark-600 bg-dark-900/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Archive size={15} className="text-brand-400" />
              <h1 className="text-sm font-bold text-white">Backups</h1>
              {usingGoogleDrive && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                  <Cloud size={10} />Google Drive
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 break-all">{backupDir || 'Carregando pasta...'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={chooseDir}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-700 border border-dark-600 text-xs font-bold text-slate-500 hover:text-slate-300"
            >
              <FolderOpen size={12} />Pasta
            </button>
            <button
              onClick={() => load()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-700 border border-dark-600 text-xs font-bold text-slate-500 hover:text-slate-300 disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />Atualizar
            </button>
            <button
              onClick={createBackup}
              disabled={creating || running}
              title={running ? 'Pare o servidor antes de criar backup' : 'Criar backup ZIP agora'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-xs font-bold text-white shadow-lg shadow-brand-500/20"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
              Backup agora
            </button>
          </div>
        </div>

        {googleDirs.length > 0 && !usingGoogleDrive && (
          <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-3">
            <div className="flex items-start gap-3">
              <Cloud size={16} className="text-sky-300 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-sky-200">Google Drive detectado</p>
                <p className="text-xs text-slate-400 mt-1">Use a pasta sincronizada do Drive para manter cópias fora do computador automaticamente.</p>
              </div>
              <button
                onClick={() => useGoogleDrive(googleDirs[0])}
                className="px-3 py-1.5 rounded-xl bg-sky-400/10 border border-sky-400/20 text-xs font-bold text-sky-200 hover:bg-sky-400/15"
              >
                Usar Drive
              </button>
            </div>
          </div>
        )}

        {running && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
            <AlertTriangle size={14} className="text-amber-300 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-100/80">Backup bloqueado enquanto o servidor roda para evitar mundo corrompido. Pare o servidor e tente de novo.</p>
          </div>
        )}

        {message && <p className="text-xs text-brand-300 mt-3">{message}</p>}
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-dark-800 border border-dark-600 animate-pulse" />)}
          </div>
        ) : backups.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-600 flex items-center justify-center">
              <HardDrive size={24} className="text-slate-700" />
            </div>
            <div>
              <p className="text-slate-300 font-bold">Nenhum backup ainda</p>
              <p className="text-slate-600 text-sm mt-1 max-w-sm">Crie um ZIP antes de testar plugin novo, atualizar versão ou mexer pesado no mundo.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup, i) => (
              <motion.div
                key={backup.path}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className="flex items-center gap-3.5 rounded-2xl border border-dark-600 bg-dark-800 p-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} className="text-brand-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{backup.name}</p>
                  <p className="text-xs text-slate-600">{fmtDate(backup.createdAt)} · {fmtSize(backup.size)}</p>
                </div>
                <button
                  onClick={() => window.electron.revealBackup?.(backup.path)}
                  className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/[0.05] transition-colors"
                  title="Mostrar arquivo"
                >
                  <FolderOpen size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
