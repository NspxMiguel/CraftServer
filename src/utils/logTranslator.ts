// ── CraftServer — Log Translator ─────────────────────────────────────────────
// Converts raw Minecraft server logs into friendly plain-language messages.
// Returns null for technical noise that should be hidden in friendly mode.

export interface FriendlyLog {
  text: string
  emoji: string
  type: 'success' | 'info' | 'warn' | 'error' | 'player' | 'cmd'
}

// ─── Rule definition ──────────────────────────────────────────────────────────
interface Rule {
  match: RegExp
  pt: (m: RegExpMatchArray) => string
  en: (m: RegExpMatchArray) => string
  emoji: string
  type: FriendlyLog['type']
  hide?: boolean // hide from friendly mode entirely (pure noise)
}

const RULES: Rule[] = [
  // ── Server lifecycle ────────────────────────────────────────────────────────
  {
    match: /Done \((\d+[\d.,]+)s\)!/i,
    pt: m => `Servidor iniciado em ${m[1]} segundos — pode entrar!`,
    en: m => `Server started in ${m[1]} seconds — jump in!`,
    emoji: '✅', type: 'success',
  },
  {
    match: /Starting Minecraft server on/i,
    pt: () => 'Iniciando servidor...',
    en: () => 'Starting server...',
    emoji: '🚀', type: 'info',
  },
  {
    match: /Stopping (the )?server/i,
    pt: () => 'Servidor parando...',
    en: () => 'Server stopping...',
    emoji: '🛑', type: 'warn',
  },
  {
    match: /Closing Server/i,
    pt: () => 'Servidor desligado.',
    en: () => 'Server shut down.',
    emoji: '⛔', type: 'warn',
  },
  {
    match: /Saving the game/i,
    pt: () => 'Salvando o mundo...',
    en: () => 'Saving the world...',
    emoji: '💾', type: 'info',
  },
  {
    match: /Saved the game/i,
    pt: () => 'Mundo salvo!',
    en: () => 'World saved!',
    emoji: '✔️', type: 'info',
  },
  // ── Players ─────────────────────────────────────────────────────────────────
  {
    match: /(\w+) joined the game/,
    pt: m => `${m[1]} entrou no servidor!`,
    en: m => `${m[1]} joined the server!`,
    emoji: '👋', type: 'player',
  },
  {
    match: /(\w+) left the game/,
    pt: m => `${m[1]} saiu do servidor.`,
    en: m => `${m[1]} left the server.`,
    emoji: '👤', type: 'player',
  },
  {
    match: /(\w+) lost connection: (.+)/,
    pt: m => `${m[1]} perdeu a conexão: ${m[2]}`,
    en: m => `${m[1]} lost connection: ${m[2]}`,
    emoji: '📡', type: 'warn',
  },
  {
    match: /(\w+) was (?:slain|killed|blown|shot|squashed|drowned|starved|burnt|suffocated|fell|impaled|poked|pricked|skewered|fireballed|struck|walked|froze) by (.+)/,
    pt: m => `${m[1]} morreu no servidor.`,
    en: m => `${m[1]} died in the server.`,
    emoji: '💀', type: 'player',
  },
  {
    match: /(\w+) has made the advancement/,
    pt: m => `${m[1]} desbloqueou uma conquista! 🎉`,
    en: m => `${m[1]} got an advancement! 🎉`,
    emoji: '🏆', type: 'success',
  },
  {
    match: /\[(?:Server|CONSOLE)\]: (.+)/,
    pt: m => `Comando do servidor: ${m[1]}`,
    en: m => `Server command: ${m[1]}`,
    emoji: '⌨️', type: 'cmd',
  },
  // ── Plugins ─────────────────────────────────────────────────────────────────
  {
    match: /\[Server thread\/INFO\].*Enabling (.+) v/,
    pt: m => `Plugin ${m[1]} ativado`,
    en: m => `Plugin ${m[1]} enabled`,
    emoji: '🔌', type: 'info',
  },
  {
    match: /\[Server thread\/INFO\].*Disabling (.+) v/,
    pt: m => `Plugin ${m[1]} desativado`,
    en: m => `Plugin ${m[1]} disabled`,
    emoji: '🔌', type: 'info',
  },
  {
    match: /Could not load '?plugins\/([^'"\s]+)'?/i,
    pt: m => `Erro ao carregar plugin: ${m[1]}`,
    en: m => `Failed to load plugin: ${m[1]}`,
    emoji: '❌', type: 'error',
  },
  // ── Errors & warnings ───────────────────────────────────────────────────────
  {
    match: /OutOfMemoryError/i,
    pt: () => 'Sem memória RAM! Aumente o RAM do servidor nas configurações.',
    en: () => 'Out of memory! Increase server RAM in settings.',
    emoji: '🔴', type: 'error',
  },
  {
    match: /java\.net\.BindException/i,
    pt: () => 'Porta já está em uso! Mude a porta nas configurações do servidor.',
    en: () => 'Port already in use! Change the port in server settings.',
    emoji: '🔴', type: 'error',
  },
  {
    match: /Failed to bind to port/i,
    pt: () => 'Não conseguiu abrir a porta. Mude a porta nas configurações.',
    en: () => 'Failed to bind port. Change the port in settings.',
    emoji: '🔴', type: 'error',
  },
  {
    match: /Can't keep up!/i,
    pt: () => 'Servidor com lag! Considere reduzir o view-distance ou aumentar RAM.',
    en: () => 'Server is lagging! Consider reducing view-distance or increasing RAM.',
    emoji: '⚠️', type: 'warn',
  },
  {
    match: /\[WARN\].*Nag author/i,
    pt: () => null as unknown as string, // hide
    en: () => null as unknown as string,
    emoji: '', type: 'info', hide: true,
  },
  // ── World loading ────────────────────────────────────────────────────────────
  {
    match: /Preparing spawn area/i,
    pt: () => 'Gerando área de spawn...',
    en: () => 'Preparing spawn area...',
    emoji: '🌍', type: 'info',
  },
  {
    match: /Time elapsed: (\d+)/i,
    pt: m => `Carregamento concluído em ${m[1]}ms`,
    en: m => `Load completed in ${m[1]}ms`,
    emoji: '⏱️', type: 'info',
  },
  // ── CraftServer internal ─────────────────────────────────────────────────────
  {
    match: /── (.+) ──/,
    pt: m => m[1],
    en: m => m[1],
    emoji: '📋', type: 'info',
  },
]

