# 🔥 CraftServer

> **Crie, configure e gerencie servidores Minecraft com uma interface bonita — sem complicação.**  
> Create, configure, and manage Minecraft servers with a beautiful UI — no hassle.

<div align="center">

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-brightgreen?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square)
![Language](https://img.shields.io/badge/idioma-PT%20%7C%20EN-orange?style=flat-square)

</div>

---

## ✨ Funcionalidades

| Feature | Descrição |
|---|---|
| ⚡ **Configuração Rápida** | Servidor pronto em segundos — Paper, última versão, plugins ideais, RAM otimizada |
| 🧙 **Wizard manual** | Escolha tipo, versão, plugins e RAM no detalhe |
| 🖥️ **Console real-time** | Logs coloridos, envio de comandos, copiar/limpar com um clique |
| 🔌 **Browser de plugins** | Busca e instala plugins do Modrinth + Hangar simultaneamente |
| 🌐 **playit.gg integrado** | Túnel gratuito para jogar com amigos sem abrir portas no roteador |
| 🔄 **Auto-atualização** | Detecta nova versão do servidor e atualiza com um clique |
| 🌍 **Multilingual** | Interface em Português 🇧🇷 e Inglês 🇺🇸 |
| 🍎 **Cross-platform** | macOS (Apple Silicon + Intel) e Windows 10/11 |

### Tipos de servidor suportados

- **Paper** — Performance máxima + suporte a todos os plugins Bukkit/Spigot *(recomendado)*
- **Purpur** — Fork do Paper com centenas de configurações extras
- **Vanilla** — Servidor oficial da Mojang, sem mods
- **Fabric** — Para mods técnicos e datapacks
- **Bedrock (PowerNukkit)** — Suporte a mobile (iOS/Android), console, Windows 10/11
- **Hybrid (Java + Bedrock)** — Permite Java e Bedrock no mesmo servidor via Geyser

---

## 🚀 Download

> Baixe o instalador para seu sistema na página de [Releases](../../releases).

| Sistema | Arquivo |
|---|---|
| macOS (Apple Silicon / Intel) | `CraftServer-*.pkg` |
| Windows 10/11 | `CraftServer-Setup-*.exe` |

### Pré-requisitos

- **Java 25** (Adoptium Temurin) — [Baixar aqui](https://adoptium.net/temurin/releases/?version=25)  
  O app detecta automaticamente e guia a instalação se o Java não estiver presente.

---

## 🛠️ Desenvolvimento

### Requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
git clone https://github.com/seuusuario/craftnest.git
cd craftnest
npm install
```

### Dev mode (hot reload)

```bash
npm run electron:dev
```

### Build para produção

```bash
# macOS (PKG)
npm run electron:build:mac

# Windows (NSIS installer)
npm run electron:build:win
```

Os builds são gerados automaticamente via GitHub Actions em cada push para a tag `v*.*.*`.

---

## 📁 Estrutura do projeto

```
craftnest/
├── electron/
│   ├── main.cjs          # Processo principal Electron (IPC, servidor Java, playit)
│   └── preload.cjs       # Bridge segura renderer ↔ main
├── src/
│   ├── i18n/             # Sistema de tradução PT/EN
│   ├── components/
│   │   ├── layout/       # TopBar (drag, nav, win controls)
│   │   ├── dashboard/    # Lista de servidores
│   │   ├── create/       # Wizard de criação (Quick + Manual)
│   │   ├── server/       # Console, Config, Whitelist
│   │   ├── plugins/      # Browser Modrinth + Hangar
│   │   └── settings/     # Configurações + idioma
│   ├── data/
│   │   └── presetPlugins.ts  # Plugins pré-configurados
│   └── store/
│       └── serverStore.ts    # Estado global (Zustand)
└── .github/workflows/
    └── release.yml       # CI/CD — Mac + Windows
```

---

## 🎮 Como usar

### 1. Criar um servidor — Configuração Rápida

1. Clique em **"Novo servidor"** no dashboard
2. Escolha **"⚡ Configuração Rápida"**
3. Digite o nome do servidor
4. Clique em **"Criar Agora"** — pronto!

O app escolhe automaticamente: Paper, última versão disponível, plugins essenciais (EssentialsX, LuckPerms, Vault, WorldEdit) e RAM ideal para seu PC.

### 2. Criar um servidor — Manual

1. Clique em **"Novo servidor"** → **"⚙️ Configurar Manualmente"**
2. Selecione o tipo (Paper, Vanilla, Fabric…)
3. Escolha a versão
4. Configure nome, porta e RAM
5. Ative os plugins desejados
6. Configure o playit.gg se quiser jogar online sem abrir portas

### 3. Jogar online com amigos (playit.gg)

- Durante a criação, aceite a instalação do playit.gg
- No painel do servidor, clique no botão **"playit.gg"** → aguarde a conexão
- Copie o endereço gerado e passe para os amigos

### 4. Instalar plugins extras

- Clique em **Plugins** na nav ou no botão de plugins do servidor
- Busque pelo nome — resultados chegam do Modrinth e Hangar
- Clique em **Instalar** — o `.jar` vai direto para a pasta `plugins/`

---

## 🔧 Stack técnica

| Camada | Tecnologia |
|---|---|
| UI | React 19 + TypeScript + TailwindCSS + Framer Motion |
| Desktop | Electron 33 |
| Estado | Zustand |
| Ícones | Lucide React |
| Build | electron-builder (PKG + NSIS) |
| CI/CD | GitHub Actions |

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Commit: `git commit -m "feat: adiciona minha feature"`
4. Push: `git push origin feat/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

MIT © 2025 — Feito com ☕ e muito amor por Minecraft.
