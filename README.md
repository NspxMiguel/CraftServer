# 🌿 CraftServer

> Crie, configure e gerencie servidores Minecraft com uma interface bonita — sem complicação.

![CraftNest](https://img.shields.io/badge/platform-mac%20%7C%20windows-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

---

## ✨ Funcionalidades

- **Wizard de criação** — Escolha tipo (Paper, Purpur, Vanilla, Fabric), versão e configurações em 4 passos
- **Plugins pré-configurados** — EssentialsX, LuckPerms, Vault e mais, ativáveis com um clique
- **Console real-time** — Veja os logs e envie comandos diretamente da UI
- **Browser de plugins** — Busque e instale qualquer plugin do Modrinth sem sair do app
- **Auto-atualização** — O app detecta novas versões do servidor e atualiza com um clique
- **playit.gg integrado** — Tunnel gratuito para jogar com amigos sem abrir portas no roteador
- **Cross-platform** — Funciona em macOS e Windows

## 🚀 Instalação

### Pré-requisitos

- [Java 17+](https://adoptium.net) — necessário para rodar o servidor Minecraft
- Node.js 18+

### Dev

```bash
git clone https://github.com/SEU_USUARIO/craftnest.git
cd craftnest
npm install
npm run dev
```

### Build

```bash
# macOS
npm run build:mac

# Windows
npm run build:win
```

## 🧩 Tipos de servidor suportados

| Tipo    | Descrição                              |
|---------|----------------------------------------|
| Paper   | Alta performance, suporte a plugins    |
| Purpur  | Fork do Paper com mais configurações   |
| Vanilla | Servidor oficial da Mojang             |
| Fabric  | Ideal para mods técnicos               |

## 🔌 Plugins pré-bundled

- **EssentialsX** — Comandos essenciais
- **LuckPerms** — Sistema de permissões
- **Vault** — API de economia
- **WorldEdit** — Editor de mundo
- **WorldGuard** — Proteção de regiões
- **PlaceholderAPI** — Placeholders dinâmicos

## ☁️ playit.gg

O CraftNest inclui integração nativa com [playit.gg](https://playit.gg), permitindo que seus amigos se conectem ao seu servidor sem precisar configurar port forwarding no roteador. Basta ligar o tunnel na tela do servidor.

## 📁 Onde ficam os arquivos

Os servidores são criados em `~/CraftNest/servers/<id>/`.

## 📄 Licença

MIT
