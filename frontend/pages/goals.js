import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
const emptyForm = { title: '', description: '', target_date: '', status: 'active' }

async function request(path, options = {}) {
  const token = window.localStorage.getItem('tf_token')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || 'Request failed')
  return data
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadGoals() {
      try {
        const data = await request('/goals')
        if (!cancelled) setGoals(data)
      } catch (loadError) {
        if (!cancelled) setError(loadError.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadGoals()
    return () => {
      cancelled = true
    }
  }, [])

  const openCreateModal = () => {
    setEditingGoal(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
    setError('')
  }

  const openEditModal = (goal) => {
    setEditingGoal(goal)
    setForm({
      title: goal.title,
      description: goal.description || '',
      target_date: goal.target_date || '',
      status: goal.status,
    })
    setModalOpen(true)
    setError('')
  }

  const closeModal = () => {
    if (!saving) setModalOpen(false)
  }

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const saveGoal = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = { ...form, target_date: form.target_date || null }
      const savedGoal = editingGoal
        ? await request(`/goals/${editingGoal.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await request('/goals', { method: 'POST', body: JSON.stringify(payload) })

      setGoals((current) => editingGoal
        ? current.map((goal) => goal.id === savedGoal.id ? savedGoal : goal)
        : [savedGoal, ...current])
      setModalOpen(false)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteGoal = async (goal) => {
    if (!window.confirm(`Delete "${goal.title}"?`)) return

    try {
      await request(`/goals/${goal.id}`, { method: 'DELETE' })
      setGoals((current) => current.filter((item) => item.id !== goal.id))
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <AppShell title="Goals">
      <section style={styles.header}>
        <div>
          <h1 style={styles.title}>Goals</h1>
          <p style={styles.subtitle}>Keep the outcomes you are working toward in view.</p>
        </div>
        <button type="button" onClick={openCreateModal} style={styles.primaryButton}>
          Create Goal
        </button>
      </section>
      {error ? <p style={styles.error}>{error}</p> : null}
      {loading ? <p>Loading goals...</p> : null}
      {!loading && goals.length === 0 ? (
        <section style={styles.card}>
          <EmptyState icon="🎯" title="No goals yet" description="Create your first goal to give your work a clear direction." />
        </section>
      ) : null}
      {!loading && goals.length > 0 ? (
        <section style={styles.goalList}>
          {goals.map((goal) => (
            <article key={goal.id} style={styles.card}>
              <div style={styles.goalHeader}>
                <div>
                  <Link href={`/goals/${goal.id}`} style={styles.goalLink}>{goal.title}</Link>
                  <span style={styles.status}>{goal.status}</span>
                </div>
                <div style={styles.actions}>
                  <button type="button" onClick={() => openEditModal(goal)} style={styles.secondaryButton}>Edit</button>
                  <button type="button" onClick={() => deleteGoal(goal)} style={styles.deleteButton}>Delete</button>
                </div>
              </div>
              {goal.description ? <p style={styles.description}>{goal.description}</p> : null}
              {goal.target_date ? <p style={styles.targetDate}>Target date: {goal.target_date}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
      {modalOpen ? (
        <div role="presentation" onMouseDown={closeModal} style={styles.overlay}>
          <section role="dialog" aria-modal="true" aria-labelledby="goal-modal-title" onMouseDown={(event) => event.stopPropagation()} style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 id="goal-modal-title" style={styles.modalTitle}>{editingGoal ? 'Edit goal' : 'Create goal'}</h2>
              <button type="button" onClick={closeModal} style={styles.closeButton} aria-label="Close">×</button>
            </div>
            <form onSubmit={saveGoal} style={styles.form}>
              <label style={styles.label}>
                Title
                <input required value={form.title} onChange={updateField('title')} style={styles.input} autoFocus />
              </label>
              <label style={styles.label}>
                Description
                <textarea value={form.description} onChange={updateField('description')} style={styles.textarea} rows={4} />
              </label>
              <label style={styles.label}>
                Target date
                <input type="date" value={form.target_date} onChange={updateField('target_date')} style={styles.input} />
              </label>
              <label style={styles.label}>
                Status
                <select value={form.status} onChange={updateField('status')} style={styles.input}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <div style={styles.modalActions}>
                <button type="button" onClick={closeModal} style={styles.secondaryButton}>Cancel</button>
                <button type="submit" disabled={saving} style={styles.primaryButton}>{saving ? 'Saving...' : 'Save goal'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </AppShell>
  )
}

const styles = {
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '28px' },
  title: { margin: 0, fontSize: '1.8rem', color: '#0F172A' },
  subtitle: { margin: '8px 0 0', color: '#64748B' },
  primaryButton: { border: 'none', borderRadius: '8px', padding: '10px 16px', background: '#0F766E', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' },
  deleteButton: { border: '1px solid #FCA5A5', borderRadius: '8px', padding: '8px 12px', background: '#fff', color: '#B91C1C', fontWeight: 600, cursor: 'pointer' },
  error: { padding: '12px', borderRadius: '8px', background: '#FEF2F2', color: '#B91C1C' },
  goalList: { display: 'grid', gap: '16px' },
  card: { padding: '24px', borderRadius: '12px', background: '#fff', border: '1px solid #E2E8F0' },
  goalHeader: { display: 'flex', justifyContent: 'space-between', gap: '16px' },
  goalTitle: { margin: 0, fontSize: '1.1rem', color: '#0F172A' },
  goalLink: { color: '#0F172A', fontSize: '1.1rem', fontWeight: 700, textDecoration: 'none' },
  status: { display: 'inline-block', marginTop: '8px', color: '#0F766E', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' },
  actions: { display: 'flex', gap: '8px', alignItems: 'flex-start' },
  description: { margin: '18px 0 0', color: '#475569', lineHeight: 1.5 },
  targetDate: { margin: '14px 0 0', color: '#64748B', fontSize: '0.85rem' },
  overlay: { position: 'fixed', inset: 0, zIndex: 10, display: 'grid', placeItems: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.35)' },
  modal: { width: 'min(100%, 520px)', padding: '24px', borderRadius: '12px', background: '#fff', boxShadow: '0 20px 60px rgba(15, 23, 42, 0.2)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitle: { margin: 0, fontSize: '1.2rem', color: '#0F172A' },
  closeButton: { border: 'none', background: 'transparent', color: '#64748B', fontSize: '1.5rem', cursor: 'pointer' },
  form: { display: 'grid', gap: '16px' },
  label: { display: 'grid', gap: '8px', color: '#334155', fontWeight: 600, fontSize: '0.85rem' },
  input: { width: '100%', minHeight: '42px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', color: '#0F172A', background: '#fff' },
  textarea: { width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px', color: '#0F172A', resize: 'vertical' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' },
}
