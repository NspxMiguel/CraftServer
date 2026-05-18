// ── CraftServer — Game Mode Presets ──────────────────────────────────────────
// Each preset = plugins (auto-downloaded) + server.properties + optional world

export interface PresetPluginDef {
  name: string
  filename: string
  url: string           // HTTPS direct download URL (fallback)
  modrinthSlug?: string // preferred — resolves the best JAR for the MC version
}

export interface GamePreset {
  id: string
  name: string
  nameEN: string
  emoji: string
  taglinePT: string
  taglineEN: string
  descPT: string
  descEN: string
  color: string          // tailwind text color
  border: string         // tailwind border color
  bg: string             // tailwind bg color
  glow: string           // tailwind shadow/glow
  gradient: string       // card gradient

  // gameplay info
  players: string        // "2-12 jogadores"
  difficultyPT: string   // "Fácil de configurar"
  difficultyEN: string
  readyToPlay: boolean   // true = zero setup, false = needs some config
  featuresPT: string[]
  featuresEN: string[]

  // server setup
  type?: string  // server type override ('purpur', 'paper', etc.) — defaults to 'purpur'
  plugins: PresetPluginDef[]
  serverProperties?: Record<string, string | number | boolean>

  // world download (optional — zip extracted as 'world' folder)
  worldUrl?: string
  worldNote?: string // shown to user if worldUrl not available
  worldNotePT?: string
  worldNoteEN?: string
}