// Lines that are pure noise — always hidden in friendly mode
const NOISE_PATTERNS = [
  /^\s*$/,
  /Loading libraries/i,
  /Loaded \d+ recipes/i,
  /Loaded \d+ advancements/i,
  /Detected mismatching level container/i,
  /Failed to load class "org\.slf4j/i,
  /SLF4J/i,
  /\[Paper\].*paper-\d/i,
  /Environment: authHost/i,
  /No existing chunk/i,
  /setIdle/i,
  /net\.minecraft\./i,
  /java\.lang\./i,
  /at [\w$.]+\([\w.]+:\d+\)/i,  // stack trace lines
  /\.\.\. \d+ more/i,           // "... 14 more" (stack traces)
  /org\.bukkit/i,
  /com\.google/i,
  /io\.netty/i,
]

// ─── Main translate function ──────────────────────────────────────────────────
export function translateLog(
  raw: string,
  lang: 'pt' | 'en'
): FriendlyLog | null {
  const line = raw.trimEnd()
  if (!line) return null

  // Check noise
  if (NOISE_PATTERNS.some(p => p.test(line))) return null

  // Try each rule
  for (const rule of RULES) {
    const m = line.match(rule.match)
    if (m) {
      if (rule.hide) return null
      const text = lang === 'en' ? rule.en(m) : rule.pt(m)
      if (!text) return null
      return { text, emoji: rule.emoji, type: rule.type }
    }
  }

  // Plain ERROR/WARN lines without a specific rule
  if (/ERROR|SEVERE/i.test(line)) {
    // Extract the meaningful part (strip the timestamp/thread prefix)
    const clean = line.replace(/^\[[\d:]+\] \[[\w /]+\/\w+\]: /, '').trim()
    return { text: clean || line, emoji: '❌', type: 'error' }
  }
  if (/WARN/i.test(line)) {
    const clean = line.replace(/^\[[\d:]+\] \[[\w /]+\/\w+\]: /, '').trim()
    return { text: clean || line, emoji: '⚠️', type: 'warn' }
  }

  // Everything else — hide in friendly mode (technical chatter)
  return null
}

// ─── Classify raw log type (for both modes) ───────────────────────────────────
export function rawLogType(line: string): 'info' | 'warn' | 'error' | 'cmd' {
  if (line.includes('ERROR') || line.includes('SEVERE')) return 'error'
  if (line.includes('WARN')) return 'warn'
  if (line.startsWith('>')) return 'cmd'
  return 'info'
}
