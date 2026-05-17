import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Loader2, Shield, ShieldOff, Search, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WhitelistEntry } from '../../types'

const isElectron = typeof window !== 'undefined' && !!window.electron

interface Props { serverId: string; serverType: string }

export default function WhitelistManager({ serverId, serverType }: Props) {
  const [entries, setEntries] = useState<WhitelistEntry[]>([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const isBedrock = serverType === 'bedrock'

  const load = async () => {
    if (!isElectron || isBedrock) { setLoading(false); return }
    const list = await window.electron.getWhitelist(serverId)
    setEntries(list)
    setLoading(false)
  }

  useEffect(() => { load() }, [serverId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !isElectron) return
    setAdding(true)
    setError('')
    const res = await window.electron.addWhitelist(serverId, username.trim())
    if (res.ok && res.entry) {
      setEntries(e => [...e, res.entry!])
      setUsername('')
    } else {
      setError(res.error || 'Erro ao adicionar jogador')
    }
    setAdding(false)
  }

  const handleRemove = async (name: string) => {
    if (!isElectron) return
    await window.electron.removeWhitelist(serverId, name)
    setEntries(e => e.filter(x => x.name !== name))
  }

  const filtered = entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))

  if (isBedrock) return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <ShieldOff size={24} className="text-slate-600" />
      <p className="text-slate-400 font-semibold">Whitelist não disponível</p>
      <p className="text-slate-600 text-sm max-w-xs">Servidores Bedrock (PowerNukkit) gerenciam whitelist de forma diferente. Use os comandos do servidor.</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3">
        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nome do jogador (ex: Steve)"
              className="w-full bg-dark-700 border border-dark-500 hover:border-brand-400/30 focus:border-brand-400/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !username.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-all"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Adicionar
          </button>
        </form>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 mb-2 px-1">{error}</motion.p>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-brand-400/5 border border-brand-400/10 rounded-xl mb-4">
          <Shield size={12} className="text-brand-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Ativar a whitelist não basta — vá em <strong className="text-slate-300">Configurações</strong> e ligue <strong className="text-slate-300">Whitelist ativa</strong>. UUIDs são buscados automaticamente na API da Mojang.
          </p>
        </div>

        {/* Search */}
        {entries.length > 5 && (
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar jogador..."
              className="w-full bg-dark-700 border border-dark-600 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-700 focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-600">
            <Loader2 size={18} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-dark-700 border border-dark-500 flex items-center justify-center">
              <Shield size={22} className="text-slate-600" />
            </div>
            <div>
              <p className="text-slate-400 font-semibold">
                {entries.length === 0 ? 'Whitelist vazia' : `Nenhum resultado para "${search}"`}
              </p>
              <p className="text-slate-600 text-xs mt-1">
                {entries.length === 0 ? 'Adicione jogadores acima para liberar acesso' : 'Tente outro nome'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-2">
              {filtered.length} jogador{filtered.length !== 1 ? 'es' : ''}
            </p>
            <AnimatePresence>
              {filtered.map((entry, i) => (
                <motion.div
                  key={entry.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 bg-dark-800 border border-dark-600 hover:border-dark-500 rounded-xl group transition-colors"
                >
                  {/* Avatar (Minotar-style) */}
                  <img
                    src={`https://minotar.net/avatar/${entry.name}/28`}
                    alt={entry.name}
                    className="w-7 h-7 rounded-md border border-dark-500"
                    onError={e => { (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgo=' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{entry.name}</p>
                    <p className="text-[10px] text-slate-600 font-mono truncate">{entry.uuid}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(entry.name)}
                    className="p-1.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover da whitelist"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
