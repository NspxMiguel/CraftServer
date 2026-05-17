// ── CraftServer i18n ─────────────────────────────────────────────────────────
// Supported languages: 'pt' (Português) | 'en' (English)
import { useState, useEffect } from 'react'

export type Lang = 'pt' | 'en'

export interface T {
  // common
  appName: string; save: string; saved: string; cancel: string; close: string
  back: string; next: string; create: string; install: string; delete: string
  confirm: string; loading: string; error: string; copied: string; copyAll: string
  clear: string; search: string; online: string; offline: string
  // nav
  nav_servers: string; nav_create: string; nav_plugins: string; nav_settings: string
  minimize: string; maximize: string; restore: string
  // dashboard
  myServers: string; noServers: string; serversCount_one: string; serversCount_many: string
  newServer: string; quickSetup: string; noServersYet: string; noServersDesc: string; firstServer: string
  // mode choice
  chooseMode: string; chooseModeDesc: string; quickSetupTitle: string
  quickSetupDesc: string; manualSetup: string; manualSetupDesc: string
  // create wizard
  createServer: string; configManual: string; serverType: string; serverVersion: string
  serverName: string; serverNamePlaceholder: string; serverPort: string; serverRam: string
  plugins: string; recommended: string; mostPopular: string; creating: string
  quickName: string; quickCreateBtn: string; quickDesc: string; quickBullets: string
  // playit modal
  playitTitle: string; playitDesc: string; playitInstall: string; playitSkip: string; playitManual: string
  // server detail
  start: string; stop: string; console: string; settings: string; whitelist: string
  serverStarting: string; serverStopped: string; sendingStop: string
  updating: string; updateTo: string; javaError: string; javaError2: string; javaError3: string
  playitConnecting: string; playitConnected: string; playitDisconnect: string; playitConnect: string
  consoleLines: string; noLogs: string; folder: string; pluginsBtn: string
  // plugin browser
  searchPlugins: string; installPlugin: string; installed: string; installing: string
  noPluginsFound: string; searchHint: string
  // settings
  settingsTitle: string; javaSection: string; javaPathLabel: string; javaPathPlaceholder: string
  javaInfo: string; downloadJava: string; aboutSection: string; aboutDesc: string
  madeWithCoffee: string; languageSection: string; languageLabel: string
  // dependency gate
  checkingDeps: string; missingDeps: string; missingDepsDesc: string
  javaRequired: string; javaRequiredDesc: string; javaNotFound: string
  javaOld: string; javaTooOld: string; javaInstallBtn: string; javaInstalled: string
  recheckBtn: string; recheckNote: string; rechecking: string
  // first launch
  firstLaunchTitle: string; firstLaunchDesc: string; firstLaunchContinue: string
  langPT: string; langEN: string
}

