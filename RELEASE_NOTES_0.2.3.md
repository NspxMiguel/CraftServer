# CraftServer v0.2.3

## What's New

- Added RAM management in Server Settings with dynamic system detection, presets, manual MB input, slider, safe clamping, and high-allocation warnings.
- Added persistent application logs and a new Logs tab for inspecting recent errors without needing manual screenshots.
- Improved server creation flow with Console as the post-create destination and actions to open the server or create another one.
- Improved Plugin Browser feedback: installed JARs are detected from disk and failed installs now show an inline error.
- Hardened release workflow with TypeScript checks before macOS and Windows packaging.

## Stability Fixes

- Fixed a TypeScript error in quick preset creation caused by an undeclared plugin de-duplication set.
- Fixed missing RAM actions in the Zustand server store.
- Rebuilt the packaged app from syntax-checked Electron sources to avoid the previous `Unexpected token '}'` launch crash.

## Installers

- macOS ARM64: `CraftServer-0.2.3-arm64.pkg`
- Windows x64: `CraftServer Setup 0.2.3.exe`

## QA

- Electron main/preload syntax checks passed.
- TypeScript passed with `npx tsc --noEmit`.
- macOS PKG and Windows EXE builds completed locally.
- Packaged macOS `app.asar` was extracted and syntax-checked.
- Quick preset definitions were scanned for malformed plugin URLs.
