import { useEffect, useState } from 'react'
import SearchBox from './SearchBox'

/**
 * Topbar - Top navigation bar with user profile
 */
export default function Topbar({ title = 'Dashboard' }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = typeof window !== 'undefined' ? window.localStorage.getItem('tf_user') : null
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  function initials(name) {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  }

  return (
    <header className="app-topbar" style={styles.topbar}>
      <h1 style={styles.title}>{title}</h1>
      <SearchBox />
      
      <div style={styles.profileRow}>
        <div style={styles.avatar}>{initials(user?.full_name)}</div>
        <div>
          <div style={styles.profileName}>{user?.full_name || 'User'}</div>
          <div style={styles.profileEmail}>{user?.email || ''}</div>
        </div>
      </div>
    </header>
  )
}

const styles = {
  topbar: {
    marginLeft: '0',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    background: '#ffffff',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
  },
  title: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#0F172A',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: '#0F766E',
    background: 'rgba(15, 118, 110, 0.12)',
  },
  profileName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#0F172A',
    lineHeight: 1.2,
  },
  profileEmail: {
    fontSize: '0.75rem',
    color: '#64748B',
  },
}
