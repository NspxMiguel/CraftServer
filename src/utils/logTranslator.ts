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
  hide?: boolean
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
  {
    match: /Reloading!/i,
    pt: () => 'Recarregando servidor...',
    en: () => 'Reloading server...',
    emoji: '🔄', type: 'info',
  },

  // ── World & chunk loading ────────────────────────────────────────────────────
  {
    match: /Preparing spawn area[^:]*:\s*(\d+)%/i,
    pt: m => `Preparando área de spawn: ${m[1]}%`,
    en: m => `Preparing spawn area: ${m[1]}%`,
    emoji: '🌍', type: 'info',
  },
  {
    match: /Preparing start region for dimension/i,
    pt: () => 'Carregando região inicial...',
    en: () => 'Loading starting region...',
    emoji: '🌍', type: 'info',
  },
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

  // ── Players join / leave / connection ───────────────────────────────────────
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
    pt: m => `${m[1]} perdeu a conexão: ${translateDisconnectReason(m[2])}`,
    en: m => `${m[1]} lost connection: ${m[2]}`,
    emoji: '📡', type: 'warn',
  },
  {
    // UUID lookup: "UUID of player Steve is abc-123"
    match: /UUID of player (\w+) is/i,
    pt: m => `${m[1]} autenticado`,
    en: m => `${m[1]} authenticated`,
    emoji: '🔑', type: 'info',
  },

  // ── Player deaths ────────────────────────────────────────────────────────────
  {
    match: /(\w+) was slain by (.+)/,
    pt: m => `${m[1]} foi morto por ${m[2]}`,
    en: m => `${m[1]} was slain by ${m[2]}`,
    emoji: '⚔️', type: 'player',
  },
  {
    match: /(\w+) was killed by (.+)/,
    pt: m => `${m[1]} foi eliminado por ${m[2]}`,
    en: m => `${m[1]} was killed by ${m[2]}`,
    emoji: '💀', type: 'player',
  },
  {
    match: /(\w+) was shot by (.+)/,
    pt: m => `${m[1]} foi atingido por flecha de ${m[2]}`,
    en: m => `${m[1]} was shot by ${m[2]}`,
    emoji: '🏹', type: 'player',
  },
  {
    match: /(\w+) drowned/,
    pt: m => `${m[1]} se afogou`,
    en: m => `${m[1]} drowned`,
    emoji: '🌊', type: 'player',
  },
  {
    match: /(\w+) burned to death/,
    pt: m => `${m[1]} morreu queimado`,
    en: m => `${m[1]} burned to death`,
    emoji: '🔥', type: 'player',
  },
  {
    match: /(\w+) went up in flames/,
    pt: m => `${m[1]} foi consumido pelas chamas`,
    en: m => `${m[1]} went up in flames`,
    emoji: '🔥', type: 'player',
  },
  {
    match: /(\w+) blew up/,
    pt: m => `${m[1]} explodiu`,
    en: m => `${m[1]} blew up`,
    emoji: '💥', type: 'player',
  },
  {
    match: /(\w+) was blown up by (.+)/,
    pt: m => `${m[1]} foi explodido por ${m[2]}`,
    en: m => `${m[1]} was blown up by ${m[2]}`,
    emoji: '💥', type: 'player',
  },
  {
    match: /(\w+) fell from a high place/,
    pt: m => `${m[1]} caiu de um lugar alto`,
    en: m => `${m[1]} fell from a high place`,
    emoji: '🪂', type: 'player',
  },
  {
    match: /(\w+) fell out of the world/,
    pt: m => `${m[1]} caiu para fora do mundo`,
    en: m => `${m[1]} fell out of the world`,
    emoji: '🕳️', type: 'player',
  },
  {
    match: /(\w+) was doomed to fall by (.+)/,
    pt: m => `${m[1]} foi lançado no abismo por ${m[2]}`,
    en: m => `${m[1]} was doomed to fall by ${m[2]}`,
    emoji: '🪂', type: 'player',
  },
  {
    match: /(\w+) starved to death/,
    pt: m => `${m[1]} morreu de fome`,
    en: m => `${m[1]} starved to death`,
    emoji: '🍖', type: 'player',
  },
  {
    match: /(\w+) suffocated in a wall/,
    pt: m => `${m[1]} sufocou numa parede`,
    en: m => `${m[1]} suffocated in a wall`,
    emoji: '🧱', type: 'player',
  },
  {
    match: /(\w+) was struck by lightning/,
    pt: m => `${m[1]} foi atingido por raio`,
    en: m => `${m[1]} was struck by lightning`,
    emoji: '⚡', type: 'player',
  },
  {
    match: /(\w+) hit the ground too hard/,
    pt: m => `${m[1]} bateu no chão forte demais`,
    en: m => `${m[1]} hit the ground too hard`,
    emoji: '🪂', type: 'player',
  },
  {
    match: /(\w+) froze to death/,
    pt: m => `${m[1]} congelou até morrer`,
    en: m => `${m[1]} froze to death`,
    emoji: '🧊', type: 'player',
  },
  {
    match: /(\w+) discovered the floor was lava/,
    pt: m => `${m[1]} descobriu que o chão era lava`,
    en: m => `${m[1]} discovered the floor was lava`,
    emoji: '🌋', type: 'player',
  },
  {
    match: /(\w+) tried to swim in lava/,
    pt: m => `${m[1]} tentou nadar em lava`,
    en: m => `${m[1]} tried to swim in lava`,
    emoji: '🌋', type: 'player',
  },
  {
    match: /(\w+) was impaled by (.+)/,
    pt: m => `${m[1]} foi empalado por ${m[2]}`,
    en: m => `${m[1]} was impaled by ${m[2]}`,
    emoji: '🔱', type: 'player',
  },
  {
    match: /(\w+) died/,
    pt: m => `${m[1]} morreu`,
    en: m => `${m[1]} died`,
    emoji: '💀', type: 'player',
  },

  // ── Player commands issued ────────────────────────────────────────────────────
  {
    match: /(\w+) issued server command: (.+)/,
    pt: m => `${m[1]} executou: ${m[2]}`,
    en: m => `${m[1]} ran: ${m[2]}`,
    emoji: '⌨️', type: 'cmd',
  },

  // ── Advancements ─────────────────────────────────────────────────────────────
  {
    match: /(\w+) has made the advancement \[(.+)\]/,
    pt: m => `${m[1]} desbloqueou a conquista "${m[2]}"! 🎉`,
    en: m => `${m[1]} got the advancement "${m[2]}"! 🎉`,
    emoji: '🏆', type: 'success',
  },
  {
    match: /(\w+) has completed the challenge \[(.+)\]/,
    pt: m => `${m[1]} completou o desafio "${m[2]}"! 🎉`,
    en: m => `${m[1]} completed the challenge "${m[2]}"! 🎉`,
    emoji: '🏆', type: 'success',
  },
  {
    match: /(\w+) has reached the goal \[(.+)\]/,
    pt: m => `${m[1]} atingiu o objetivo "${m[2]}"! 🎉`,
    en: m => `${m[1]} reached the goal "${m[2]}"! 🎉`,
    emoji: '🎯', type: 'success',
  },

  // ── Player chat ──────────────────────────────────────────────────────────────
  {
    match: /^<(\w+)> (.+)$/,
    pt: m => `${m[1]}: ${m[2]}`,
    en: m => `${m[1]}: ${m[2]}`,
    emoji: '💬', type: 'player',
  },

  // ── /op and /deop ────────────────────────────────────────────────────────────
  {
    match: /Made (\w+) a server operator/i,
    pt: m => `${m[1]} agora é operador (OP)`,
    en: m => `${m[1]} is now an operator (OP)`,
    emoji: '👑', type: 'success',
  },
  {
    match: /De-opped (\w+)/i,
    pt: m => `${m[1]} perdeu os poderes de operador`,
    en: m => `${m[1]} lost operator privileges`,
    emoji: '👤', type: 'info',
  },

  // ── /kick ────────────────────────────────────────────────────────────────────
  {
    match: /Kicked (\w+)(?: from the game)?(?:: (.+))?/i,
    pt: m => `${m[1]} foi expulso do servidor${m[3] ? `: ${m[3]}` : ''}`,
    en: m => `${m[1]} was kicked${m[3] ? `: ${m[3]}` : ''}`,
    emoji: '🦵', type: 'warn',
  },

  // ── /ban and /ban-ip ─────────────────────────────────────────────────────────
  {
    match: /Banned player (\w+)/i,
    pt: m => `${m[1]} foi banido do servidor`,
    en: m => `${m[1]} was banned`,
    emoji: '🔨', type: 'warn',
  },
  {
    match: /Banned IP address (.+)/i,
    pt: m => `IP ${m[1]} foi banido`,
    en: m => `IP ${m[1]} was banned`,
    emoji: '🔨', type: 'warn',
  },

  // ── /pardon and /pardon-ip ────────────────────────────────────────────────────
  {
    match: /Unbanned player (\w+)/i,
    pt: m => `${m[1]} foi desbanido`,
    en: m => `${m[1]} was unbanned`,
    emoji: '✅', type: 'success',
  },
  {
    match: /Unbanned IP address (.+)/i,
    pt: m => `IP ${m[1]} foi desbanido`,
    en: m => `IP ${m[1]} was unbanned`,
    emoji: '✅', type: 'success',
  },

  // ── /whitelist ────────────────────────────────────────────────────────────────
  {
    match: /Added (\w+) to the whitelist/i,
    pt: m => `${m[1]} adicionado à whitelist`,
    en: m => `${m[1]} added to whitelist`,
    emoji: '📋', type: 'success',
  },
  {
    match: /Removed (\w+) from the whitelist/i,
    pt: m => `${m[1]} removido da whitelist`,
    en: m => `${m[1]} removed from whitelist`,
    emoji: '📋', type: 'info',
  },
  {
    match: /There are \d+ whitelisted player/i,
    pt: () => 'Whitelist listada',
    en: () => 'Whitelist listed',
    emoji: '📋', type: 'info',
  },
  {
    match: /Whitelist reloaded/i,
    pt: () => 'Whitelist recarregada',
    en: () => 'Whitelist reloaded',
    emoji: '🔄', type: 'info',
  },
  {
    match: /Turned on the whitelist/i,
    pt: () => 'Whitelist ativada',
    en: () => 'Whitelist enabled',
    emoji: '🔒', type: 'info',
  },
  {
    match: /Turned off the whitelist/i,
    pt: () => 'Whitelist desativada',
    en: () => 'Whitelist disabled',
    emoji: '🔓', type: 'info',
  },

  // ── /gamemode ────────────────────────────────────────────────────────────────
  {
    match: /Set (?:(\w+)'s )?game mode to (Survival|Creative|Adventure|Spectator) Mode/i,
    pt: m => m[1]
      ? `Modo de jogo de ${m[1]} alterado para ${translateGamemode(m[2])}`
      : `Modo de jogo alterado para ${translateGamemode(m[2])}`,
    en: m => m[1]
      ? `${m[1]}'s game mode set to ${m[2]}`
      : `Game mode set to ${m[2]}`,
    emoji: '🎮', type: 'info',
  },
  {
    match: /(\w+) has (?:selected|now) (Survival|Creative|Adventure|Spectator) Mode/i,
    pt: m => `${m[1]} está no modo ${translateGamemode(m[2])}`,
    en: m => `${m[1]} is now in ${m[2]} mode`,
    emoji: '🎮', type: 'info',
  },

  // ── /tp and /teleport ────────────────────────────────────────────────────────
  {
    match: /Teleported (\w+) to (\w+)/i,
    pt: m => `${m[1]} teleportado para ${m[2]}`,
    en: m => `${m[1]} teleported to ${m[2]}`,
    emoji: '✨', type: 'info',
  },
  {
    match: /Teleported (\w+) to ([0-9., -]+)/i,
    pt: m => `${m[1]} teleportado para ${m[2]}`,
    en: m => `${m[1]} teleported to ${m[2]}`,
    emoji: '✨', type: 'info',
  },

  // ── /time ────────────────────────────────────────────────────────────────────
  {
    match: /Set the time to (\d+)/i,
    pt: m => `Hora do mundo alterada para ${translateTime(parseInt(m[1]))}`,
    en: m => `Time set to ${m[1]}`,
    emoji: '🕐', type: 'info',
  },
  {
    match: /The time is (\d+)/i,
    pt: m => `Hora atual: ${translateTime(parseInt(m[1]))}`,
    en: m => `Current time: ${m[1]}`,
    emoji: '🕐', type: 'info',
  },

  // ── /weather ─────────────────────────────────────────────────────────────────
  {
    match: /Changing to (clear|rain|thunder) weather/i,
    pt: m => `Clima alterado para ${translateWeather(m[1])}`,
    en: m => `Weather changed to ${m[1]}`,
    emoji: '🌦️', type: 'info',
  },
  {
    match: /Set the weather to (clear|rain|thunder)/i,
    pt: m => `Clima definido para ${translateWeather(m[1])}`,
    en: m => `Weather set to ${m[1]}`,
    emoji: '🌦️', type: 'info',
  },

  // ── /give ─────────────────────────────────────────────────────────────────────
  {
    match: /Gave (\d+) \[(.+)\] to (\w+)/i,
    pt: m => `Deu ${m[1]}x ${m[2]} para ${m[3]}`,
    en: m => `Gave ${m[1]}x ${m[2]} to ${m[3]}`,
    emoji: '🎁', type: 'info',
  },

  // ── /kill ─────────────────────────────────────────────────────────────────────
  {
    match: /Killed (\w+)/i,
    pt: m => `${m[1]} foi morto por comando`,
    en: m => `${m[1]} was killed by command`,
    emoji: '💀', type: 'info',
  },

  // ── /clear ────────────────────────────────────────────────────────────────────
  {
    match: /Removed (\d+) items? from (\w+)/i,
    pt: m => `Removidos ${m[1]} itens do inventário de ${m[2]}`,
    en: m => `Removed ${m[1]} items from ${m[2]}'s inventory`,
    emoji: '🗑️', type: 'info',
  },

  // ── /effect ───────────────────────────────────────────────────────────────────
  {
    match: /(?:Applied|Given) effect (.+) to (\w+)/i,
    pt: m => `Efeito ${m[1]} aplicado em ${m[2]}`,
    en: m => `Effect ${m[1]} applied to ${m[2]}`,
    emoji: '✨', type: 'info',
  },
  {
    match: /Took all effects from (\w+)/i,
    pt: m => `Todos os efeitos removidos de ${m[1]}`,
    en: m => `All effects removed from ${m[1]}`,
    emoji: '✨', type: 'info',
  },

  // ── /xp / /experience ─────────────────────────────────────────────────────────
  {
    match: /Gave (\d+) experience (?:levels? )?to (\w+)/i,
    pt: m => `${m[2]} recebeu ${m[1]} de experiência`,
    en: m => `Gave ${m[1]} experience to ${m[2]}`,
    emoji: '⭐', type: 'info',
  },

  // ── /say ──────────────────────────────────────────────────────────────────────
  {
    match: /\[Server\] (.+)/,
    pt: m => `[Servidor] ${m[1]}`,
    en: m => `[Server] ${m[1]}`,
    emoji: '📢', type: 'info',
  },

  // ── /list ─────────────────────────────────────────────────────────────────────
  {
    match: /There are (\d+) of a max(?: of)? (\d+) players? online(?:: (.+))?/i,
    pt: m => {
      const players = m[3] ? `: ${m[3]}` : ''
      return `${m[1]} de ${m[2]} jogadores online${players}`
    },
    en: m => {
      const players = m[3] ? `: ${m[3]}` : ''
      return `${m[1]} of ${m[2]} players online${players}`
    },
    emoji: '👥', type: 'info',
  },

  // ── /difficulty ───────────────────────────────────────────────────────────────
  {
    match: /The difficulty has been set to (Peaceful|Easy|Normal|Hard)/i,
    pt: m => `Dificuldade alterada para ${translateDifficulty(m[1])}`,
    en: m => `Difficulty set to ${m[1]}`,
    emoji: '⚔️', type: 'info',
  },

  // ── /gamerule ─────────────────────────────────────────────────────────────────
  {
    match: /Game rule (\w+) has been updated to (.+)/i,
    pt: m => `Regra de jogo "${m[1]}" definida para ${m[2]}`,
    en: m => `Game rule "${m[1]}" set to ${m[2]}`,
    emoji: '📜', type: 'info',
  },
  {
    match: /Gamerule (\w+) is currently set to: (.+)/i,
    pt: m => `Regra "${m[1]}": ${m[2]}`,
    en: m => `Rule "${m[1]}": ${m[2]}`,
    emoji: '📜', type: 'info',
  },

  // ── /seed ─────────────────────────────────────────────────────────────────────
  {
    match: /Seed: \[?(-?\d+)\]?/i,
    pt: m => `Seed do mundo: ${m[1]}`,
    en: m => `World seed: ${m[1]}`,
    emoji: '🌱', type: 'info',
  },

  // ── /scoreboard ───────────────────────────────────────────────────────────────
  {
    match: /Created new objective (.+)/i,
    pt: m => `Placar "${m[1]}" criado`,
    en: m => `Scoreboard "${m[1]}" created`,
    emoji: '📊', type: 'info',
  },
  {
    match: /Removed objective (.+)/i,
    pt: m => `Placar "${m[1]}" removido`,
    en: m => `Scoreboard "${m[1]}" removed`,
    emoji: '📊', type: 'info',
  },

  // ── /summon ───────────────────────────────────────────────────────────────────
  {
    match: /Summoned new (.+)/i,
    pt: m => `Invocado: ${m[1]}`,
    en: m => `Summoned: ${m[1]}`,
    emoji: '✨', type: 'info',
  },

  // ── /fill ─────────────────────────────────────────────────────────────────────
  {
    match: /(\d+) blocks? filled/i,
    pt: m => `${m[1]} blocos preenchidos`,
    en: m => `${m[1]} blocks filled`,
    emoji: '🧱', type: 'info',
  },

  // ── /clone ────────────────────────────────────────────────────────────────────
  {
    match: /(\d+) blocks? cloned/i,
    pt: m => `${m[1]} blocos clonados`,
    en: m => `${m[1]} blocks cloned`,
    emoji: '🧱', type: 'info',
  },

  // ── /forceload ────────────────────────────────────────────────────────────────
  {
    match: /Added (\d+) chunk/i,
    pt: m => `${m[1]} chunk(s) forçados a carregar`,
    en: m => `${m[1]} chunk(s) force-loaded`,
    emoji: '📦', type: 'info',
  },

  // ── Unknown command ───────────────────────────────────────────────────────────
  {
    match: /Unknown or incomplete command/i,
    pt: () => 'Comando desconhecido ou incompleto',
    en: () => 'Unknown or incomplete command',
    emoji: '❓', type: 'warn',
  },
  {
    match: /Unknown command\. Type/i,
    pt: () => 'Comando desconhecido',
    en: () => 'Unknown command',
    emoji: '❓', type: 'warn',
  },

  // ── Server command output ─────────────────────────────────────────────────────
  {
    match: /\[(?:Server|CONSOLE)\]: (.+)/,
    pt: m => `Comando do servidor: ${m[1]}`,
    en: m => `Server command: ${m[1]}`,
    emoji: '⌨️', type: 'cmd',
  },

  // ── Plugins ──────────────────────────────────────────────────────────────────
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
  {
    match: /Plugin (.+) is incompatible/i,
    pt: m => `Plugin ${m[1]} é incompatível com esta versão`,
    en: m => `Plugin ${m[1]} is incompatible with this version`,
    emoji: '⚠️', type: 'warn',
  },
  {
    // EssentialsX
    match: /Enabling EssentialsX v/i,
    pt: () => 'EssentialsX ativado',
    en: () => 'EssentialsX enabled',
    emoji: '🔌', type: 'info',
  },
  {
    // LuckPerms
    match: /Loading LuckPerms/i,
    pt: () => 'LuckPerms carregando...',
    en: () => 'LuckPerms loading...',
    emoji: '🔑', type: 'info',
  },
  {
    match: /LuckPerms .* loaded successfully/i,
    pt: () => 'LuckPerms carregado!',
    en: () => 'LuckPerms loaded!',
    emoji: '🔑', type: 'success',
  },

  // ── Errors & warnings ─────────────────────────────────────────────────────────
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
    pt: () => null as unknown as string,
    en: () => null as unknown as string,
    emoji: '', type: 'info', hide: true,
  },

  // ── CraftServer internal ─────────────────────────────────────────────────────
  {
    match: /── (.+) ──/,
    pt: m => m[1],
    en: m => m[1],
    emoji: '📋', type: 'info',
  },
]

