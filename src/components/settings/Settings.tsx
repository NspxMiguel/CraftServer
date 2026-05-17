import { useState, useEffect } from 'react'
import { Save, ExternalLink, Info, Coffee } from 'lucide-react'

const isElectron = typeof window !== 'undefined' && !!window.electron

export default function Settings() {
  const [javaPath, setJavaPath] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isElectron) return
    window.electron.getConfig().then((cfg: any) => {
      setJavaPath(cfg.javaPath || '')
    })
  }, [])

  const handleSave = async () => {
    if (!isElectron) return
    await window.electron.setConfig({ javaPath })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="h-full p-6 max-w-xl mx-auto">
      <h1 className="text-lg font-semibold text-white mb-6">Configurações</h1>

      <div className="space-y-4">
        <div className="p-4 bg-dark-800 border border-dark-700 rounded-xl">
          <h2 className="text-sm font-medium text-white mb-3">Java</h2>
          <label className="text-xs text-zinc-500 mb-1.5 block">Caminho do executável Java (deixe vazio para auto-detectar)</label>
          <input
            value={javaPath}
            onChange={e => setJavaPath(e.target.value)}
            placeholder="/usr/bin/java"
            className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 font-mono"
          />
          <p className="text-xs text-zinc-600 mt-2 flex items-center gap-1">
            <Info size={11} />
            Java 17 ou superior é necessário para Minecraft 1.17+
          </p>
          <a
            href="https://adoptium.net"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 mt-1 transition-colors"
          >
            Baixar Java (Adoptium) <ExternalLink size={10} />
          </a>
        </div>

        <div className="p-4 bg-dark-800 border border-dark-700 rounded-xl">
          <h2 className="text-sm font-medium text-white mb-2">Sobre</h2>
          <div className="space-y-1 text-xs text-zinc-500">
            <p>CraftServer v0.1.0</p>
            <p>Minecraft Server Manager para Mac e Windows</p>
            <p className="flex items-center gap-1 mt-2 text-zinc-600">
              <Coffee size={11} /> Feito com muito café
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Save size={15} />
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
