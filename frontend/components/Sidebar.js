import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * Sidebar - Main navigation menu
 */
export default function Sidebar() {
  const router = useRouter()

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Tasks', path: '/tasks', icon: '✓' },
    { label: 'Goals', path: '/goals', icon: '🎯' },
    { label: 'Habits', path: '/habits', icon: '⚡' },
    { label: 'Progress', path: '/progress', icon: '📈' },
    { label: 'Insights', path: '/insights', icon: '💡' },
  ]

  const isActive = (path) => router.pathname === path

  return (
    <nav aria-label="Primary navigation" data-desktop-sidebar="true" style={styles.sidebar}>
      <div style={styles.sidebarContent}>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            style={isActive(item.path) ? styles.navItemActive : styles.navItem}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label}</span>
          </Link>
        ))}
      </div>

      <div style={styles.sidebarFooter}>
        <button
          onClick={() => {
            window.localStorage.removeItem('tf_token')
            window.localStorage.removeItem('tf_user')
            router.push('/auth')
          }}
          style={styles.logoutButton}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

const styles = {
  sidebar: {
    width: '240px',
    height: '100vh',
    background: '#0F172A',
    color: '#E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    padding: '20px 0',
    borderRight: '1px solid rgba(148, 163, 184, 0.1)',
  },
  sidebarContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '0 12px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    color: '#94A3B8',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    border: 'none',
    background: 'transparent',
    ':hover': {
      background: 'rgba(148, 163, 184, 0.1)',
      color: '#E2E8F0',
    },
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    color: '#E2E8F0',
    fontSize: '0.9rem',
    fontWeight: 600,
    background: 'rgba(15, 118, 110, 0.2)',
    border: '1px solid rgba(15, 118, 110, 0.4)',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  navIcon: {
    fontSize: '1.1rem',
    width: '20px',
    textAlign: 'center',
  },
  navLabel: {
    flex: 1,
  },
  sidebarFooter: {
    padding: '12px',
    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
  },
  logoutButton: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    background: 'transparent',
    color: '#94A3B8',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}