const pt: T = {
  appName: 'CraftServer',
  save: 'Salvar', saved: 'Salvo!', cancel: 'Cancelar', close: 'Fechar',
  back: 'Voltar', next: 'Próximo', create: 'Criar', install: 'Instalar',
  delete: 'Deletar', confirm: 'Confirmar', loading: 'Carregando...',
  error: 'Erro', copied: 'Copiado!', copyAll: 'Copiar tudo', clear: 'Limpar',
  search: 'Buscar...', online: 'online', offline: 'offline',

  nav_servers: 'Servidores', nav_create: 'Criar', nav_plugins: 'Plugins',
  nav_settings: 'Configurações', minimize: 'Minimizar', maximize: 'Maximizar', restore: 'Restaurar',

  myServers: 'Meus Servidores', noServers: 'Nenhum servidor criado ainda',
  serversCount_one: 'servidor', serversCount_many: 'servidores',
  newServer: 'Novo servidor', quickSetup: 'Configuração Rápida',
  noServersYet: 'Nenhum servidor ainda',
  noServersDesc: 'Crie um servidor Java, Bedrock ou híbrido e comece a jogar em minutos',
  firstServer: 'Criar meu primeiro servidor',

  chooseMode: 'Como deseja criar?',
  chooseModeDesc: 'Selecione o modo de criação do seu servidor',
  quickSetupTitle: '⚡ Configuração Rápida',
  quickSetupDesc: 'A gente configura tudo automaticamente — Paper, última versão, plugins recomendados e RAM ideal. Só diga o nome!',
  manualSetup: '⚙️ Configurar Manualmente',
  manualSetupDesc: 'Escolha o tipo de servidor, versão, plugins e RAM no detalhe.',

  createServer: 'Criar Servidor', configManual: 'Configurar Manualmente',
  serverType: 'Tipo de Servidor', serverVersion: 'Versão',
  serverName: 'Nome do Servidor', serverNamePlaceholder: 'Meu Servidor',
  serverPort: 'Porta', serverRam: 'Memória RAM', plugins: 'Plugins',
  recommended: 'Recomendado', mostPopular: 'Mais popular',
  creating: 'Criando servidor...', quickName: 'Nome do servidor',
  quickCreateBtn: 'Criar Agora →',
  quickDesc: 'A gente configura tudo — só diz o nome!',
  quickBullets: 'Paper (mais popular)',

  playitTitle: 'Jogar com amigos online?',
  playitDesc: 'O playit.gg cria um túnel grátis para o seu servidor — seus amigos se conectam sem você precisar abrir portas no roteador.',
  playitInstall: 'Instalar playit.gg (grátis)',
  playitSkip: 'Não, usarei outro método',
  playitManual: 'Como abrir a porta manualmente',

  start: 'Iniciar', stop: 'Parar', console: 'Console', settings: 'Config', whitelist: 'Whitelist',
  serverStarting: '── Iniciando servidor... ──',
  serverStopped: '── Servidor parado ──',
  sendingStop: '── Enviando stop... ──',
  updating: 'Atualizando', updateTo: '→',
  javaError: 'Java não encontrado — instale',
  javaError2: 'Java 25 (Adoptium)',
  javaError3: 'e clique em verificar novamente na tela inicial',
  playitConnecting: 'Conectando...', playitConnected: 'Conectado',
  playitDisconnect: 'Desconectar', playitConnect: 'Túnel playit.gg',
  consoleLines: 'linhas', noLogs: 'Sem logs ainda — inicie o servidor',
  folder: 'Pasta', pluginsBtn: 'Plugins',

  searchPlugins: 'Buscar plugins...', installPlugin: 'Instalar',
  installed: 'Instalado', installing: 'Instalando...',
  noPluginsFound: 'Nenhum plugin encontrado',
  searchHint: 'Busque plugins acima para começar',

  settingsTitle: 'Configurações', javaSection: 'Java',
  javaPathLabel: 'Caminho do executável Java (deixe vazio para auto-detectar)',
  javaPathPlaceholder: '/usr/bin/java',
  javaInfo: 'Java 25 recomendado (Minecraft 26.x+). Java 21 para versões antigas.',
  downloadJava: 'Baixar Java 25 (Adoptium)',
  aboutSection: 'Sobre', aboutDesc: 'Minecraft Server Manager para Mac e Windows',
  madeWithCoffee: 'Feito com muito café',
  languageSection: 'Idioma', languageLabel: 'Selecione o idioma da interface',

  checkingDeps: 'Verificando dependências...',
  missingDeps: 'Dependências necessárias',
  missingDepsDesc: 'Instale os itens abaixo para usar o CraftServer',
  javaRequired: 'Java 25',
  javaRequiredDesc: 'Necessário para executar servidores Minecraft. Minecraft 26.x+ requer Java 25.',
  javaNotFound: 'Java não encontrado no sistema',
  javaOld: 'Versão instalada', javaTooOld: '(muito antiga)',
  javaInstallBtn: 'Clique aqui para instalar o Java 25',
  javaInstalled: 'Instalado e pronto',
  recheckBtn: 'Já instalei o Java — verificar agora',
  recheckNote: 'Instale e clique no botão acima — não precisa reiniciar o app',
  rechecking: 'Verificando...',

  firstLaunchTitle: 'Bem-vindo ao CraftServer!',
  firstLaunchDesc: 'Escolha o idioma da interface:',
  firstLaunchContinue: 'Continuar',
  langPT: '🇧🇷 Português', langEN: '🇺🇸 English',
}

