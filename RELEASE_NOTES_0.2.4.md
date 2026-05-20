# CraftServer v0.2.4

## What's New

- Added per-server Backups tab.
- Added one-click ZIP backups for complete server folders.
- Added backup destination settings.
- Added local Google Drive folder detection with a one-click "Use Drive" path.
- Backup creation is blocked while the server is running to avoid world corruption.
- Added backup list with size, date, and reveal-in-folder action.

## Polish

- Global Settings now shows the current app version.
- Backup paths can be configured from both global Settings and the server Backups tab.
- Release builds now include the backup engine dependency.

## QA

- `npx tsc --noEmit`
- `node --check electron/main.cjs`
- `node --check electron/preload.cjs`
- `npm run build:mac`
- `npm run build:win`
- Extracted packaged macOS `app.asar` and verified version `0.2.4`.

## Known Limits

- Google Drive support uses the local synced Drive folder. It does not yet use Google OAuth/API upload.
- Installers are still unsigned, so macOS/Windows can show standard unsigned-app warnings.