// ─── Helper translators ───────────────────────────────────────────────────────
function translateGamemode(mode: string): string {
  const map: Record<string, string> = {
    survival: 'Sobrevivência', creative: 'Criativo',
    adventure: 'Aventura', spectator: 'Espectador',
  }
  return map[mode.toLowerCase()] ?? mode
}

function translateDifficulty(d: string): string {
  const map: Record<string, string> = {
    peaceful: 'Pacífico', easy: 'Fácil', normal: 'Normal', hard: 'Difícil',
  }
  return map[d.toLowerCase()] ?? d
}

function translateWeather(w: string): string {
  const map: Record<string, string> = { clear: 'Sol', rain: 'Chuva', thunder: 'Tempestade' }
  return map[w.toLowerCase()] ?? w
}

function translateTime(ticks: number): string {
  const hour = Math.floor(((ticks + 6000) % 24000) / 1000)
  if (ticks === 1000 || (ticks >= 1000 && ticks < 1010)) return 'Manhã (amanhecer)'
  if (ticks === 6000) return 'Meio-dia'
  if (ticks === 12000) return 'Tarde'
  if (ticks === 18000) return 'Meia-noite'
  return `${ticks} ticks (~${hour}h)`
}

function translateDisconnectReason(reason: string): string {
  const map: Record<string, string> = {
    'Timed out': 'Conexão expirou',
    'You have been kicked': 'Expulso do servidor',
    'Flying is not enabled': 'Voo não permitido neste servidor',
    'disconnect.spam': 'Muitas mensagens enviadas',
    'disconnect.loginFailedInfo': 'Falha na autenticação',
    'disconnect.genericReason': 'Desconectado',
    'Server is restarting': 'Servidor reiniciando',
    'Server closed': 'Servidor encerrado',
  }
  return map[reason] ?? reason
}

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
  /at [\w$.]+\([\w.]+:\d+\)/i,
  /\.\.\. \d+ more/i,
  /org\.bukkit/i,
  /com\.google/i,
  /io\.netty/i,
  /UUID of player \w+ is [a-f0-9-]+$/i,  // full UUID line (shown after auth rule matches short form)
]

