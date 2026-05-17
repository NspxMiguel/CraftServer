import type { PresetPlugin } from '../types'

// Plugins pré-bundled para Paper/Purpur/Hybrid
// Bedrock (PowerNukkit) usa plugins diferentes — estes são desativados automaticamente
export const PRESET_PLUGINS: PresetPlugin[] = [

  // ── Auth & Segurança ──────────────────────────────────────────────────────
  {
    name: 'AuthMe Reloaded',
    description: 'Sistema de autenticação para modo offline. Jogadores com jogo original entram automaticamente (modo premium). Obrigatório em servidores cracked.',
    url: 'https://github.com/AuthMe/AuthMeReloaded/releases/latest/download/AuthMe.jar',
    filename: 'AuthMe.jar',
    enabled: true,
    category: 'auth',
  },
  {
    name: 'SkinsRestorer',
    description: 'Restaura e personaliza skins em servidores offline. Jogadores veem suas skins normais mesmo sem conta premium.',
    url: 'https://github.com/SkinsRestorer/SkinsRestorer/releases/latest/download/SkinsRestorer.jar',
    filename: 'SkinsRestorer.jar',
    enabled: true,
    category: 'auth',
  },

  // ── Core & Permissões ─────────────────────────────────────────────────────
  {
    name: 'EssentialsX',
    description: 'Comandos essenciais: /home, /warp, /kit, /tp, /spawn, economia básica e muito mais.',
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
    description: 'Placeholders dinâmicos para outros plugins (nomes, grupos, stats).',
    url: 'https://github.com/PlaceholderAPI/PlaceholderAPI/releases/latest/download/PlaceholderAPI.jar',
    filename: 'PlaceholderAPI.jar',
    enabled: true,
    category: 'core',
  },
  {
    name: 'ProtocolLib',
    description: 'Biblioteca de protocolo. Requisito de vários plugins como AuthMe, Citizens e outros.',
    url: 'https://github.com/dmulloy2/ProtocolLib/releases/latest/download/ProtocolLib.jar',
    filename: 'ProtocolLib.jar',
    enabled: true,
    category: 'core',
  },

  // ── Compatibilidade de Versão ─────────────────────────────────────────────
  {
    name: 'ViaVersion',
    description: 'Permite que jogadores com versões mais novas do Minecraft entrem no servidor. Jogadores em versões antigas não conseguem entrar.',
    url: 'https://github.com/ViaVersion/ViaVersion/releases/latest/download/ViaVersion.jar',
    filename: 'ViaVersion.jar',
    enabled: false,
    category: 'compat',
  },

  // ── Proteção & Anti-Grief ─────────────────────────────────────────────────
  {
    name: 'WorldEdit',
    description: 'Editor de mundo in-game. Seleções, operações em bloco, schematic, etc.',
    url: 'https://mediafilez.forgecdn.net/files/5637/592/worldedit-bukkit-7.3.12.jar',
    filename: 'WorldEdit.jar',
    enabled: false,
    category: 'protection',
  },
  {
    name: 'WorldGuard',
    description: 'Proteção de regiões, controle de acesso por área e regras customizáveis.',
    url: 'https://mediafilez.forgecdn.net/files/5637/604/worldguard-bukkit-7.0.13.jar',
    filename: 'WorldGuard.jar',
    enabled: false,
    category: 'protection',
  },
  {
    name: 'CoreProtect',
    description: 'Log de todas as ações no servidor. Veja quem quebrou/colocou cada bloco e faça rollback.',
    url: 'https://github.com/PlayPro/CoreProtect/releases/latest/download/CoreProtect.jar',
    filename: 'CoreProtect.jar',
    enabled: false,
    category: 'protection',
  },
  {
    name: 'GriefPrevention',
    description: 'Sistema de claim de terrenos. Jogadores protegem seu terreno com uma pá dourada.',
    url: 'https://github.com/TechFortress/GriefPrevention/releases/latest/download/GriefPrevention.jar',
    filename: 'GriefPrevention.jar',
    enabled: false,
    category: 'protection',
  },

  // ── Qualidade de Vida ─────────────────────────────────────────────────────
  {
    name: 'Chairs (Sit)',
    description: 'Sente em escadas, slabs e outros blocos clicando com shift+clique direito.',
    url: 'https://github.com/Betrayd/Chairs/releases/latest/download/Chairs.jar',
    filename: 'Chairs.jar',
    enabled: true,
    category: 'qol',
  },
  {
    name: 'TAB',
    description: 'Lista de jogadores (TAB) e nametags customizáveis com cores, prefixos e stats.',
    url: 'https://github.com/NEZNAMY/TAB/releases/latest/download/TAB.v4.1.14.jar',
    filename: 'TAB.jar',
    enabled: true,
    category: 'qol',
  },
  {
    name: 'Citizens',
    description: 'NPCs com aparência de jogador. Usados por plugins de quests, shops, etc.',
    url: 'https://ci.citizensnpcs.co/job/citizens2/lastSuccessfulBuild/artifact/dist/target/Citizens.jar',
    filename: 'Citizens.jar',
    enabled: false,
    category: 'qol',
  },
  {
    name: 'Multiverse-Core',
    description: 'Gerencie múltiplos mundos no mesmo servidor (criativo, survival, minigames).',
    url: 'https://github.com/Multiverse/Multiverse-Core/releases/latest/download/multiverse-core.jar',
    filename: 'Multiverse-Core.jar',
    enabled: false,
    category: 'qol',
  },
]

export type PluginCategory = 'auth' | 'core' | 'compat' | 'protection' | 'qol'

export const CATEGORY_LABELS: Record<PluginCategory, string> = {
  auth: '🔐 Auth & Segurança',
  core: '⚙️ Core & Permissões',
  compat: '🔄 Compatibilidade',
  protection: '🛡️ Proteção',
  qol: '✨ Qualidade de Vida',
}
