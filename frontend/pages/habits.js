import Link from 'next/link'
import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'
import { apiRequest } from '../lib/api'

const emptyForm = { name: '', frequency: 'daily', target: 1, unit: 'times', goal_id: '' }
const emptyPlan = { baseline: 1, target: 0, strategy: '', triggers: '', replacement: '', unit: 'times' }

export default function Habits() {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forkOpen, setForkOpen] = useState(false)
  const [kind, setKind] = useState(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [plan, setPlan] = useState(emptyPlan)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)

  const loadHabits = () => apiRequest('/habits').then(setHabits).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false))
  useEffect(() => { loadHabits() }, [])

  const startFlow = (nextKind) => { setKind(nextKind); setStep(1); setForm({ ...emptyForm }); setPlan({ ...emptyPlan }); setCreated(false); setForkOpen(false) }
  const closeFlow = () => { setKind(null); setStep(1) }
  const updateForm = (field) => (event) => setForm({ ...form, [field]: event.target.value })
  const updatePlan = (field) => (event) => setPlan({ ...plan, [field]: event.target.value })

  const saveHabit = async () => {
    setSaving(true)
    try {
      const habit = await apiRequest('/habits', { method: 'POST', body: JSON.stringify({ ...form, target: Number(form.target), kind, goal_id: form.goal_id ? Number(form.goal_id) : null }) })
      if (kind === 'reduce') await apiRequest(`/habits/${habit.id}/reduction-plan`, { method: 'POST', body: JSON.stringify({ ...plan, baseline: Number(plan.baseline), target: Number(plan.target) }) })
      setHabits((current) => [...current, { ...habit, reduction_plan: kind === 'reduce' ? plan : null }])
      setCreated(true)
    } catch (saveError) { setError(saveError.message) } finally { setSaving(false) }
  }

  const buildSteps = [
    <><h2>Define your good habit</h2><label style={styles.label}>What habit do you want to build?<input required value={form.name} onChange={updateForm('name')} style={styles.input} autoFocus /></label></>,
    <><h2>Set the rhythm</h2><label style={styles.label}>Frequency<select value={form.frequency} onChange={updateForm('frequency')} style={styles.input}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><label style={styles.label}>Target per frequency<input type="number" min="1" value={form.target} onChange={updateForm('target')} style={styles.input} /></label></>,
    <><h2>Make it easy to follow</h2><label style={styles.label}>Unit<input value={form.unit} onChange={updateForm('unit')} style={styles.input} /></label><p style={styles.muted}>You will log this habit from its detail page.</p></>,
    <><h2>Ready to build</h2><p style={styles.muted}>Create “{form.name}” as a {form.frequency} habit with a target of {form.target} {form.unit}.</p></>,
  ]
  const reduceSteps = [
    <><h2>Define what to reduce</h2><label style={styles.label}>What behavior do you want to reduce?<input required value={form.name} onChange={updateForm('name')} style={styles.input} autoFocus /></label></>,
    <><h2>Choose your strategy</h2><label style={styles.label}>Current baseline per day<input type="number" min="0" value={plan.baseline} onChange={updatePlan('baseline')} style={styles.input} /></label><label style={styles.label}>Target per day<input type="number" min="0" value={plan.target} onChange={updatePlan('target')} style={styles.input} /></label><label style={styles.label}>Strategy<textarea required value={plan.strategy} onChange={updatePlan('strategy')} style={styles.textarea} rows={3} /></label></>,
    <><h2>Notice the trigger and choose a replacement</h2><label style={styles.label}>Triggers<textarea value={plan.triggers} onChange={updatePlan('triggers')} style={styles.textarea} rows={2} /></label><label style={styles.label}>Replacement<textarea required value={plan.replacement} onChange={updatePlan('replacement')} style={styles.textarea} rows={2} /></label></>,
    <><h2>Ready to reduce</h2><p style={styles.muted}>Create “{form.name}” and reduce from {plan.baseline} to {plan.target} {plan.unit} per day.</p></>,
  ]

  return <AppShell title="Habits">
    <header style={styles.header}><div><h1 style={styles.title}>Habits</h1><p style={styles.muted}>Build what helps. Reduce what gets in the way.</p></div><button type="button" onClick={() => setForkOpen(true)} style={styles.primaryButton}>Create habit</button></header>
    {error ? <p style={styles.error}>{error}</p> : null}
    {loading ? <p>Loading habits...</p> : null}
    {!loading && habits.length === 0 ? <EmptyState icon="⚡" title="No habits yet" description="Choose a Build or Reduce flow to get started." /> : null}
    <section style={styles.split}><div><h2 style={styles.sectionTitle}>Build</h2>{habits.filter((habit) => habit.kind === 'build').map((habit) => <HabitCard key={habit.id} habit={habit} />)}</div><div><h2 style={styles.sectionTitle}>Reduce</h2>{habits.filter((habit) => habit.kind === 'reduce').map((habit) => <HabitCard key={habit.id} habit={habit} />)}</div></section>
    {forkOpen ? <div role="presentation" onMouseDown={() => setForkOpen(false)} style={styles.overlay}><section role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} style={styles.modal}><h2>What kind of change?</h2><p style={styles.muted}>Choose the flow that fits the habit you have in mind.</p><div style={styles.fork}><button type="button" onClick={() => startFlow('build')} style={styles.choice}>Build a good habit<span>Practice something consistently.</span></button><button type="button" onClick={() => startFlow('reduce')} style={styles.choice}>Reduce a behavior<span>Track triggers, replacements, and usage.</span></button></div></section></div> : null}
    {kind ? <div role="presentation" style={styles.overlay}><section role="dialog" aria-modal="true" style={styles.modal}>{created ? <><h2>Habit created</h2><p style={styles.muted}>Your {kind === 'build' ? 'good habit' : 'reduction plan'} is ready to log.</p><div style={styles.actions}><button type="button" onClick={closeFlow} style={styles.primaryButton}>Done</button></div></> : <><div style={styles.stepLabel}>{kind === 'build' ? 'Good habit' : 'Reduction plan'} · Step {step} of 4</div>{kind === 'build' ? buildSteps[step - 1] : reduceSteps[step - 1]}<div style={styles.actions}>{step > 1 ? <button type="button" onClick={() => setStep(step - 1)} style={styles.secondaryButton}>Back</button> : <button type="button" onClick={closeFlow} style={styles.secondaryButton}>Cancel</button>}{step < 4 ? <button type="button" onClick={() => setStep(step + 1)} style={styles.primaryButton}>Continue</button> : <button type="button" disabled={saving} onClick={saveHabit} style={styles.primaryButton}>{saving ? 'Saving...' : 'Confirm and create'}</button>}</div></>}</section></div> : null}
  </AppShell>
}