// ─── Main translate function ──────────────────────────────────────────────────
export function translateLog(
  raw: string,
  lang: 'pt' | 'en'
): FriendlyLog | null {
  const line = raw.trimEnd()
  if (!line) return null

  // Strip common log prefix: [12:34:56] [Server thread/INFO]: message
  const stripped = line.replace(/^\[[\d:]+\] \[[\w /\\]+(?:\/\w+)?\]: /, '').trim()

  // Check noise against both raw and stripped
  if (NOISE_PATTERNS.some(p => p.test(line) || p.test(stripped))) return null

  // Try each rule against stripped line first, then raw
  for (const rule of RULES) {
    const m = stripped.match(rule.match) ?? line.match(rule.match)
    if (m) {
      if (rule.hide) return null
      const text = lang === 'en' ? rule.en(m) : rule.pt(m)
      if (!text) return null
      return { text, emoji: rule.emoji, type: rule.type }
    }
  }

  // Plain ERROR/WARN lines without a specific rule
  if (/ERROR|SEVERE/i.test(line)) {
    const clean = stripped || line
    return { text: clean, emoji: '❌', type: 'error' }
  }
  if (/WARN/i.test(line)) {
    const clean = stripped || line
    return { text: clean, emoji: '⚠️', type: 'warn' }
  }

  return null
}

// ─── Classify raw log type (for both modes) ───────────────────────────────────
export function rawLogType(line: string): 'info' | 'warn' | 'error' | 'cmd' {
  if (line.includes('ERROR') || line.includes('SEVERE')) return 'error'
  if (line.includes('WARN')) return 'warn'
  if (line.startsWith('>')) return 'cmd'
  return 'info'
}
