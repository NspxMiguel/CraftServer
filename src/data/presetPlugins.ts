import type { PresetPlugin } from '../types'

// Modrinth direct download links for latest stable versions
export const PRESET_PLUGINS: PresetPlugin[] = [
  {
    name: 'EssentialsX',
    description: 'Comandos essenciais para qualquer servidor (home, warp, kit, etc.)',
    url: 'https://github.com/EssentialsX/Essentials/releases/latest/download/EssentialsX.jar',
    filename: 'EssentialsX.jar',
    enabled: true,
  },
  {
    name: 'LuckPerms',
    description: 'Sistema de permissões avançado com GUI web',
    url: 'https://download.luckperms.net/1551/bukkit/loader/LuckPerms-Bukkit-5.4.141.jar',
    filename: 'LuckPerms-Bukkit.jar',
    enabled: true,
  },
  {
    name: 'WorldEdit',
    description: 'Editor de mundo in-game com seleções, operações em bloco e muito mais',
    url: 'https://dev.bukkit.org/projects/worldedit/files/latest',
    filename: 'worldedit-bukkit.jar',
    enabled: false,
  },
  {
    name: 'WorldGuard',
    description: 'Proteção de regiões, controle de acesso e regras por área',
    url: 'https://dev.bukkit.org/projects/worldguard/files/latest',
    filename: 'WorldGuard.jar',
    enabled: false,
  },
  {
    name: 'Vault',
    description: 'API de economia e permissões — necessária para outros plugins',
    url: 'https://github.com/milkbowl/Vault/releases/latest/download/Vault.jar',
    filename: 'Vault.jar',
    enabled: true,
  },
  {
    name: 'PlaceholderAPI',
    description: 'Suporte a placeholders dinâmicos em outros plugins',
    url: 'https://ci.extendedclip.com/job/PlaceholderAPI/lastSuccessfulBuild/artifact/build/libs/PlaceholderAPI.jar',
    filename: 'PlaceholderAPI.jar',
    enabled: false,
  },
]
