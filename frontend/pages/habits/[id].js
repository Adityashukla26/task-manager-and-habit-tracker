import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { apiRequest } from '../../lib/api'

export default function HabitDetail() {
  const router = useRouter()
  const [habit, setHabit] = useState(null)
  const [logs, setLogs] = useState([])
  const [trend, setTrend] = useState(null)
  const [amount, setAmount] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    const id = router.query.id
    apiRequest(`/habits/${id}`).then(setHabit).catch((loadError) => setError(loadError.message))
    apiRequest(`/habits/${id}/logs`).then(setLogs).catch(() => {})
    apiRequest(`/habits/${id}/reduction-trend`).then(setTrend).catch(() => {})
  }, [router.isReady, router.query.id])

  const logHabit = async () => {
    try {
      const id = router.query.id
      const result = habit.kind === 'reduce'
        ? await apiRequest(`/habits/${id}/reduction-usage`, { method: 'POST', body: JSON.stringify({ amount: Number(amount) }) })
        : await apiRequest(`/habits/${id}/logs`, { method: 'POST', body: JSON.stringify({ amount: Number(amount), completed: Number(amount) > 0 }) })
      if (habit.kind === 'reduce') setTrend(result)
      const nextLogs = await apiRequest(`/habits/${id}/logs`)
      setLogs(nextLogs)
      setHabit(await apiRequest(`/habits/${id}`))
    } catch (logError) { setError(logError.message) }
  }

  if (!habit) return <AppShell title="Habit detail"><p>{error || 'Loading habit...'}</p></AppShell>
  const logMap = Object.fromEntries(logs.map((log) => [log.logged_on, log]))
  const days = Array.from({ length: 7 }, (_, index) => { const current = new Date(); current.setDate(current.getDate() - (6 - index)); return current.toISOString().slice(0, 10) })

  return <AppShell title="Habit detail"><Link href="/habits" style={styles.back}>Back to habits</Link><section style={styles.card}><div style={styles.header}><div><h1 style={styles.title}>{habit.name}</h1><p style={styles.muted}>{habit.kind === 'reduce' ? 'Reduction habit' : `${habit.frequency} · target ${habit.target} ${habit.unit}`}</p></div><strong style={styles.streak}>{habit.streak} day streak</strong></div><div style={styles.grid}>{days.map((day) => <div key={day} style={logMap[day]?.completed ? styles.dayDone : styles.day}><span>{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>{logMap[day] ? logMap[day].amount : '—'}</strong></div>)}</div><div style={styles.logRow}><input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} style={styles.input} /><button type="button" onClick={logHabit} style={styles.button}>{habit.kind === 'reduce' ? 'Log usage' : 'Log today'}</button></div></section>{habit.kind === 'reduce' && trend ? <section style={styles.card}><h2 style={styles.sectionTitle}>Reduction tracking</h2><div style={styles.metric}>{trend.reduction_percent}% reduced</div><p style={styles.muted}>{trend.recovery_suggestion}</p><div style={styles.chart}>{trend.trend.map((point) => <div key={point.logged_on} style={styles.barWrap}><div style={{ ...styles.bar, height: `${Math.min(100, point.amount * 20 + 8)}px` }} /><span>{point.logged_on.slice(5)}</span></div>)}</div></section> : null}<section style={styles.card}><h2 style={styles.sectionTitle}>Recent logs</h2>{logs.length ? <ul style={styles.list}>{logs.slice(0, 10).map((log) => <li key={log.id} style={styles.item}><span>{log.logged_on}</span><strong>{log.amount} {habit.unit}</strong></li>)}</ul> : <p style={styles.muted}>No logs yet. Start with today.</p>}</section>{error ? <p style={styles.error}>{error}</p> : null}</AppShell>
}

const styles = { back: { color: '#0F766E', fontWeight: 700, textDecoration: 'none' }, card: { padding: '24px', marginTop: '18px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff' }, header: { display: 'flex', justifyContent: 'space-between', gap: '18px' }, title: { margin: 0, color: '#0F172A', fontSize: '1.6rem' }, muted: { color: '#64748B', lineHeight: 1.5 }, streak: { color: '#0F766E', whiteSpace: 'nowrap' }, grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginTop: '24px' }, day: { display: 'grid', gap: '8px', padding: '12px 6px', textAlign: 'center', background: '#F8FAFC', color: '#64748B', borderRadius: '8px', fontSize: '0.75rem' }, dayDone: { display: 'grid', gap: '8px', padding: '12px 6px', textAlign: 'center', background: '#CCFBF1', color: '#0F766E', borderRadius: '8px', fontSize: '0.75rem' }, logRow: { display: 'flex', gap: '8px', marginTop: '20px' }, input: { width: '120px', minHeight: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px' }, button: { border: 'none', borderRadius: '8px', padding: '10px 14px', background: '#0F766E', color: '#fff', fontWeight: 700, cursor: 'pointer' }, sectionTitle: { margin: 0, color: '#0F172A', fontSize: '1rem' }, metric: { marginTop: '18px', color: '#0F766E', fontSize: '2rem', fontWeight: 800 }, chart: { display: 'flex', alignItems: 'end', gap: '10px', minHeight: '130px', marginTop: '16px', padding: '12px', borderBottom: '1px solid #CBD5E1' }, barWrap: { display: 'grid', gap: '6px', justifyItems: 'center', color: '#64748B', fontSize: '0.7rem' }, bar: { width: '18px', borderRadius: '4px 4px 0 0', background: '#0F766E' }, list: { display: 'grid', gap: '8px', padding: 0, marginTop: '14px', listStyle: 'none' }, item: { display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#F8FAFC', borderRadius: '8px', color: '#475569' }, error: { color: '#B91C1C' } }
