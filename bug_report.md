# CraftServer QA Report - v0.2.3

Date: 2026-05-20

## Fixed Bugs

| Severity | Bug | Reproduction | Impact | Fix | Retest |
| --- | --- | --- | --- | --- | --- |
| Critical | Packaged app could ship with a broken `electron/main.cjs` syntax state. | Install the previous v0.2.3 PKG and launch the app. | App crashed before opening. | Rebuilt v0.2.3 from a syntax-checked source tree and verified the packaged `app.asar` `main.cjs` with `node --check`. | Passed. |
| High | TypeScript state store declared RAM actions but did not implement them. | Run `npx tsc --noEmit`. | Build pipeline could miss state contract bugs. | Implemented `setCustomRam` and `setMaxRam`. | Passed. |
| High | Quick preset creation referenced `seen` without declaring it. | Run `npx tsc --noEmit` or create a quick mode. | Preset creation could crash while de-duplicating plugins. | Added a local `Set` before filtering plugins. | Passed. |
| High | Server creation selected the Plugins tab after finishing. | Create a server through manual or quick setup. | User lands away from the expected console flow. | Creation now selects the Console tab. | Passed by code and typecheck. |
| Medium | User could not create another server cleanly from the finished wizard state. | Create one server, then try another. | Flow forced navigation and made repeated setup clumsy. | Added "Abrir console" and "Criar outro" actions on success. | Passed by build. |
| Medium | Installed plugins from disk were not reflected in search results. | Install a plugin, leave/reopen plugin browser, search it again. | Button still said "Instalar". | Search results now compare installed JAR filenames against slug/title/project aliases. | Passed by typecheck. |
| Medium | Plugin install failures were silent in the UI. | Disconnect network or install a bad project. | User sees no clear failure reason. | Added inline error state in PluginBrowser. | Passed by typecheck. |
| Medium | RAM editing was missing from server settings. | Open Server > Settings. | User could not change server memory after creation. | Added dynamic RAM UI, presets, clamping, warnings, and persistence through IPC. | Passed by typecheck and build. |
| Medium | Logs existed in main process but had no server UI surface. | Trigger errors and try to view them. | User had to report errors manually. | Added persistent ErrorLogViewer and Logs tab. | Passed by typecheck and build. |

## Quick Mode Validation

All quick modes force `offlineMode: true` and include AuthMe + SkinsRestorer during creation.

| Mode | Plugin intent | Offline/auth |
| --- | --- | --- |
| Survival | Spark, EssentialsX, EssentialsX Chat, LuckPerms, Vault, PlaceholderAPI, ViaVersion, TAB, GriefPrevention, CoreProtect, Chairs | AuthMe + SkinsRestorer |
| Hardcore | Spark, EssentialsX, EssentialsX Chat, LuckPerms, Vault, PlaceholderAPI, ViaVersion, TAB, CoreProtect | AuthMe + SkinsRestorer |
| Skyblock | Spark, LuckPerms, Vault, PlaceholderAPI, ViaVersion, TAB, DecentHolograms, BentoBox, BSkyBlock, Level, Challenges, Warps, EssentialsX | AuthMe + SkinsRestorer |
| OneBlock | Spark, LuckPerms, Vault, PlaceholderAPI, ViaVersion, TAB, DecentHolograms, BentoBox, AOneBlock, Level, Challenges, EssentialsX | AuthMe + SkinsRestorer |
| Ilha Economia | Skyblock base plus Bank, mcMMO, Jobs Reborn | AuthMe + SkinsRestorer |
| KitPvP | Spark, LuckPerms, Vault, PlaceholderAPI, ViaVersion, TAB, DecentHolograms, EssentialsX, EssentialsX Chat, CombatLogX, ProtocolLib | AuthMe + SkinsRestorer |
| BedWars | Spark, LuckPerms, Vault, PlaceholderAPI, ViaVersion, TAB, DecentHolograms, ProtocolLib, BedWars1058, Multiverse-Core | AuthMe + SkinsRestorer |
| SkyWars | Spark, LuckPerms, Vault, PlaceholderAPI, ViaVersion, TAB, DecentHolograms, ProtocolLib, SkyWars | AuthMe + SkinsRestorer |

## Verification Run

- `node --check electron/main.cjs`
- `node --check electron/preload.cjs`
- `npx tsc --noEmit`
- `npm run build:mac`
- `npm run build:win`
- Extracted `release/mac-arm64/CraftServer.app/Contents/Resources/app.asar` and verified packaged `electron/main.cjs` with `node --check`.
- Parsed quick preset definitions: 8 presets, 31 plugin URL declarations, 0 malformed HTTPS URLs.

## Known Limits

- The local browser interaction runner timed out during an aggressive spam-click pass, so that result was not used as a pass signal.
- Installers are unsigned. macOS and Windows may show standard unsigned-app warnings.
