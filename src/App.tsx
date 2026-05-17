import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TopBar from './components/layout/TopBar'
import Dashboard from './components/dashboard/Dashboard'
import CreateServerWizard from './components/create/CreateServerWizard'
import ServerDetail from './components/server/ServerDetail'
import PluginBrowser from './components/plugins/PluginBrowser'
import Settings from './components/settings/Settings'
import DependencyGate from './components/DependencyGate'
import { useServerStore } from './store/serverStore'

export type Page = 'dashboard' | 'create' | 'server' | 'plugins' | 'settings'

const isElectron = typeof window !== 'undefined' && !!window.electron

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [quickSetup, setQuickSetup] = useState(false)
  const { setServers, setRunning, selectedId } = useServerStore()

  useEffect(() => {
    if (!isElectron) return
    window.electron.getServers().then(setServers)
    window.electron.getRunningServers().then(setRunning)
  }, [])

  const navigate = (p: Page) => { setPage(p); if (p !== 'create') setQuickSetup(false) }
  const handleQuickSetup = () => { setQuickSetup(true); setPage('create') }
  const handleCancelQuick = () => setQuickSetup(false)

  return (
    <DependencyGate>
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-900">
      <TopBar page={page} navigate={navigate} />

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {page === 'dashboard' && (
            <PageWrap key="dashboard">
              <Dashboard navigate={navigate} onQuickSetup={handleQuickSetup} />
            </PageWrap>
          )}
          {page === 'create' && (
            <PageWrap key="create">
              <CreateServerWizard navigate={navigate} quickSetup={quickSetup} onCancelQuick={handleCancelQuick} />
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
