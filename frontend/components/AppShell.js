import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ProtectedRoute from './ProtectedRoute'
import BottomNav from './BottomNav'

/**
 * AppShell - Main layout wrapper for authenticated pages
 * Combines Sidebar, Topbar, and page content
 */
export default function AppShell({ children, title = 'Dashboard' }) {
  return (
    <ProtectedRoute>
      <div style={styles.container}>
        <a href="#main-content" style={styles.skipLink}>Skip to content</a>
        <Sidebar />
        <div className="app-main-content" style={styles.mainContent}>
          <Topbar title={title} />
          <main id="main-content" tabIndex="-1" style={styles.pageContent}>
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </ProtectedRoute>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
  mainContent: {
    flex: 1,
    marginLeft: '240px',
    display: 'flex',
    flexDirection: 'column',
  },
  pageContent: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
    color: '#0F172A',
  },
  skipLink: {
    position: 'absolute',
    left: '-9999px',
  },
}