// ─── Shared plugin definitions — modrinthSlug preferred, url is fallback ──────
const P: Record<string, PresetPluginDef> = {
  essentialsX:    { name: 'EssentialsX',       filename: 'EssentialsX.jar',         modrinthSlug: 'essentialsx',           url: 'https://github.com/EssentialsX/Essentials/releases/latest/download/EssentialsX.jar' },
  essentialsChat: { name: 'EssentialsX Chat',   filename: 'EssentialsXChat.jar',     modrinthSlug: 'essentialsx-chat',      url: 'https://github.com/EssentialsX/Essentials/releases/latest/download/EssentialsXChat.jar' },
  luckPerms:      { name: 'LuckPerms',          filename: 'LuckPerms-Bukkit.jar',    modrinthSlug: 'luckperms',             url: 'https://download.luckperms.net/1567/bukkit/loader/LuckPerms-Bukkit-5.4.148.jar' },
  vault:          { name: 'Vault',              filename: 'Vault.jar',                                                      url: 'https://github.com/milkbowl/Vault/releases/latest/download/Vault.jar' },
  papi:           { name: 'PlaceholderAPI',     filename: 'PlaceholderAPI.jar',      modrinthSlug: 'placeholderapi',        url: 'https://github.com/PlaceholderAPI/PlaceholderAPI/releases/latest/download/PlaceholderAPI.jar' },
  protocolLib:    { name: 'ProtocolLib',        filename: 'ProtocolLib.jar',                                               url: 'https://github.com/dmulloy2/ProtocolLib/releases/latest/download/ProtocolLib.jar' },
  viaVersion:     { name: 'ViaVersion',         filename: 'ViaVersion.jar',          modrinthSlug: 'viaversion',            url: 'https://github.com/ViaVersion/ViaVersion/releases/latest/download/ViaVersion.jar' },
  spark:          { name: 'Spark',              filename: 'spark.jar',               modrinthSlug: 'spark',                 url: 'https://ci.lucko.me/job/spark/lastSuccessfulBuild/artifact/spark-bukkit/build/libs/spark-bukkit.jar' },
  worldEdit:      { name: 'WorldEdit',          filename: 'WorldEdit.jar',           modrinthSlug: 'worldedit',             url: 'https://mediafilez.forgecdn.net/files/5637/592/worldedit-bukkit-7.3.12.jar' },
  worldGuard:     { name: 'WorldGuard',         filename: 'WorldGuard.jar',          modrinthSlug: 'worldguard',            url: 'https://mediafilez.forgecdn.net/files/5637/604/worldguard-bukkit-7.0.13.jar' },
  coreProtect:    { name: 'CoreProtect',        filename: 'CoreProtect.jar',         modrinthSlug: 'coreprotect',           url: 'https://github.com/PlayPro/CoreProtect/releases/latest/download/CoreProtect.jar' },
  tab:            { name: 'TAB',                filename: 'TAB.jar',                 modrinthSlug: 'tab-was-taken',         url: 'https://github.com/NEZNAMY/TAB/releases/latest/download/TAB.jar' },
  decentHolo:     { name: 'DecentHolograms',    filename: 'DecentHolograms.jar',     modrinthSlug: 'decentholograms',       url: 'https://github.com/decentsoftware-eu/decentholograms/releases/latest/download/DecentHolograms.jar' },
  griefPrev:      { name: 'GriefPrevention',    filename: 'GriefPrevention.jar',                                           url: 'https://github.com/TechFortress/GriefPrevention/releases/latest/download/GriefPrevention.jar' },
  mcMMO:          { name: 'mcMMO',              filename: 'mcMMO.jar',                                                      url: 'https://github.com/mcMMO-Dev/mcMMO/releases/latest/download/mcMMO.jar' },
  jobs:           { name: 'Jobs Reborn',        filename: 'Jobs.jar',                modrinthSlug: 'jobs-reborn',           url: 'https://github.com/Zrips/Jobs/releases/latest/download/Jobs.jar' },
  authMe:         { name: 'AuthMe',             filename: 'AuthMe.jar',                                                     url: 'https://github.com/AuthMe/AuthMeReloaded/releases/latest/download/AuthMe.jar' },
  skinsRestorer:  { name: 'SkinsRestorer',       filename: 'SkinsRestorer.jar',                                              url: 'https://github.com/SkinsRestorer/SkinsRestorer/releases/latest/download/SkinsRestorer.jar' },
  chairs:         { name: 'Chairs',             filename: 'Chairs.jar',              modrinthSlug: 'chairs',                url: 'https://github.com/nicuch/Chairs/releases/latest/download/Chairs.jar' },
  multiverse:     { name: 'Multiverse-Core',    filename: 'Multiverse-Core.jar',                                            url: 'https://github.com/Multiverse/Multiverse-Core/releases/latest/download/multiverse-core.jar' },
  playit:         { name: 'PlayIt.gg',          filename: 'playit-minecraft.jar',    modrinthSlug: 'playit',                url: 'https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft.jar' },
  // BentoBox ecosystem
  bentoBox:       { name: 'BentoBox',           filename: 'BentoBox.jar',                                                   url: 'https://github.com/BentoBoxWorld/BentoBox/releases/latest/download/BentoBox.jar' },
  bSkyBlock:      { name: 'BSkyBlock',          filename: 'BSkyBlock.jar',                                                  url: 'https://github.com/BentoBoxWorld/BSkyBlock/releases/latest/download/BSkyBlock.jar' },
  aOneBlock:      { name: 'AOneBlock',          filename: 'AOneBlock.jar',                                                  url: 'https://github.com/BentoBoxWorld/AOneBlock/releases/latest/download/AOneBlock.jar' },
  levelAddon:     { name: 'Level',              filename: 'Level.jar',                                                      url: 'https://github.com/BentoBoxWorld/Level/releases/latest/download/Level.jar' },
  challenges:     { name: 'Challenges',         filename: 'Challenges.jar',                                                  url: 'https://github.com/BentoBoxWorld/Challenges/releases/latest/download/Challenges.jar' },
  bankAddon:      { name: 'Bank',               filename: 'Bank.jar',                                                       url: 'https://github.com/BentoBoxWorld/Bank/releases/latest/download/Bank.jar' },
  shopAddon:      { name: 'Shop',               filename: 'Shop.jar',                                                       url: 'https://github.com/BentoBoxWorld/Shop/releases/latest/download/Shop.jar' },
  warps:          { name: 'Warps',              filename: 'Warps.jar',                                                      url: 'https://github.com/BentoBoxWorld/Warps/releases/latest/download/Warps.jar' },
  // Minigame plugins
  bedWars:        { name: 'BedWars1058',        filename: 'BedWars1058.jar',                                                url: 'https://github.com/andrei1058/BedWars1058/releases/latest/download/BedWars1058.jar' },
  skyWars:        { name: 'SkyWars',            filename: 'SkyWars.jar',                                                    url: 'https://github.com/SkyWars/SkyWars/releases/latest/download/SkyWars.jar' },
  combatLog:      { name: 'CombatLogX',         filename: 'CombatLogX.jar',                                                 url: 'https://github.com/SirBlobman/CombatLogX/releases/latest/download/CombatLogX.jar' },
}

