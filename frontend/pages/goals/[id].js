import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { apiRequest } from '../../lib/api'

export default function GoalDetail() {
  const router = useRouter()
  const [goal, setGoal] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    apiRequest(`/goals/${router.query.id}`).then(setGoal).catch((loadError) => setError(loadError.message))
  }, [router.isReady, router.query.id])

  const transition = async (status) => {
    try { setGoal(await apiRequest(`/goals/${goal.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })) } catch (transitionError) { setError(transitionError.message) }
  }

  if (!goal) return <AppShell title="Goal detail"><p>{error || 'Loading goal...'}</p></AppShell>

  return <AppShell title="Goal detail">
    <Link href="/goals" style={styles.back}>Back to goals</Link>
    <section style={styles.card}><div style={styles.header}><div><h1 style={styles.title}>{goal.title}</h1><p style={styles.description}>{goal.description || 'No description'}</p></div><span style={styles.status}>{goal.status}</span></div>{goal.target_date ? <p style={styles.muted}>Target date: {goal.target_date}</p> : null}<div style={styles.actions}>{['active', 'completed', 'archived'].map((status) => <button key={status} type="button" onClick={() => transition(status)} style={goal.status === status ? styles.activeButton : styles.button}>{status}</button>)}</div></section>
    <section style={styles.card}><h2 style={styles.sectionTitle}>Linked tasks</h2>{goal.tasks.length ? <ul style={styles.list}>{goal.tasks.map((task) => <li key={task.id} style={styles.item}><Link href={`/tasks/${task.id}`} style={styles.task}>{task.title}</Link><span>{task.status}</span></li>)}</ul> : <p style={styles.muted}>No tasks are linked to this goal yet.</p>}</section>
    <section style={styles.card}><h2 style={styles.sectionTitle}>Connected habits</h2>{goal.habits?.length ? <ul style={styles.list}>{goal.habits.map((habit) => <li key={habit.id} style={styles.item}><Link href={`/habits/${habit.id}`} style={styles.task}>{habit.name}</Link><span>{habit.kind === 'reduce' ? 'Reduce' : 'Build'} · {habit.streak} day streak</span></li>)}</ul> : <p style={styles.muted}>No habits are connected to this goal yet.</p>}</section>
    {error ? <p style={styles.error}>{error}</p> : null}
  </AppShell>
}

const styles = {
  back: { color: '#0F766E', fontWeight: 700, textDecoration: 'none' },
  card: { padding: '24px', marginTop: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '20px' },
  title: { margin: 0, color: '#0F172A', fontSize: '1.6rem' },
  sectionTitle: { margin: 0, color: '#0F172A', fontSize: '1.05rem' },
  description: { color: '#475569', lineHeight: 1.5 },
  muted: { color: '#64748B', fontSize: '0.88rem' },
  status: { color: '#0F766E', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem' },
  actions: { display: 'flex', gap: '8px', marginTop: '20px' },
  button: { border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px', background: '#fff', cursor: 'pointer' },
  activeButton: { border: '1px solid #0F766E', borderRadius: '8px', padding: '8px 12px', background: '#0F766E', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  list: { display: 'grid', gap: '8px', padding: 0, marginTop: '16px', listStyle: 'none' },
  item: { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '8px', background: '#F8FAFC', color: '#64748B', fontSize: '0.85rem' },
  task: { color: '#0F172A', fontWeight: 700, textDecoration: 'none' },
  error: { color: '#B91C1C' },
}
