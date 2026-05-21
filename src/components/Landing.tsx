import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Flame, Download, Play, Zap, Shield, Puzzle,
  Wifi, Globe, Server, ChevronRight, Github
} from 'lucide-react'

interface Props { onEnterDemo: () => void }

const CONSOLE_LINES = [
  { delay: 0,    text: '> Iniciando servidor Paper 1.21.4...', color: 'text-brand-400' },
  { delay: 600,  text: '[INFO] Carregando propriedades do servidor', color: 'text-slate-400' },
  { delay: 1100, text: '[INFO] Preparando região de spawn...', color: 'text-slate-400' },
  { delay: 1800, text: '[INFO] Habilitando EssentialsX v2.21.0', color: 'text-slate-400' },
  { delay: 2300, text: '[INFO] Habilitando LuckPerms v5.4.141', color: 'text-slate-400' },
  { delay: 2900, text: '[INFO] Servidor iniciado! (3.2s)', color: 'text-green-400' },
  { delay: 3600, text: '[INFO] Steve entrou no jogo', color: 'text-amber-400' },
  { delay: 4200, text: '[INFO] Alex entrou no jogo', color: 'text-amber-400' },
  { delay: 5000, text: '[CHAT] Steve: servidor tá ótimo!', color: 'text-slate-300' },
]

const FEATURES = [
  {
    icon: <Zap size={20} />,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10 border-brand-500/20',
    title: 'Setup em segundos',
    desc: 'Escolha o modo de jogo e o servidor está pronto. Paper, Survival, SkyWars, BedWars — tudo pré-configurado.',
  },
  {
    icon: <Puzzle size={20} />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'Plugins com um clique',
    desc: 'EssentialsX, LuckPerms, WorldEdit e mais. Busca, instala e remove direto da interface.',
  },
  {
    icon: <Wifi size={20} />,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    title: 'Tunnel PlayIt.gg',
    desc: 'Jogue sem abrir portas no roteador. Link público em segundos, funciona em qualquer rede.',
  },
  {
    icon: <Shield size={20} />,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    title: 'Backups automáticos',
    desc: 'ZIP completo do servidor com um clique. Suporte a Google Drive para backup fora da máquina.',
  },
  {
    icon: <Globe size={20} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Java + Bedrock',
    desc: 'Servidor híbrido com GeyserMC: jogadores de PC, mobile e console no mesmo servidor.',
  },
  {
    icon: <Server size={20} />,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    title: 'Console em tempo real',
    desc: 'Logs traduzidos para português, timestamps, e envio de comandos direto pela interface.',
  },
]

export default function Landing({ onEnterDemo }: Props) {
  const [visibleLines, setVisibleLines] = useState<number>(0)

  useEffect(() => {
    const timers = CONSOLE_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines(v => Math.max(v, i + 1)), line.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="min-h-screen bg-[#08080e] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Flame size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-white tracking-tight">CraftServer</span>
        </div>
        <a
          href="https://github.com/spxmiguel/CraftServer/releases/latest"
          target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Github size={13} /> GitHub
        </a>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-4xl mx-auto">
        {/* Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 left-1/4 w-[300px] h-[200px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-6">
            <Flame size={11} strokeWidth={2.5} /> Grátis e open source
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.08] mb-5">
            Servidor Minecraft
            <br />
            <span className="text-brand-400">sem complicação</span>
          </h1>

          <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Crie, configure e gerencie servidores Minecraft com uma interface bonita.
            Plugins, tunnels e backups — tudo num app.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://github.com/spxmiguel/CraftServer/releases/latest"
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-400/35 hover:scale-[1.03] active:scale-[0.98]"
            >
              <Download size={15} /> Baixar grátis
            </a>
            <button
              onClick={onEnterDemo}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 text-slate-200 rounded-xl font-semibold text-sm transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play size={13} strokeWidth={2.5} /> Testar demo <ChevronRight size={13} className="text-slate-500" />
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-4">macOS · Windows · Grátis para sempre</p>
        </motion.div>
      </section>

      {/* Console mockup */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="max-w-2xl mx-auto px-6 mb-20"
      >
        <div className="rounded-2xl bg-dark-900 border border-dark-700 overflow-hidden shadow-2xl shadow-black/50">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-dark-700 bg-dark-800">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="ml-3 text-[11px] text-slate-600 font-mono">Survival da Galera — Console</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-[10px] text-brand-400 font-bold">Online</span>
            </div>
          </div>
          {/* Console lines */}
          <div className="p-4 font-mono text-[11px] space-y-1.5 min-h-[200px]">
            {CONSOLE_LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={line.color}
              >
                {line.text}
              </motion.div>
            ))}
            {visibleLines > 0 && (
              <span className="inline-block w-2 h-3.5 bg-brand-400/70 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        </div>
      </motion.section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-black tracking-tight mb-3">Tudo que você precisa</h2>
          <p className="text-slate-500 text-sm">Sem linha de comando. Sem configuração manual. Funciona.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.07 }}
              className="p-5 rounded-2xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${f.bg} ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-white text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="absolute inset-0 bg-brand-500/5 rounded-3xl blur-3xl pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="relative p-10 rounded-3xl bg-dark-800 border border-dark-700"
        >
          <h2 className="text-3xl font-black mb-3">Pronto para jogar?</h2>
          <p className="text-slate-500 text-sm mb-8">Grátis, open source, sem limites.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://github.com/spxmiguel/CraftServer/releases/latest"
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-8 py-3.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-brand-500/25 hover:scale-[1.03]"
            >
              <Download size={15} /> Baixar CraftServer
            </a>
            <button
              onClick={onEnterDemo}
              className="flex items-center gap-2 px-6 py-3.5 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors"
            >
              <Play size={13} strokeWidth={2.5} /> Ver demo primeiro
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <Flame size={12} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xs text-slate-600">CraftServer — open source</span>
          </div>
          <a
            href="https://github.com/spxmiguel/CraftServer"
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Github size={12} /> Ver no GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
