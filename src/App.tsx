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
import { useServerStore } from './store/serverStore'
import { useIsLangSet } from './i18n'
import { DEMO_SERVERS } from './demo'

export type Page = 'dashboard' | 'create' | 'server' | 'plugins' | 'settings'

export const isElectron = typeof window !== 'undefined' && !!window.electron

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const { setServers, setRunning, selectedId, setSelected } = useServerStore()
  const langSet = useIsLangSet()

  useEffect(() => {
    if (isElectron) {
      window.electron.getServers().then(setServers)
      window.electron.getRunningServers().then(setRunning)
    } else {
      // Demo mode — show realistic fake data when running as web preview
      setServers(DEMO_SERVERS)
      setRunning(['demo-1'])
      setSelected('demo-1')
    }
  }, [])

  const navigate = (p: Page) => {
    if (p === 'plugins') {
      useServerStore.getState().setActiveTab('plugins')
      setPage('server')
    } else {
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
      <TopBar page={page} navigate={navigate} />

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence>
          {page === 'dashboard' && (
            <PageWrap key="dashboard">
              <Dashboard navigate={navigate} onQuickSetup={handleQuickSetup} />
            </PageWrap>
          )}
          {page === 'create' && (
            <PageWrap key="create">
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