// ─── Presets ──────────────────────────────────────────────────────────────────
export const GAME_PRESETS: GamePreset[] = [

  // ── 🌿 Survival Padrão ──────────────────────────────────────────────────────
  {
    id: 'survival',
    name: 'Survival Padrão',
    nameEN: 'Standard Survival',
    emoji: '🌿',
    taglinePT: 'Survival clássico com seus amigos',
    taglineEN: 'Classic survival with your friends',
    descPT: 'Minecraft sobrevivência do jeito que tem que ser. Mundo gerado, plugins essenciais, proteção de terreno e chat formatado.',
    descEN: 'Minecraft survival the way it should be. Generated world, essential plugins, land protection and formatted chat.',
    color: 'text-green-300', border: 'border-green-500/30', bg: 'bg-green-500/10', glow: 'shadow-green-500/15',
    gradient: 'from-green-500/20 to-transparent',
    players: '2–20', difficultyPT: 'Fácil — zero configuração', difficultyEN: 'Easy — zero setup',
    readyToPlay: true,
    featuresPT: ['Mundo gerado automaticamente', 'Proteção de terreno (claim)', 'Chat com cores e ranks', '/home /warp /kit', 'Anti-cheat básico'],
    featuresEN: ['Auto-generated world', 'Land claim protection', 'Colored chat with ranks', '/home /warp /kit', 'Basic anti-cheat'],
    plugins: [P.spark, P.essentialsX, P.essentialsChat, P.luckPerms, P.vault, P.papi, P.viaVersion, P.tab, P.griefPrev, P.coreProtect, P.chairs],
    serverProperties: { difficulty: 'normal', pvp: false, 'max-players': 20 },
  },

  // ── 💀 Hardcore ─────────────────────────────────────────────────────────────
  {
    id: 'hardcore',
    name: 'Hardcore',
    nameEN: 'Hardcore',
    emoji: '💀',
    taglinePT: 'Morra uma vez, perde tudo',
    taglineEN: 'Die once, lose everything',
    descPT: 'Morte permanente, dificuldade máxima. Um erro e você vira espectador. Pra quem quer uma experiência verdadeiramente brutal.',
    descEN: 'Permanent death, maximum difficulty. One mistake and you become a spectator. For those who want a truly brutal experience.',
    color: 'text-red-300', border: 'border-red-500/30', bg: 'bg-red-500/10', glow: 'shadow-red-500/15',
    gradient: 'from-red-500/20 to-transparent',
    players: '2–10', difficultyPT: 'Fácil — zero configuração', difficultyEN: 'Easy — zero setup',
    readyToPlay: true,
    featuresPT: ['Morte permanente (vira espectador)', 'Dificuldade hard fixa', 'Vida reduzida por fome', '/home /warp para explorar', 'Sem respawn'],
    featuresEN: ['Permanent death (becomes spectator)', 'Fixed hard difficulty', 'Starvation damage', '/home /warp to explore', 'No respawn'],
    plugins: [P.spark, P.essentialsX, P.essentialsChat, P.luckPerms, P.vault, P.papi, P.viaVersion, P.tab, P.coreProtect],
    serverProperties: { hardcore: true, difficulty: 'hard', pvp: true, 'max-players': 10 },
  },

  // ── 🏝️ Skyblock ──────────────────────────────────────────────────────────────
  {
    id: 'skyblock',
    name: 'Skyblock',
    nameEN: 'Skyblock',
    emoji: '🏝️',
    taglinePT: 'Ilha no vácuo, recursos limitados',
    taglineEN: 'Island in the void, limited resources',
    descPT: 'Cada jogador começa com uma ilha no vácuo e recursos mínimos. Expanda sua ilha, complete desafios e suba no ranking de nível.',
    descEN: 'Each player starts with an island in the void and minimal resources. Expand your island, complete challenges and climb the level ranking.',
    color: 'text-sky-300', border: 'border-sky-500/30', bg: 'bg-sky-500/10', glow: 'shadow-sky-500/15',
    gradient: 'from-sky-500/20 to-transparent',
    players: '2–50', difficultyPT: 'Fácil — /island e joga', difficultyEN: 'Easy — /island and play',
    readyToPlay: true,
    featuresPT: ['Ilhas geradas automaticamente', 'Sistema de nível da ilha', 'Desafios com recompensa', 'Co-op: convide amigos para sua ilha', 'Ranking de ilhas'],
    featuresEN: ['Auto-generated islands', 'Island level system', 'Reward challenges', 'Co-op: invite friends to your island', 'Island ranking'],
    plugins: [P.spark, P.luckPerms, P.vault, P.papi, P.viaVersion, P.tab, P.decentHolo, P.bentoBox, P.bSkyBlock, P.levelAddon, P.challenges, P.warps, P.essentialsX],
    serverProperties: { difficulty: 'normal', pvp: false, 'max-players': 50, 'level-name': 'world' },
  },

  // ── ⬛ OneBlock ───────────────────────────────────────────────────────────────
  {
    id: 'oneblock',
    name: 'OneBlock',
    nameEN: 'OneBlock',
    emoji: '⬛',
    taglinePT: 'Um bloco infinito no vácuo',
    taglineEN: 'One infinite block in the void',
    descPT: 'Você começa no vácuo com um único bloco mágico que regenera infinitamente. Quebre-o e evolua pelas fases: Pradaria, Floresta, Mina, Nether e mais.',
    descEN: 'You start in the void with a single magic block that infinitely regenerates. Break it and evolve through phases: Plains, Forest, Mine, Nether and more.',
    color: 'text-neutral-300', border: 'border-neutral-500/30', bg: 'bg-neutral-500/10', glow: 'shadow-neutral-500/15',
    gradient: 'from-neutral-500/20 to-transparent',
    players: '1–30', difficultyPT: 'Fácil — /ob e joga', difficultyEN: 'Easy — /ob and play',
    readyToPlay: true,
    featuresPT: ['Bloco mágico regenerativo', '10+ fases de progressão', 'Mobs e loot únicos por fase', 'Missões e conquistas', 'Co-op com amigos na mesma ilha'],
    featuresEN: ['Regenerative magic block', '10+ progression phases', 'Unique mobs and loot per phase', 'Missions and achievements', 'Co-op with friends on same island'],
    plugins: [P.spark, P.luckPerms, P.vault, P.papi, P.viaVersion, P.tab, P.decentHolo, P.bentoBox, P.aOneBlock, P.levelAddon, P.challenges, P.essentialsX],
    serverProperties: { difficulty: 'normal', pvp: false, 'max-players': 30 },
  },

  // ── 💰 Ilha com Economia (ReiDeSky) ──────────────────────────────────────────
  {
    id: 'skyblock-eco',
    name: 'Ilha Economia',
    nameEN: 'Island Economy',
    emoji: '💰',
    taglinePT: 'Skyblock com loja, empregos e economia',
    taglineEN: 'Skyblock with shop, jobs and economy',
    descPT: 'Skyblock completo com sistema econômico real: loja de compra/venda pré-configurada, empregos com salário, banco da ilha e hologramas de ranking — estilo ReiDeSky, pronto para jogar.',
    descEN: 'Full Skyblock with real economy: pre-configured buy/sell shop, salaried jobs, island bank and ranking holograms — ReiDeSky style, ready to play.',
    color: 'text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/15',
    gradient: 'from-amber-500/20 to-transparent',
    players: '5–100', difficultyPT: 'Fácil — loja pré-configurada', difficultyEN: 'Easy — pre-configured shop',
    readyToPlay: true,
    featuresPT: ['Loja de compra/venda pré-configurada', 'Empregos (mineração, corte, pesca)', 'Banco da ilha com depósitos', 'Ranking de riqueza e nível', 'Missões e desafios com recompensas'],
    featuresEN: ['Pre-configured buy/sell shop', 'Jobs (mining, cutting, fishing)', 'Island bank with deposits', 'Wealth and level ranking', 'Missions and challenges with rewards'],
    plugins: [P.spark, P.luckPerms, P.vault, P.papi, P.viaVersion, P.tab, P.decentHolo, P.bentoBox, P.bSkyBlock, P.levelAddon, P.challenges, P.bankAddon, P.shopAddon, P.warps, P.essentialsX, P.mcMMO, P.jobs],
    serverProperties: { difficulty: 'normal', pvp: false, 'max-players': 100 },
  },

  // ── 🥊 KitPvP ────────────────────────────────────────────────────────────────
  {
    id: 'kitpvp',
    name: 'KitPvP',
    nameEN: 'KitPvP',
    emoji: '🥊',
    taglinePT: 'PvP com kits, ranking e arenas',
    taglineEN: 'PvP with kits, ranking and arenas',
    descPT: 'Servidor de PvP competitivo com 4 kits pré-configurados (Guerreiro, Arqueiro, Mago, Tank). Use /kit no jogo para equipar. Mundo plano gerado automaticamente.',
    descEN: 'Competitive PvP server with 4 pre-configured kits (Warrior, Archer, Mage, Tank). Use /kit in-game to equip. Auto-generated flat world.',
    color: 'text-orange-300', border: 'border-orange-500/30', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/15',
    gradient: 'from-orange-500/20 to-transparent',
    players: '2–32', difficultyPT: 'Fácil — /kit e sai lutando', difficultyEN: 'Easy — /kit and fight',
    readyToPlay: true,
    featuresPT: ['Kits: Guerreiro, Arqueiro, Mago, Tank', '/kit para equipar na hora', 'Mundo plano pronto para lutar', 'Anti-combatlog', 'EssentialsX + LuckPerms'],
    featuresEN: ['Kits: Warrior, Archer, Mage, Tank', '/kit to equip instantly', 'Flat world ready to fight', 'Anti-combatlog', 'EssentialsX + LuckPerms'],
    plugins: [P.spark, P.luckPerms, P.vault, P.papi, P.viaVersion, P.tab, P.decentHolo, P.essentialsX, P.essentialsChat, P.combatLog, P.protocolLib],
    serverProperties: { difficulty: 'normal', pvp: true, 'max-players': 32, 'level-type': 'flat', 'allow-nether': false, 'allow-end': false },
  },

  // ── 🛏️ BedWars ───────────────────────────────────────────────────────────────
  {
    id: 'bedwars',
    name: 'BedWars',
    nameEN: 'BedWars',
    emoji: '🛏️',
    taglinePT: 'Destrua as camas, elimine os inimigos',
    taglineEN: 'Destroy beds, eliminate enemies',
    descPT: 'Arena 2v2 pré-construída incluída — ilhas Red e Blue, geradores de ferro/ouro/diamante/esmeralda, loja e upgrades configurados. Liga imediatamente ao criar.',
    descEN: 'Pre-built 2v2 arena included — Red and Blue islands, iron/gold/diamond/emerald generators, shop and upgrades configured. Ready to play on first start.',
    color: 'text-red-300', border: 'border-red-500/30', bg: 'bg-red-500/8', glow: 'shadow-red-500/15',
    gradient: 'from-red-500/20 to-transparent',
    players: '2–4', difficultyPT: 'Fácil — arena 2v2 incluída', difficultyEN: 'Easy — 2v2 arena included',
    readyToPlay: true,
    featuresPT: ['Arena 2v2 pré-configurada', 'Geradores de ferro, ouro, diamante e esmeralda', 'Loja de itens e upgrades', 'Lobby de espera com teletransporte', 'Camas se reconstroem ao reiniciar'],
    featuresEN: ['Pre-configured 2v2 arena', 'Iron, gold, diamond and emerald generators', 'Item shop and upgrades', 'Waiting lobby with teleport', 'Beds auto-rebuild on restart'],
    plugins: [P.spark, P.luckPerms, P.vault, P.papi, P.viaVersion, P.tab, P.decentHolo, P.protocolLib, P.bedWars, P.multiverse],
    serverProperties: { difficulty: 'easy', pvp: true, 'max-players': 16, 'allow-nether': false, 'allow-end': false },
  },

  // ── 🌌 SkyWars ───────────────────────────────────────────────────────────────
  {
    id: 'skywars',
    name: 'SkyWars',
    nameEN: 'SkyWars',
    emoji: '🌌',
    taglinePT: 'Ilhas no céu, último a sobreviver vence',
    taglineEN: 'Islands in the sky, last to survive wins',
    descPT: '2 arenas prontas incluídas — cada jogador começa em uma ilha no céu com um baú de itens. O objetivo: sobreviver e eliminar todos os outros. O último vence.',
    descEN: '2 built-in arenas included — each player starts on a sky island with a chest of items. The goal: survive and eliminate everyone else. Last one wins.',
    color: 'text-violet-300', border: 'border-violet-500/30', bg: 'bg-violet-500/10', glow: 'shadow-violet-500/15',
    gradient: 'from-violet-500/20 to-transparent',
    players: '2–12', difficultyPT: 'Fácil — 2 arenas incluídas', difficultyEN: 'Easy — 2 arenas included',
    readyToPlay: true,
    featuresPT: ['2 arenas incluídas de fábrica', 'Ilhas únicas por jogador', 'Baús com loot aleatório', 'Sistema de kits', 'Ranking e estatísticas'],
    featuresEN: ['2 built-in arenas', 'Unique island per player', 'Chests with random loot', 'Kit system', 'Ranking and statistics'],
    plugins: [P.spark, P.luckPerms, P.vault, P.papi, P.viaVersion, P.tab, P.decentHolo, P.protocolLib, P.skyWars],
    serverProperties: { difficulty: 'normal', pvp: true, 'max-players': 24, 'allow-nether': false, 'allow-end': false },
  },
]

export type GamePresetId = typeof GAME_PRESETS[number]['id']
