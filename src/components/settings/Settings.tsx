import { useState, useEffect } from 'react'
import { Save, ExternalLink, Info, Coffee, Globe, Cloud, FolderOpen, Wifi, Check, X, Eye, EyeOff } from 'lucide-react'
import { useT, setLang, getLang, type Lang } from '../../i18n'
import { isElectron } from '../../utils/env'

export default function Settings() {
  const t = useT()
  const [javaPath, setJavaPath] = useState('')
  const [saved, setSaved] = useState(false)
  const [lang, setLangState] = useState<Lang>(getLang())
  const [backupDir, setBackupDir] = useState('')
  const [googleDriveDirs, setGoogleDriveDirs] = useState<string[]>([])

  // PlayIt shared secret
  const [playitSecret, setPlayitSecret] = useState<string | null>(null)
  const [playitSecretInput, setPlayitSecretInput] = useState('')
  const [playitSecretVisible, setPlayitSecretVisible] = useState(false)
  const [playitMsg, setPlayitMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!isElectron) return
    window.electron.getConfig().then((cfg: any) => {
      setJavaPath(cfg.javaPath || '')
    })
    window.electron.getBackupConfig?.().then(cfg => {
      setBackupDir(cfg.backupDir)
      setGoogleDriveDirs(cfg.googleDriveDirs || [])
    })
    window.electron.getPlayitSecret?.().then(r => {
      setPlayitSecret(r.secret)
      setPlayitSecretInput(r.secret ?? '')
    })
  }, [])

  const handleSave = async () => {
    if (!isElectron) return
    await window.electron.setConfig({ javaPath, backupDir })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLang = (l: Lang) => {
    setLangState(l)
    setLang(l)
  }

  const chooseBackupDir = async () => {
    if (!isElectron) return
    const res = await window.electron.chooseBackupDir?.()
    if (res?.ok && res.backupDir) setBackupDir(res.backupDir)
  }

  const useGoogleDrive = async () => {
    if (!isElectron || !googleDriveDirs[0]) return
    const target = `${googleDriveDirs[0].replace(/[\\/]+$/, '')}/CraftServer Backups`
    const res = await window.electron.setBackupDir?.(target)
    if (res?.ok && res.backupDir) setBackupDir(res.backupDir)
  }

  const savePlayitSecret = async () => {
    if (!isElectron) return
    await window.electron.setPlayitSecret?.(playitSecretInput.trim())
    setPlayitSecret(playitSecretInput.trim() || null)
    showPlayitMsg(true, playitSecretInput.trim() ? 'Secret salvo! Todos os servidores vão usar essa conta PlayIt.' : 'Secret removido.')
  }

  const clearPlayitSecret = async () => {
    if (!isElectron) return
    await window.electron.setPlayitSecret?.('')
    setPlayitSecret(null)
    setPlayitSecretInput('')
    showPlayitMsg(true, 'Secret removido. Servidores vão precisar de login individual.')
  }

  const showPlayitMsg = (ok: boolean, text: string) => {
    setPlayitMsg({ ok, text })
    setTimeout(() => setPlayitMsg(null), 4000)
  }

  const maskedSecret = (s: string) =>
    s.length > 8 ? `${s.slice(0, 4)}${'•'.repeat(Math.min(s.length - 8, 20))}${s.slice(-4)}` : '••••••••'

  return (
    <div className="h-full p-6 max-w-2xl mx-auto overflow-auto">
      <h1 className="text-lg font-semibold text-white mb-6">{t.settingsTitle}</h1>

      <div className="space-y-4">
        {/* Language */}
        <div className="p-4 bg-dark-800 border border-dark-700 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-slate-500" />
            <h2 className="text-sm font-medium text-white">{t.languageSection}</h2>
          </div>
          <p className="text-xs text-zinc-500 mb-3">{t.languageLabel}</p>
          <div className="flex gap-2">
            {([
              { lang: 'pt' as Lang, label: '🇧🇷 Português' },
              { lang: 'en' as Lang, label: '🇺🇸 English' },
            ]).map(({ lang: l, label }) => (
              <button
                key={l}
                onClick={() => handleLang(l)}
                className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all
                  ${lang === l
                    ? 'bg-brand-500/15 border-brand-400/50 text-brand-300'
                    : 'bg-dark-700 border-dark-600 text-slate-500 hover:border-dark-500 hover:text-slate-300'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* PlayIt shared secret */}
        <div className="p-4 bg-dark-800 border border-dark-700 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Wifi size={14} className="text-brand-400" />
            <h2 className="text-sm font-medium text-white">PlayIt.gg — Conta Compartilhada</h2>
          </div>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Quando você loga na PlayIt em qualquer servidor, o <span className="font-mono text-slate-400">agent-secret</span> fica salvo aqui automaticamente.
            Todos os próximos servidores vão usar essa conta — sem precisar logar de novo.
          </p>

          {playitSecret ? (
            <div className="space-y-3">
              {/* Status: connected */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse shrink-0" />
                <span className="text-xs text-brand-300 font-semibold flex-1">Conta PlayIt vinculada</span>
                <span className="font-mono text-[10px] text-slate-600 select-all">
                  {playitSecretVisible ? playitSecret : maskedSecret(playitSecret)}
                </span>
                <button onClick={() => setPlayitSecretVisible(v => !v)} className="text-slate-600 hover:text-slate-400 transition-colors">
                  {playitSecretVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <button
                onClick={clearPlayitSecret}
                className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                <X size={11} /> Desvincular conta (exige novo login nos servidores)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Status: not configured */}
              <div className="flex items-center gap-2 px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                <span className="text-xs text-slate-500">Nenhuma conta vinculada ainda</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Inicie qualquer servidor com o plugin PlayIt instalado, faça o login no link que aparecer no console,
                e o secret vai ser capturado automaticamente. Ou cole manualmente abaixo:
              </p>
              <div className="flex gap-2">
                <input
                  type={playitSecretVisible ? 'text' : 'password'}
                  value={playitSecretInput}
                  onChange={e => setPlayitSecretInput(e.target.value)}
                  placeholder="Cole o agent-secret aqui..."
                  className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 font-mono text-xs"
                />
                <button onClick={() => setPlayitSecretVisible(v => !v)} className="px-2.5 text-slate-600 hover:text-slate-400 bg-dark-700 border border-dark-600 rounded-xl transition-colors">
                  {playitSecretVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={savePlayitSecret}
                  disabled={!playitSecretInput.trim()}
                  className="px-3 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}

          {playitMsg && (
            <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs
              ${playitMsg.ok ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
              {playitMsg.ok ? <Check size={11} /> : <X size={11} />}
              {playitMsg.text}
            </div>
          )}
        </div>

        {/* Backups */}
        <div className="p-4 bg-dark-800 border border-dark-700 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Cloud size={14} className="text-slate-500" />
            <h2 className="text-sm font-medium text-white">Backups</h2>
          </div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Pasta padrão dos backups</label>
          <div className="flex gap-2">
            <input
              value={backupDir}
              onChange={e => setBackupDir(e.target.value)}
              placeholder="~/CraftServer/backups"
              className="min-w-0 flex-1 bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 font-mono"
            />
            <button
              onClick={chooseBackupDir}
              className="px-3 py-2.5 rounded-xl bg-dark-700 border border-dark-600 text-slate-400 hover:text-white transition-colors"
              title="Escolher pasta"
            >
              <FolderOpen size={15} />
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-2 flex items-start gap-1">
            <Info size={11} className="mt-0.5 shrink-0" />
            Backups são ZIPs completos da pasta do servidor. Para Google Drive, use uma pasta sincronizada pelo app oficial do Drive.
          </p>
          {googleDriveDirs.length > 0 && !backupDir.startsWith(googleDriveDirs[0]) && (
            <button
              onClick={useGoogleDrive}
              className="inline-flex items-center gap-1.5 text-xs text-sky-300 hover:text-sky-200 mt-2 transition-colors"
            >
              <Cloud size={11} /> Usar Google Drive detectado
            </button>
          )}
        </div>

        {/* Java */}
        <div className="p-4 bg-dark-800 border border-dark-700 rounded-xl">
          <h2 className="text-sm font-medium text-white mb-3">{t.javaSection}</h2>
          <label className="text-xs text-zinc-500 mb-1.5 block">{t.javaPathLabel}</label>
          <input
            value={javaPath}
            onChange={e => setJavaPath(e.target.value)}
            placeholder={t.javaPathPlaceholder}
            className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 font-mono"
          />
          <p className="text-xs text-zinc-600 mt-2 flex items-center gap-1">
            <Info size={11} />
            {t.javaInfo}
          </p>
          <button
            onClick={() => isElectron && window.electron.openExternal('https://adoptium.net/temurin/releases/?version=25')}
            className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-1 transition-colors"
          >
            {t.downloadJava} <ExternalLink size={10} />
          </button>
        </div>

        {/* About */}
        <div className="p-4 bg-dark-800 border border-dark-700 rounded-xl">
          <h2 className="text-sm font-medium text-white mb-2">{t.aboutSection}</h2>
          <div className="space-y-1 text-xs text-zinc-500">
            <p>CraftServer v0.2.7</p>
            <p>{t.aboutDesc}</p>
            <p className="flex items-center gap-1 mt-2 text-zinc-600">
              <Coffee size={11} /> {t.madeWithCoffee}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Save size={15} />
          {saved ? t.saved : t.save}
        </button>
      </div>
    </div>
  )
}
