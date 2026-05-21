import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TopBar from './components/layout/TopBar'
import Dashboard from './components/dashboard/Dashboard'
import CreateServerWizard from './components/create/CreateServerWizard'
import ServerDetail from './components/server/ServerDetail'
import PluginBrowser from './components/plugins/PluginBrowser'
import Settings from './components/settings/Settings'
import DependencyGate from './components/DependencyGate'
import FirstLaunchLang from './components/FirstLaunchLang'
import Landing from './components/Landing'
import { useServerStore } from './store/serverStore'
import { useIsLangSet, setLang } from './i18n'
import { DEMO_SERVERS } from './demo'
import { isElectron } from './utils/env'

export type Page = 'dashboard' | 'create' | 'server' | 'plugins' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  // Incremented every time we navigate TO 'create' so AnimatePresence always
  // gets a brand-new key → the wizard fully unmounts and resets its state.
  // Without this, AnimatePresence can reuse the exiting component instance
  // if the user navigates back before the 150 ms exit animation completes.
  const [createEpoch, setCreateEpoch] = useState(0)
  const { setServers, setRunning, selectedId, setSelected } = useServerStore()
  const langSet = useIsLangSet()
  const [inDemo, setInDemo] = useState(false)

  useEffect(() => {
    if (isElectron) {
      window.electron.getServers().then(setServers)
      window.electron.getRunningServers().then(setRunning)
    }
  }, [])

  // Show landing page in web mode until user clicks "Testar Demo"
  if (!isElectron && !inDemo) {
    const onEnterDemo = () => {
      // Block demo on mobile — UI isn't built for touch
      const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
        window.matchMedia('(pointer: coarse) and (max-width: 900px)').matches
      if (isMobile) return
      if (!localStorage.getItem('craftserver_lang')) setLang('pt')
      setServers(DEMO_SERVERS)
      setRunning(['demo-1'])
      setSelected('demo-1')
      setInDemo(true)
    }
    return <Landing onEnterDemo={onEnterDemo} />
  }

  const navigate = (p: Page) => {
    // In demo mode, block create page — demo servers are read-only
    if (!isElectron && p === 'create') return
    if (p === 'plugins') {
      useServerStore.getState().setActiveTab('plugins')
      setPage('server')
    } else {
      if (p === 'create') setCreateEpoch(e => e + 1) // force fresh wizard mount every time
      setPage(p)
    }
  }
  const handleQuickSetup = () => navigate('create')

  // Show language selection on first launch (before anything else)
  if (!langSet) {
    return <FirstLaunchLang onDone={() => {}} />
  }

  return (
    <DependencyGate>
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-900">
      {/* Demo mode banner */}
      {!isElectron && (
        <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-brand-500/10 border-b border-brand-500/20 text-[11px] text-brand-300 shrink-0">
          <span className="font-semibold">Modo demo</span>
          <span className="text-brand-500/60">·</span>
          <span className="text-brand-400/70">Explore a interface do CraftServer</span>
          <a
            href="https://github.com/spxmiguel/CraftServer/releases/latest"
            target="_blank" rel="noreferrer"
            className="ml-2 px-2.5 py-0.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg font-bold transition-colors text-[10px]"
          >
            Baixar app
          </a>
        </div>
      )}
      <TopBar page={page} navigate={navigate} />

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence>
          {page === 'dashboard' && (
            <PageWrap key="dashboard">
              <Dashboard navigate={navigate} onQuickSetup={handleQuickSetup} />
            </PageWrap>
          )}
          {page === 'create' && (
            <PageWrap key={`create-${createEpoch}`}>
              <CreateServerWizard navigate={navigate} />
            </PageWrap>
          )}
          {page === 'server' && selectedId && (
            <PageWrap key="server">
              <ServerDetail navigate={navigate} />
            </PageWrap>
          )}
          {page === 'plugins' && selectedId && (
            <PageWrap key="plugins">
              <PluginBrowser />
            </PageWrap>
          )}
          {page === 'settings' && (
            <PageWrap key="settings">
              <Settings />
            </PageWrap>
          )}
        </AnimatePresence>
      </main>
    </div>
    </DependencyGate>
  )
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 overflow-auto"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )
}
