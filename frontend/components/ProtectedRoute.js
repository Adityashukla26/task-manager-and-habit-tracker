import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

/**
 * ProtectedRoute - Wrapper component that ensures user is authenticated
 * Redirects to login page if no token found
 */
export default function ProtectedRoute({ children }) {
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('tf_token') : null
    
    if (!token) {
      router.push('/auth')
      return
    }

    setIsAuthed(true)
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthed) {
    return null
  }

  return children
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
    color: '#0F172A',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
}
