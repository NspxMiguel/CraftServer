# 🔥 CraftServer

<div align="center">

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-brightgreen?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento%20%7C%20in%20development-orange?style=flat-square)
![Language](https://img.shields.io/badge/idioma-PT%20%7C%20EN-blueviolet?style=flat-square)
![AI](https://img.shields.io/badge/built%20with-Claude%20Sonnet-8B5CF6?style=flat-square&logo=anthropic)

**[🇧🇷 Português](#-português) · [🇺🇸🇬🇧 English](#-english)**

</div>

---

## 🇧🇷 Português

> **Crie, configure e gerencie servidores Minecraft com uma interface bonita — sem complicação.**

### ⚠️ Em Desenvolvimento

> **Este projeto está em desenvolvimento ativo.** Podem existir bugs, instabilidades ou recursos incompletos. Sua ajuda é muito bem-vinda!
>
> Encontrou um problema? **[Reporte aqui →](../../issues/new/choose)**
>
> Toda issue relatada ajuda a tornar o CraftServer melhor para todo mundo. Não tenha vergonha — bugs fazem parte do processo!

### ✨ Funcionalidades

| Feature | Descrição |
|---|---|
| 🎮 **Modos de Jogo** | Skyblock, OneBlock, KitPvP, SkyWars, Survival, Hardcore — tudo pré-configurado |
| ⚡ **Configuração Rápida** | Servidor pronto em segundos — Paper, última versão, plugins ideais, RAM otimizada |
| 🧙 **Wizard manual** | Escolha tipo, versão, plugins e RAM no detalhe |
| 🖥️ **Console amigável** | Logs traduzidos para linguagem simples + modo técnico com um clique |
| 🔌 **Browser de plugins** | Busca e instala plugins do Modrinth + Hangar simultaneamente |
| 🌐 **playit.gg integrado** | Túnel gratuito para jogar com amigos sem abrir portas no roteador |
| 🔄 **Auto-atualização** | Detecta nova versão do servidor e atualiza com um clique |
| 🌍 **Multilingual** | Interface em Português 🇧🇷 e Inglês 🇺🇸 |
| 🍎 **Cross-platform** | macOS (Apple Silicon + Intel) e Windows 10/11 |
| 📋 **Logs de diagnóstico** | Histórico completo de tudo que acontece no app, rotacionado automaticamente |

### 🎮 Modos de Jogo pré-configurados

| Modo | Descrição | Pronto para jogar |
|---|---|:---:|
| 🌿 Survival Padrão | Survival clássico com plugins essenciais | ✅ |
| 💀 Hardcore | Morte permanente, dificuldade máxima | ✅ |
| 🏝️ Skyblock | Ilha no vácuo com desafios e ranking | ✅ |
| ⬛ OneBlock | Um bloco infinito, fases de progressão | ✅ |
| 💰 Ilha Economia | Skyblock com loja, empregos e banco | ✅ |
| 🥊 KitPvP | PvP com 4 kits prontos, mundo plano | ✅ |
| 🌌 SkyWars | 2 arenas incluídas, último a sobreviver | ✅ |
| 🛏️ BedWars | Precisa de mapa personalizado | ⚙️ |

### 🚀 Download

> Baixe o instalador na página de [Releases](../../releases).

| Sistema | Arquivo |
|---|---|
| macOS (Apple Silicon / Intel) | `CraftServer-*.pkg` |
| Windows 10/11 | `CraftServer-Setup-*.exe` |

**Pré-requisitos:** Java 21+ (Adoptium Temurin) — [Baixar aqui](https://adoptium.net/temurin/releases/)

### 📋 Onde ficam os logs?

Os logs do app ficam em:

| Sistema | Caminho |
|---|---|
| macOS | `~/Library/Application Support/craftserver/logs/` |
| Windows | `%APPDATA%\craftserver\logs\` |

Arquivos de log são rotacionados automaticamente (1 por dia, últimos 7 dias mantidos). Em caso de bug, inclua o log mais recente ao reportar um issue.

### 🐛 Reportar um Bug

1. Clique em **[Issues → New Issue](../../issues/new/choose)**
2. Escolha o template **"Bug Report"**
3. Descreva o que aconteceu, o que você esperava e passos para reproduzir
4. **Inclua o arquivo de log** — ajuda muito a identificar o problema!

### 🛠️ Desenvolvimento Local

```bash
git clone https://github.com/spxmiguel/CraftServer.git
cd CraftServer
npm install
npm run electron:dev   # hot reload
```

**Build:**
```bash
npm run electron:build:mac   # macOS (.pkg)
npm run electron:build:win   # Windows (.exe)
```

### 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Commit: `git commit -m "feat: descrição"`
4. Push e abra um Pull Request

---

## 🇺🇸🇬🇧 English

> **Create, configure and manage Minecraft servers with a beautiful UI — no hassle.**

### ⚠️ In Development

> **This project is under active development.** Bugs, instabilities or incomplete features may exist. Your help is very welcome!
>
> Found an issue? **[Report it here →](../../issues/new/choose)**
>
> Every bug report helps make CraftServer better for everyone. Don't be shy — bugs are part of the process!

### ✨ Features

| Feature | Description |
|---|---|
| 🎮 **Game Modes** | Skyblock, OneBlock, KitPvP, SkyWars, Survival, Hardcore — all pre-configured |
| ⚡ **Quick Setup** | Server ready in seconds — Paper, latest version, ideal plugins, optimized RAM |
| 🧙 **Manual Wizard** | Choose type, version, plugins and RAM in detail |
| 🖥️ **Friendly Console** | Logs translated to plain language + technical mode with one click |
| 🔌 **Plugin Browser** | Search and install plugins from Modrinth + Hangar simultaneously |
| 🌐 **playit.gg built-in** | Free tunnel to play with friends without port forwarding |
| 🔄 **Auto-update** | Detects new server version and updates with one click |
| 🌍 **Multilingual** | Interface in Portuguese 🇧🇷 and English 🇺🇸 |
| 🍎 **Cross-platform** | macOS (Apple Silicon + Intel) and Windows 10/11 |
| 📋 **Diagnostic logs** | Full history of everything that happens in the app, rotated automatically |

### 🎮 Pre-configured Game Modes

| Mode | Description | Ready to play |
|---|---|:---:|
| 🌿 Standard Survival | Classic survival with essential plugins | ✅ |
| 💀 Hardcore | Permanent death, max difficulty | ✅ |
| 🏝️ Skyblock | Island in the void with challenges and ranking | ✅ |
| ⬛ OneBlock | One infinite block, progression phases | ✅ |
| 💰 Island Economy | Skyblock with pre-configured shop, jobs and bank | ✅ |
| 🥊 KitPvP | PvP with 4 ready-to-use kits, flat world | ✅ |
| 🌌 SkyWars | 2 built-in arenas, last one standing wins | ✅ |
| 🛏️ BedWars | Requires a custom map | ⚙️ |

### 🚀 Download

> Download the installer from the [Releases](../../releases) page.

| System | File |
|---|---|
| macOS (Apple Silicon / Intel) | `CraftServer-*.pkg` |
| Windows 10/11 | `CraftServer-Setup-*.exe` |

**Prerequisites:** Java 21+ (Adoptium Temurin) — [Download here](https://adoptium.net/temurin/releases/)

### 📋 Where are the logs?

App diagnostic logs are stored at:

| System | Path |
|---|---|
| macOS | `~/Library/Application Support/craftserver/logs/` |
| Windows | `%APPDATA%\craftserver\logs\` |

Log files are rotated automatically (one per day, last 7 days kept). When reporting a bug, please include the most recent log file.

### 🐛 Report a Bug

1. Go to **[Issues → New Issue](../../issues/new/choose)**
2. Choose the **"Bug Report"** template
3. Describe what happened, what you expected, and steps to reproduce
4. **Attach the log file** — it really helps track down the issue!

### 🛠️ Local Development

```bash
git clone https://github.com/spxmiguel/CraftServer.git
cd CraftServer
npm install
npm run electron:dev   # hot reload
```

**Build:**
```bash
npm run electron:build:mac   # macOS (.pkg)
npm run electron:build:win   # Windows (.exe)
```

### 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m "feat: description"`
4. Push and open a Pull Request

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript + TailwindCSS + Framer Motion |
| Desktop | Electron 33 |
| State | Zustand |
| Icons | Lucide React |
| Build | electron-builder (PKG + NSIS) |
| CI/CD | GitHub Actions |

---

## 🤖 Built with Claude

This project was developed in collaboration with [Claude](https://claude.ai) (Anthropic's AI). Claude helped design the architecture, write and review the code, fix bugs, and harden security throughout development.

---

<div align="center">

MIT © 2025 — Made with ☕ and lots of love for Minecraft.

**[🇧🇷 PT](#-português) · [🇺🇸🇬🇧 EN](#-english) · [Issues](../../issues) · [Releases](../../releases)**

</div>