function HabitCard({ habit }) { return <article style={styles.card}><div style={styles.cardHeader}><div><Link href={`/habits/${habit.id}`} style={styles.link}>{habit.name}</Link><p style={styles.muted}>{habit.kind === 'reduce' ? 'Reduction plan' : `${habit.frequency} · target ${habit.target} ${habit.unit}`}</p></div><strong style={styles.streak}>{habit.streak}d</strong></div><p style={styles.muted}>{habit.kind === 'reduce' ? `${habit.amount_today} ${habit.unit} today` : `${habit.completed_today ? 'Complete today' : 'Not logged today'}`}</p></article> }

const styles = { header: { display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }, title: { margin: 0, fontSize: '1.8rem', color: '#0F172A' }, sectionTitle: { fontSize: '1rem', color: '#334155' }, split: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }, card: { padding: '18px', marginBottom: '10px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff' }, cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px' }, link: { color: '#0F172A', textDecoration: 'none', fontWeight: 700 }, streak: { color: '#0F766E' }, muted: { color: '#64748B', fontSize: '0.88rem', lineHeight: 1.5 }, primaryButton: { border: 'none', borderRadius: '8px', padding: '10px 14px', background: '#0F766E', color: '#fff', fontWeight: 700, cursor: 'pointer' }, secondaryButton: { border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 14px', background: '#fff', cursor: 'pointer' }, error: { color: '#B91C1C' }, overlay: { position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.35)' }, modal: { width: 'min(100%, 540px)', padding: '24px', borderRadius: '12px', background: '#fff' }, fork: { display: 'grid', gap: '12px', marginTop: '20px' }, choice: { display: 'grid', gap: '6px', textAlign: 'left', padding: '16px', border: '1px solid #CBD5E1', borderRadius: '10px', background: '#fff', color: '#0F172A', fontWeight: 700, cursor: 'pointer' }, label: { display: 'grid', gap: '7px', marginTop: '16px', color: '#334155', fontSize: '0.84rem', fontWeight: 700 }, input: { minHeight: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px', color: '#0F172A' }, textarea: { border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px', color: '#0F172A' }, stepLabel: { color: '#0F766E', fontSize: '0.8rem', fontWeight: 700 }, actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' } }
