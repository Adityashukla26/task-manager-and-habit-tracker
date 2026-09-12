import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import { apiRequest } from '../../lib/api'

export default function TaskDetail() {
  const router = useRouter()
  const [task, setTask] = useState(null)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    apiRequest(`/tasks/${router.query.id}`).then(setTask).catch((loadError) => setError(loadError.message))
  }, [router.isReady, router.query.id])

  const transition = async (status) => {
    try { setTask(await apiRequest(`/tasks/${task.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })) } catch (transitionError) { setError(transitionError.message) }
  }

  const addSubtask = async (event) => {
    event.preventDefault()
    if (!subtaskTitle.trim()) return
    try {
      const created = await apiRequest(`/tasks/${task.id}/subtasks`, { method: 'POST', body: JSON.stringify({ title: subtaskTitle }) })
      setTask((current) => ({ ...current, subtasks: [...current.subtasks, created] }))
      setSubtaskTitle('')
    } catch (addError) { setError(addError.message) }
  }

  const toggleSubtask = async (subtask) => {
    try {
      const updated = await apiRequest(`/tasks/${task.id}/subtasks/${subtask.id}`, { method: 'PUT', body: JSON.stringify({ title: subtask.title, completed: !subtask.completed }) })
      setTask((current) => ({ ...current, subtasks: current.subtasks.map((item) => item.id === updated.id ? updated : item) }))
    } catch (updateError) { setError(updateError.message) }
  }

  if (!task) return <AppShell title="Task details"><p>{error || 'Loading task...'}</p></AppShell>

  return <AppShell title="Task details">
    <Link href="/tasks" style={styles.back}>Back to tasks</Link>
    <section style={styles.card}>
      <div style={styles.header}><div><h1 style={styles.title}>{task.title}</h1><p style={styles.muted}>{task.description || 'No description'}</p></div><strong style={styles.score}>Score {task.priority_score}</strong></div>
      <div style={styles.meta}><span>Priority {task.priority}</span><span>Status {task.status}</span>{task.due_date ? <span>Due {task.due_date}</span> : null}</div>
      <div style={styles.statusRow}>{['todo', 'in_progress', 'blocked', 'done'].map((status) => <button key={status} type="button" onClick={() => transition(status)} style={task.status === status ? styles.activeButton : styles.button}>{status}</button>)}</div>
    </section>
    <section style={styles.card}><h2 style={styles.sectionTitle}>Why this priority?</h2><p style={styles.muted}>The score combines your priority level, due-date urgency, current status, and subtask completion. Higher scores appear earlier in the priority queue.</p><div style={styles.breakdown}><span>Base priority: {task.priority} × 20</span><span>Urgency: {task.due_date ? `due ${task.due_date}` : 'no due date'}</span><span>Subtasks: {task.subtasks.filter((item) => item.completed).length}/{task.subtasks.length} complete</span></div></section>
    <section style={styles.card}><h2 style={styles.sectionTitle}>Subtasks</h2><form onSubmit={addSubtask} style={styles.addForm}><input required value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add a subtask" style={styles.input} /><button type="submit" style={styles.activeButton}>Add</button></form>{task.subtasks.length ? <ul style={styles.list}>{task.subtasks.map((subtask) => <li key={subtask.id} style={styles.subtask}><input type="checkbox" checked={subtask.completed} onChange={() => toggleSubtask(subtask)} /><span style={subtask.completed ? styles.done : styles.text}>{subtask.title}</span></li>)}</ul> : <p style={styles.muted}>No subtasks yet.</p>}</section>
    {error ? <p style={styles.error}>{error}</p> : null}
  </AppShell>
}

const styles = {
  back: { color: '#0F766E', fontWeight: 700, textDecoration: 'none' },
  card: { padding: '24px', marginTop: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '20px' },
  title: { margin: 0, color: '#0F172A', fontSize: '1.6rem' },
  sectionTitle: { margin: 0, color: '#0F172A', fontSize: '1.05rem' },
  muted: { color: '#64748B', lineHeight: 1.5 },
  score: { color: '#0F766E', whiteSpace: 'nowrap' },
  meta: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '18px', color: '#64748B', fontSize: '0.85rem' },
  statusRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px' },
  button: { border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px', background: '#fff', color: '#334155', cursor: 'pointer' },
  activeButton: { border: '1px solid #0F766E', borderRadius: '8px', padding: '8px 12px', background: '#0F766E', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  breakdown: { display: 'grid', gap: '8px', marginTop: '16px', color: '#334155', fontSize: '0.85rem' },
  addForm: { display: 'flex', gap: '8px', margin: '16px 0' },
  input: { flex: 1, minHeight: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px' },
  list: { display: 'grid', gap: '8px', listStyle: 'none', padding: 0 },
  subtask: { display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', background: '#F8FAFC', borderRadius: '8px' },
  text: { color: '#0F172A' },
  done: { color: '#94A3B8', textDecoration: 'line-through' },
  error: { color: '#B91C1C' },
}
