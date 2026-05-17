import type { PresetPlugin } from '../types'

// For plugins with modrinthSlug, the version is resolved dynamically from Modrinth
// at server creation time to match the chosen Minecraft version.
export const PRESET_PLUGINS: PresetPlugin[] = [

  // ── Auth & Segurança ──────────────────────────────────────────────────────
  {
    name: 'AuthMe Reloaded',
    description: 'Sistema de autenticação para modo offline. Auto-login para jogadores com conta premium.',
    url: 'https://github.com/AuthMe/AuthMeReloaded/releases/latest/download/AuthMe.jar',
    filename: 'AuthMe.jar',
    enabled: true,
    category: 'auth',
  },
  {
    name: 'SkinsRestorer',
    description: 'Restaura skins em servidores offline. Jogadores veem suas skins normalmente.',
    url: 'https://github.com/SkinsRestorer/SkinsRestorer/releases/latest/download/SkinsRestorer.jar',
    filename: 'SkinsRestorer.jar',
    enabled: true,
    category: 'auth',
  },

  // ── Core & Permissões ─────────────────────────────────────────────────────
  {
    name: 'EssentialsX',
    description: 'Comandos essenciais: /home, /warp, /kit, /tp, /spawn, economia e muito mais.',
    modrinthSlug: 'essentialsx',
    url: 'https://github.com/EssentialsX/Essentials/releases/latest/download/EssentialsX.jar',
    filename: 'EssentialsX.jar',
    enabled: true,
    category: 'core',
  },
  {
    name: 'EssentialsX Chat',
    description: 'Formatação de chat com prefixos, cores e grupos. Integra com LuckPerms.',
    url: 'https://github.com/EssentialsX/Essentials/releases/latest/download/EssentialsXChat.jar',
    filename: 'EssentialsXChat.jar',
    enabled: true,
    category: 'core',
  },
  {
    name: 'LuckPerms',
    description: 'Sistema de permissões avançado com editor web. Necessário para grupos e cargos.',
    modrinthSlug: 'luckperms',
    url: 'https://download.luckperms.net/1567/bukkit/loader/LuckPerms-Bukkit-5.4.148.jar',
    filename: 'LuckPerms-Bukkit.jar',
    enabled: true,
    category: 'core',
  },
  {
    name: 'Vault',
    description: 'API de economia e permissões. Necessária para plugins que usam dinheiro in-game.',
    url: 'https://github.com/milkbowl/Vault/releases/latest/download/Vault.jar',
    filename: 'Vault.jar',
    enabled: true,
    category: 'core',
  },
  {
    name: 'PlaceholderAPI',
    description: 'Placeholders dinâmicos para outros plugins (nomes, grupos, stats, economia).',
    modrinthSlug: 'placeholderapi',
    url: 'https://github.com/PlaceholderAPI/PlaceholderAPI/releases/latest/download/PlaceholderAPI.jar',
    filename: 'PlaceholderAPI.jar',
    enabled: true,
    category: 'core',
  },
  {
    name: 'ProtocolLib',
    description: 'Biblioteca de protocolo. Requisito de AuthMe, Citizens, TAB e muitos outros.',
    url: 'https://github.com/dmulloy2/ProtocolLib/releases/latest/download/ProtocolLib.jar',
    filename: 'ProtocolLib.jar',
    enabled: true,
    category: 'core',
  },

  // ── Compatibilidade de Versão ─────────────────────────────────────────────
  {
    name: 'ViaVersion',
    description: 'Permite que jogadores com versões mais novas do Minecraft entrem no servidor. Jogadores em versões antigas não conseguem entrar.',
    modrinthSlug: 'viaversion',
    url: 'https://github.com/ViaVersion/ViaVersion/releases/latest/download/ViaVersion.jar',
    filename: 'ViaVersion.jar',
    enabled: false,
    category: 'compat',
  },

  // ── Proteção & Anti-Grief ─────────────────────────────────────────────────
  {
    name: 'WorldEdit',
    description: 'Editor de mundo in-game. Seleções, operações em bloco, schematic, brushes.',
    modrinthSlug: 'worldedit',
    url: 'https://mediafilez.forgecdn.net/files/5637/592/worldedit-bukkit-7.3.12.jar',
    filename: 'WorldEdit.jar',
    enabled: false,
    category: 'protection',
  },
  {
    name: 'WorldGuard',
    description: 'Proteção de regiões, controle de acesso por área e regras customizáveis.',
    modrinthSlug: 'worldguard',
    url: 'https://mediafilez.forgecdn.net/files/5637/604/worldguard-bukkit-7.0.13.jar',
    filename: 'WorldGuard.jar',
    enabled: false,
    category: 'protection',
  },
  {
    name: 'CoreProtect',
    description: 'Log de todas as ações. Veja quem quebrou/colocou cada bloco e faça rollback.',
    modrinthSlug: 'coreprotect',
    url: 'https://github.com/PlayPro/CoreProtect/releases/latest/download/CoreProtect.jar',
    filename: 'CoreProtect.jar',
    enabled: false,
    category: 'protection',
  },
  {
    name: 'GriefPrevention',
    description: 'Sistema de claim de terrenos com pá dourada. Protege builds dos jogadores.',
    url: 'https://github.com/TechFortress/GriefPrevention/releases/latest/download/GriefPrevention.jar',
    filename: 'GriefPrevention.jar',
    enabled: false,
    category: 'protection',
  },
  {
    name: 'AntiCheatReloaded',
    description: 'Anti-cheat leve e configurável. Detecta fly, speed, kill aura e outros cheats.',
    modrinthSlug: 'anticheatreloaded',
    url: 'https://github.com/Rammelkast/AntiCheatReloaded/releases/latest/download/AntiCheatReloaded.jar',
    filename: 'AntiCheatReloaded.jar',
    enabled: false,
    category: 'protection',
  },
  {
    name: 'BanManager',
    description: 'Gerenciamento avançado de punições: ban, mute, warn, kick com histórico.',
    modrinthSlug: 'banmanager',
    url: 'https://github.com/BanManagement/BanManager/releases/latest/download/BanManager-Bukkit.jar',
    filename: 'BanManager.jar',
    enabled: false,
    category: 'protection',
  },

  // ── Performance ───────────────────────────────────────────────────────────
  {
    name: 'Spark',
    description: 'Profiler de performance em tempo real. Identifica lag e TPS drops com detalhe.',
    modrinthSlug: 'spark',
    url: 'https://github.com/lucko/spark/releases/latest/download/spark-bukkit.jar',
    filename: 'spark.jar',
    enabled: true,
    category: 'perf',
  },
  {
    name: 'Chunky',
    description: 'Pré-gera chunks para eliminar lag de geração de mundo. Essencial em novos servidores.',
    modrinthSlug: 'chunky',
    url: 'https://github.com/pop4959/Chunky/releases/latest/download/Chunky-Bukkit.jar',
    filename: 'Chunky.jar',
    enabled: false,
    category: 'perf',
  },

  // ── Mapa & Info ───────────────────────────────────────────────────────────
  {
    name: 'Dynmap',
    description: 'Mapa do servidor em tempo real acessível pelo navegador. Mostra jogadores e builds.',
    modrinthSlug: 'dynmap',
    url: 'https://github.com/webbukkit/dynmap/releases/latest/download/Dynmap-3.7-spigot.jar',
    filename: 'Dynmap.jar',
    enabled: false,
    category: 'map',
  },

  // ── Social & Comunidade ───────────────────────────────────────────────────
  {
    name: 'DiscordSRV',
    description: 'Integração completa com Discord: chat bidirecional, console, alertas e mais.',
    url: 'https://github.com/DiscordSRV/DiscordSRV/releases/latest/download/DiscordSRV-Build.jar',
    filename: 'DiscordSRV.jar',
    enabled: false,
    category: 'social',
  },

  // ── Qualidade de Vida ─────────────────────────────────────────────────────
  {
    name: 'TAB',
    description: 'Lista de jogadores (TAB) e nametags customizáveis com cores, prefixos e stats.',
    modrinthSlug: 'tab-was-taken',
    url: 'https://github.com/NEZNAMY/TAB/releases/latest/download/TAB.jar',
    filename: 'TAB.jar',
    enabled: true,
    category: 'qol',
  },
  {
    name: 'Citizens',
    description: 'NPCs com aparência de jogador. Base para quests, shops, warps e diálogos.',
    url: 'https://ci.citizensnpcs.co/job/citizens2/lastSuccessfulBuild/artifact/dist/target/Citizens.jar',
    filename: 'Citizens.jar',
    enabled: false,
    category: 'qol',
  },
  {
    name: 'Multiverse-Core',
    description: 'Múltiplos mundos no mesmo servidor: criativo, survival, minigames com portais.',
    url: 'https://github.com/Multiverse/Multiverse-Core/releases/latest/download/multiverse-core.jar',
    filename: 'Multiverse-Core.jar',
    enabled: false,
    category: 'qol',
  },
  {
    name: 'DecentHolograms',
    description: 'Hologramas animados, textos flutuantes, placeholders de jogadores e rankings.',
    modrinthSlug: 'decentholograms',
    url: 'https://github.com/decentsoftware-eu/decentholograms/releases/latest/download/DecentHolograms.jar',
    filename: 'DecentHolograms.jar',
    enabled: false,
    category: 'qol',
  },
  {
    name: 'Chairs (Sit)',
    description: 'Sente em escadas, slabs e outros blocos com shift+clique direito.',
    url: 'https://github.com/Betrayd/Chairs/releases/latest/download/Chairs.jar',
    filename: 'Chairs.jar',
    enabled: true,
    category: 'qol',
  },
  {
    name: 'SuperVanish',
    description: 'Vanish silencioso para admins e moderadores. Invisível para jogadores normais.',
    modrinthSlug: 'supervanish',
    url: 'https://github.com/LeonMangler/SuperVanish/releases/latest/download/SuperVanish.jar',
    filename: 'SuperVanish.jar',
    enabled: false,
    category: 'qol',
  },

  // ── RPG & Progressão ─────────────────────────────────────────────────────
  {
    name: 'mcMMO',
    description: 'Sistema de RPG com habilidades (mining, combat, fishing), levels e partidas.',
    url: 'https://github.com/mcMMO-Dev/mcMMO/releases/latest/download/mcMMO.jar',
    filename: 'mcMMO.jar',
    enabled: false,
    category: 'rpg',
  },
  {
    name: 'Jobs Reborn',
    description: 'Sistema de empregos com salário por ação (minerar, construir, pescar, etc).',
    modrinthSlug: 'jobs-reborn',
    url: 'https://github.com/Zrips/Jobs/releases/latest/download/Jobs.jar',
    filename: 'Jobs.jar',
    enabled: false,
    category: 'rpg',
  },
  {
    name: 'AuraSkills',
    description: 'Sistema completo de habilidades e atributos RPG. Substituto moderno do mcMMO.',
    modrinthSlug: 'auraskills',
    url: 'https://github.com/Archy-X/AureliumSkills/releases/latest/download/AuraSkills.jar',
    filename: 'AuraSkills.jar',
    enabled: false,
    category: 'rpg',
  },
  {
    name: 'MythicMobs',
    description: 'Cria mobs customizados com skills, drops e comportamentos únicos.',
    url: 'https://mythiccraft.io/index.php?resources/mythicmobs.1/',
    filename: 'MythicMobs.jar',
    enabled: false,
    category: 'rpg',
  },
]

export type PluginCategory = 'auth' | 'core' | 'compat' | 'protection' | 'perf' | 'map' | 'social' | 'qol' | 'rpg'

export const CATEGORY_LABELS: Record<PluginCategory, string> = {
  auth:       '🔐 Auth & Segurança',
  core:       '⚙️  Core & Permissões',
  compat:     '🔄 Compatibilidade',
  protection: '🛡️  Proteção',
  perf:       '⚡ Performance',
  map:        '🗺️  Mapa & Info',
  social:     '💬 Social & Discord',
  qol:        '✨ Qualidade de Vida',
  rpg:        '⚔️  RPG & Progressão',
}
