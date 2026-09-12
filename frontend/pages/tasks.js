import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'
import { apiRequest } from '../lib/api'
import Toast from '../components/Toast'

const emptyForm = { title: '', description: '', priority: 3, due_date: '', status: 'todo' }

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState({ message: '', undo: null })

  useEffect(() => {
    apiRequest('/tasks').then(setTasks).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false))
  }, [])

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = status === 'all' || task.status === status
    const matchesPriority = priority === 'all' || String(task.priority) === priority
    return matchesSearch && matchesStatus && matchesPriority
  }), [tasks, search, status, priority])

  const createTask = async (event) => {
    event.preventDefault()
    try {
      const created = await apiRequest('/tasks', { method: 'POST', body: JSON.stringify({ ...form, priority: Number(form.priority), due_date: form.due_date || null }) })
      setTasks((current) => [...current, created])
      setForm({ ...emptyForm })
      setShowForm(false)
    } catch (createError) {
      setError(createError.message)
    }
  }

  const toggleTask = async (task) => {
    try {
      const updated = await apiRequest(`/tasks/${task.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: task.status === 'done' ? 'todo' : 'done' }) })
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
      setToast({ message: updated.status === 'done' ? 'Task completed.' : 'Task reopened.', undo: () => apiRequest(`/tasks/${task.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: task.status }) }).then((restored) => setTasks((current) => current.map((item) => item.id === restored.id ? restored : item))) })
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const overridePriority = async (task, nextPriority) => {
    try {
      const updated = await apiRequest(`/tasks/${task.id}/priority`, { method: 'PATCH', body: JSON.stringify({ priority: Number(nextPriority) }) })
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
      setToast({ message: 'Priority updated.', undo: () => apiRequest(`/tasks/${task.id}/priority`, { method: 'PATCH', body: JSON.stringify({ priority: task.priority }) }).then((restored) => setTasks((current) => current.map((item) => item.id === restored.id ? restored : item))) })
    } catch (overrideError) { setError(overrideError.message) }
  }

  return (
    <AppShell title="Tasks">
      <header style={styles.header}>
        <div><h1 style={styles.title}>Tasks</h1><p style={styles.muted}>Turn goals into clear next actions.</p></div>
        <button type="button" onClick={() => setShowForm((value) => !value)} style={styles.primaryButton}>{showForm ? 'Close' : 'Create task'}</button>
      </header>
      {showForm ? <form onSubmit={createTask} style={styles.form}>
        <label style={styles.label}>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={styles.input} /></label>
        <label style={styles.label}>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={styles.textarea} rows={3} /></label>
        <div style={styles.formRow}>
          <label style={styles.label}>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} style={styles.input}><option value="5">Critical</option><option value="4">High</option><option value="3">Normal</option><option value="2">Low</option><option value="1">Minimal</option></select></label>
          <label style={styles.label}>Due date<input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} style={styles.input} /></label>
        </div>
        <button type="submit" style={styles.primaryButton}>Save task</button>
      </form> : null}
      <section style={styles.filters}>
        <input placeholder="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} style={styles.input} />
        <select value={status} onChange={(event) => setStatus(event.target.value)} style={styles.input}><option value="all">All statuses</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} style={styles.input}><option value="all">All priorities</option><option value="5">Critical</option><option value="4">High</option><option value="3">Normal</option><option value="2">Low</option><option value="1">Minimal</option></select>
      </section>
      {error ? <p style={styles.error}>{error}</p> : null}
      {loading ? <p>Loading tasks...</p> : null}
      {!loading && filteredTasks.length === 0 ? <EmptyState icon="✓" title="No matching tasks" description="Create a task or adjust your filters." /> : null}
      <section style={styles.list}>
        {filteredTasks.map((task) => <article key={task.id} style={styles.card}>
          <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleTask(task)} style={styles.checkbox} />
          <div style={styles.taskBody}><Link href={`/tasks/${task.id}`} style={styles.taskLink}>{task.title}</Link><p style={styles.muted}>{task.description || 'No description'}</p></div>
          <div style={styles.meta}><label>Priority<select aria-label={`Priority for ${task.title}`} value={task.priority} onChange={(event) => overridePriority(task, event.target.value)} style={styles.prioritySelect}><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label><span>Score {task.priority_score}</span><span>{task.status}</span>{task.due_date ? <span>{task.due_date}</span> : null}</div>
        </article>)}
      </section>
      <Toast message={toast.message} actionLabel={toast.undo ? 'Undo' : ''} onAction={async () => { await toast.undo?.(); setToast({ message: '', undo: null }) }} onDismiss={() => setToast({ message: '', undo: null })} />
    </AppShell>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' },
  title: { margin: 0, fontSize: '1.8rem', color: '#0F172A' },
  muted: { margin: '7px 0 0', color: '#64748B', fontSize: '0.88rem' },
  primaryButton: { border: 'none', borderRadius: '8px', padding: '10px 14px', background: '#0F766E', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  form: { display: 'grid', gap: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { display: 'grid', gap: '7px', color: '#334155', fontSize: '0.82rem', fontWeight: 700 },
  input: { minHeight: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', background: '#fff', color: '#0F172A' },
  textarea: { border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', color: '#0F172A', resize: 'vertical' },
  filters: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '20px' },
  error: { padding: '12px', borderRadius: '8px', background: '#FEF2F2', color: '#B91C1C' },
  list: { display: 'grid', gap: '10px' },
  card: { display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '14px', alignItems: 'start', padding: '18px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff' },
  checkbox: { width: '18px', height: '18px', marginTop: '2px' },
  taskBody: { minWidth: 0 },
  taskLink: { color: '#0F172A', fontWeight: 700, textDecoration: 'none' },
  meta: { display: 'grid', gap: '5px', justifyItems: 'end', color: '#64748B', fontSize: '0.78rem' },
  prioritySelect: { border: '1px solid #CBD5E1', borderRadius: '6px', padding: '3px 5px', color: '#334155', background: '#fff' },
}