const en: T = {
  appName: 'CraftServer',
  save: 'Save', saved: 'Saved!', cancel: 'Cancel', close: 'Close',
  back: 'Back', next: 'Next', create: 'Create', install: 'Install',
  delete: 'Delete', confirm: 'Confirm', loading: 'Loading...',
  error: 'Error', copied: 'Copied!', copyAll: 'Copy all', clear: 'Clear',
  search: 'Search...', online: 'online', offline: 'offline',

  nav_servers: 'Servers', nav_create: 'Create', nav_plugins: 'Plugins',
  nav_settings: 'Settings', minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore',

  myServers: 'My Servers', noServers: 'No servers created yet',
  serversCount_one: 'server', serversCount_many: 'servers',
  newServer: 'New server', quickSetup: 'Quick Setup',
  noServersYet: 'No servers yet',
  noServersDesc: 'Create a Java, Bedrock, or hybrid server and start playing in minutes',
  firstServer: 'Create my first server',

  chooseMode: 'How do you want to create?',
  chooseModeDesc: 'Select your server creation mode',
  quickSetupTitle: '⚡ Quick Setup',
  quickSetupDesc: 'We configure everything automatically — Paper, latest version, recommended plugins, and ideal RAM. Just enter the name!',
  manualSetup: '⚙️ Configure Manually',
  manualSetupDesc: 'Choose server type, version, plugins, and RAM in detail.',

  createServer: 'Create Server', configManual: 'Configure Manually',
  serverType: 'Server Type', serverVersion: 'Version',
  serverName: 'Server Name', serverNamePlaceholder: 'My Server',
  serverPort: 'Port', serverRam: 'RAM Memory', plugins: 'Plugins',
  recommended: 'Recommended', mostPopular: 'Most popular',
  creating: 'Creating server...', quickName: 'Server name',
  quickCreateBtn: 'Create Now →',
  quickDesc: "We set everything up — just name it!",
  quickBullets: 'Paper (most popular)',

  playitTitle: 'Play with friends online?',
  playitDesc: 'playit.gg creates a free tunnel for your server — friends connect without you needing to open router ports.',
  playitInstall: 'Install playit.gg (free)',
  playitSkip: "No, I'll use another method",
  playitManual: 'How to open port manually',

  start: 'Start', stop: 'Stop', console: 'Console', settings: 'Config', whitelist: 'Whitelist',
  serverStarting: '── Starting server... ──',
  serverStopped: '── Server stopped ──',
  sendingStop: '── Sending stop... ──',
  updating: 'Updating', updateTo: '→',
  javaError: 'Java not found — install',
  javaError2: 'Java 25 (Adoptium)',
  javaError3: 'and click verify on the startup screen',
  playitConnecting: 'Connecting...', playitConnected: 'Connected',
  playitDisconnect: 'Disconnect', playitConnect: 'playit.gg tunnel',
  consoleLines: 'lines', noLogs: 'No logs yet — start the server',
  folder: 'Folder', pluginsBtn: 'Plugins',

  searchPlugins: 'Search plugins...', installPlugin: 'Install',
  installed: 'Installed', installing: 'Installing...',
  noPluginsFound: 'No plugins found',
  searchHint: 'Search plugins above to get started',

  settingsTitle: 'Settings', javaSection: 'Java',
  javaPathLabel: 'Java executable path (leave empty for auto-detect)',
  javaPathPlaceholder: '/usr/bin/java',
  javaInfo: 'Java 25 recommended (Minecraft 26.x+). Java 21 for older versions.',
  downloadJava: 'Download Java 25 (Adoptium)',
  aboutSection: 'About', aboutDesc: 'Minecraft Server Manager for Mac and Windows',
  madeWithCoffee: 'Made with lots of coffee',
  languageSection: 'Language', languageLabel: 'Select the interface language',

  checkingDeps: 'Checking dependencies...',
  missingDeps: 'Required dependencies',
  missingDepsDesc: 'Install the items below to use CraftServer',
  javaRequired: 'Java 25',
  javaRequiredDesc: 'Required to run Minecraft servers. Minecraft 26.x+ requires Java 25.',
  javaNotFound: 'Java not found on this system',
  javaOld: 'Installed version', javaTooOld: '(too old)',
  javaInstallBtn: 'Click here to install Java 25',
  javaInstalled: 'Installed and ready',
  recheckBtn: 'I installed Java — check now',
  recheckNote: 'Install and click the button above — no need to restart the app',
  rechecking: 'Checking...',

  firstLaunchTitle: 'Welcome to CraftServer!',
  firstLaunchDesc: 'Choose your interface language:',
  firstLaunchContinue: 'Continue',
  langPT: '🇧🇷 Português', langEN: '🇺🇸 English',
}

// ── Reactive language store ───────────────────────────────────────────────────
const LANG_KEY = 'craftserver_lang'
const listeners = new Set<() => void>()

let _current: Lang = (() => {
  try { return (localStorage.getItem(LANG_KEY) as Lang) || 'pt' } catch { return 'pt' }
})()

export function getLang(): Lang { return _current }

export function isLangSet(): boolean {
  try { return !!localStorage.getItem(LANG_KEY) } catch { return false }
}

export function setLang(lang: Lang) {
  _current = lang
  try { localStorage.setItem(LANG_KEY, lang) } catch {}
  listeners.forEach(fn => fn())
}

export function onLangChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useT(): T {
  const [lang, setLangState] = useState<Lang>(getLang())
  useEffect(() => { return onLangChange(() => setLangState(getLang())) }, [])
  return lang === 'en' ? en : pt
}

export function useIsLangSet(): boolean {
  const [set, setSet] = useState(isLangSet())
  useEffect(() => { return onLangChange(() => setSet(isLangSet())) }, [])
  return set
}

export { pt, en }
