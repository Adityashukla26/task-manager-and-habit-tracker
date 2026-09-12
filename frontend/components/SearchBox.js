import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'

export default function SearchBox() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!query.trim()) { setResults(null); return undefined }
    const timer = window.setTimeout(() => apiRequest(`/search?query=${encodeURIComponent(query)}`).then(setResults).catch((searchError) => setError(searchError.message)), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const total = results ? results.tasks.length + results.goals.length + results.habits.length : 0
  return <div style={styles.wrap}><label htmlFor="global-search" style={styles.label}>Search</label><input id="global-search" aria-label="Search tasks, goals, and habits" placeholder="Search everything" value={query} onChange={(event) => setQuery(event.target.value)} style={styles.input} />{error ? <p style={styles.error}>{error}</p> : null}{results ? <div style={styles.results} role="listbox">{!total ? <p style={styles.empty}>No matches</p> : null}{results.tasks.map((item) => <Link key={`task-${item.id}`} href={`/tasks/${item.id}`} style={styles.result}>Task · {item.title}</Link>)}{results.goals.map((item) => <Link key={`goal-${item.id}`} href={`/goals/${item.id}`} style={styles.result}>Goal · {item.title}</Link>)}{results.habits.map((item) => <Link key={`habit-${item.id}`} href={`/habits/${item.id}`} style={styles.result}>Habit · {item.name}</Link>)}</div> : null}</div>
}

const styles = { wrap: { position: 'relative', width: 'min(360px, 45vw)' }, label: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }, input: { width: '100%', minHeight: '38px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px', color: '#0F172A' }, results: { position: 'absolute', top: '44px', left: 0, right: 0, zIndex: 15, display: 'grid', padding: '8px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', boxShadow: '0 12px 30px rgba(15, 23, 42, .12)' }, result: { padding: '9px', color: '#334155', textDecoration: 'none', fontSize: '0.84rem' }, empty: { margin: '8px', color: '#64748B', fontSize: '0.82rem' }, error: { position: 'absolute', top: '44px', color: '#B91C1C', fontSize: '0.75rem' } }
