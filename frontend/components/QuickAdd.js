import { useState } from 'react'
import { apiRequest } from '../lib/api'

const initialTask = { title: '', description: '', priority: 3, due_date: '', goal_id: '', status: 'todo' }
const initialGoal = { title: '', description: '', target_date: '' }

export default function QuickAdd({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('task')
  const [task, setTask] = useState(initialTask)
  const [goal, setGoal] = useState(initialGoal)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    if (!saving) setOpen(false)
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = kind === 'task'
        ? { ...task, priority: Number(task.priority), goal_id: task.goal_id ? Number(task.goal_id) : null, due_date: task.due_date || null }
        : { ...goal, target_date: goal.target_date || null }
      const created = await apiRequest(kind === 'task' ? '/tasks' : '/goals', { method: 'POST', body: JSON.stringify(payload) })
      onCreated?.(kind, created)
      setTask(initialTask)
      setGoal(initialGoal)
      setOpen(false)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={styles.button}>Quick Add</button>
      {open ? (
        <div role="presentation" onMouseDown={close} style={styles.overlay}>
          <section role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} style={styles.modal}>
            <div style={styles.header}>
              <h2 style={styles.title}>Quick Add</h2>
              <button type="button" onClick={close} style={styles.close} aria-label="Close">×</button>
            </div>
            <div style={styles.tabs}>
              <button type="button" onClick={() => setKind('task')} style={kind === 'task' ? styles.tabActive : styles.tab}>Task</button>
              <button type="button" onClick={() => setKind('goal')} style={kind === 'goal' ? styles.tabActive : styles.tab}>Goal</button>
            </div>
            {error ? <p style={styles.error}>{error}</p> : null}
            <form onSubmit={submit} style={styles.form}>
              {kind === 'task' ? (
                <>
                  <label style={styles.label}>Title<input required value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} style={styles.input} /></label>
                  <label style={styles.label}>Description<textarea value={task.description} onChange={(event) => setTask({ ...task, description: event.target.value })} style={styles.textarea} rows={3} /></label>
                  <div style={styles.row}>
                    <label style={styles.label}>Priority<select value={task.priority} onChange={(event) => setTask({ ...task, priority: event.target.value })} style={styles.input}><option value="5">Critical</option><option value="4">High</option><option value="3">Normal</option><option value="2">Low</option><option value="1">Minimal</option></select></label>
                    <label style={styles.label}>Due date<input type="date" value={task.due_date} onChange={(event) => setTask({ ...task, due_date: event.target.value })} style={styles.input} /></label>
                  </div>
                </>
              ) : (
                <>
                  <label style={styles.label}>Title<input required value={goal.title} onChange={(event) => setGoal({ ...goal, title: event.target.value })} style={styles.input} /></label>
                  <label style={styles.label}>Description<textarea value={goal.description} onChange={(event) => setGoal({ ...goal, description: event.target.value })} style={styles.textarea} rows={3} /></label>
                  <label style={styles.label}>Target date<input type="date" value={goal.target_date} onChange={(event) => setGoal({ ...goal, target_date: event.target.value })} style={styles.input} /></label>
                </>
              )}
              <button type="submit" disabled={saving} style={styles.submit}>{saving ? 'Saving...' : `Create ${kind}`}</button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}

const styles = {
  button: { border: 'none', borderRadius: '8px', padding: '10px 14px', background: '#0F766E', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.35)' },
  modal: { width: 'min(100%, 520px)', padding: '24px', borderRadius: '12px', background: '#fff', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, color: '#0F172A', fontSize: '1.2rem' },
  close: { border: 'none', background: 'transparent', fontSize: '1.5rem', color: '#64748B', cursor: 'pointer' },
  tabs: { display: 'flex', gap: '8px', margin: '20px 0 16px' },
  tab: { flex: 1, border: '1px solid #CBD5E1', borderRadius: '8px', padding: '9px', background: '#fff', cursor: 'pointer' },
  tabActive: { flex: 1, border: '1px solid #0F766E', borderRadius: '8px', padding: '9px', background: '#ECFDF5', color: '#0F766E', fontWeight: 700, cursor: 'pointer' },
  form: { display: 'grid', gap: '14px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  label: { display: 'grid', gap: '7px', color: '#334155', fontSize: '0.82rem', fontWeight: 700 },
  input: { width: '100%', minHeight: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px', color: '#0F172A', background: '#fff' },
  textarea: { width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px', color: '#0F172A', resize: 'vertical' },
  submit: { border: 'none', borderRadius: '8px', padding: '11px', background: '#0F172A', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  error: { margin: '0 0 14px', color: '#B91C1C', fontSize: '0.85rem' },
}
