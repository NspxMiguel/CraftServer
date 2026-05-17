import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './components/dashboard/Dashboard'
import CreateServerWizard from './components/create/CreateServerWizard'
import ServerDetail from './components/server/ServerDetail'
import PluginBrowser from './components/plugins/PluginBrowser'
import Settings from './components/settings/Settings'
import { useServerStore } from './store/serverStore'

export type Page = 'dashboard' | 'create' | 'server' | 'plugins' | 'settings'

const isElectron = typeof window !== 'undefined' && !!window.electron

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const { setServers, setRunning, selectedId } = useServerStore()

  useEffect(() => {
    if (!isElectron) return
    window.electron.getServers().then(setServers)
    window.electron.getRunningServers().then(setRunning)
  }, [])

  const navigate = (p: Page) => setPage(p)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-900">
      <Sidebar page={page} navigate={navigate} />

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {page === 'dashboard' && (
            <PageWrap key="dashboard">
              <Dashboard navigate={navigate} />
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
  )
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 overflow-auto"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </motion.div>
  )
}
