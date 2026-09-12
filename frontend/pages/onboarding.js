import { useState } from 'react'
import { useRouter } from 'next/router'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

const questions = [
  ['primary_goal', 'What do you want to improve first?', ['Organize my work', 'Build consistent habits', 'Balance both']],
  ['experience_level', 'How do you plan today?', ['Just getting started', 'Some experience', 'I have a system']],
  ['focus_time', 'When do you usually focus best?', ['Morning', 'Afternoon', 'Evening']],
  ['reminder_preference', 'How should TaskFlow remind you?', ['A gentle nudge', 'Only when I check in', 'No reminders']],
]

export default function Onboarding() {
  const router = useRouter()
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (questions.some(([key]) => !answers[key])) {
      setError('Please answer each question before continuing.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const token = window.localStorage.getItem('tf_token')
      const response = await fetch(`${API_BASE_URL}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(answers),
      })
      if (!response.ok) throw new Error((await response.json()).detail || 'Could not save your answers.')
      router.push('/dashboard')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.brandMark}>TF</div>
        <p style={styles.eyebrow}>A few quick questions</p>
        <h1 style={styles.title}>Shape your workspace.</h1>
        <p style={styles.subtitle}>Your answers are saved to your account and help TaskFlow fit your rhythm.</p>
        <form onSubmit={submit} style={styles.form}>
          {questions.map(([key, question, options]) => (
            <fieldset key={key} style={styles.fieldset}>
              <legend style={styles.question}>{question}</legend>
              <div style={styles.options}>
                {options.map((option) => (
                  <label key={option} style={answers[key] === option ? styles.optionSelected : styles.option}>
                    <input type="radio" name={key} value={option} checked={answers[key] === option} onChange={(event) => setAnswers({ ...answers, [key]: event.target.value })} />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button type="submit" disabled={saving} style={styles.button}>{saving ? 'Saving...' : 'Continue to dashboard'}</button>
          {error ? <p style={styles.error}>{error}</p> : null}
        </form>
      </section>
    </main>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '28px', background: 'linear-gradient(135deg, #ecfeff 0%, #f8fafc 50%, #e0f2fe 100%)', color: '#0f172a', fontFamily: 'Georgia, serif' },
  card: { width: 'min(100%, 620px)', padding: '34px', borderRadius: '24px', background: 'rgba(255,255,255,.9)', boxShadow: '0 24px 70px rgba(15,23,42,.12)' },
  brandMark: { width: '44px', height: '44px', display: 'grid', placeItems: 'center', borderRadius: '14px', background: '#0f766e', color: '#fff', fontWeight: 800, fontFamily: 'Arial, sans-serif' },
  eyebrow: { margin: '24px 0 6px', color: '#0f766e', fontWeight: 700, fontFamily: 'Arial, sans-serif' },
  title: { margin: 0, fontSize: '2.3rem' },
  subtitle: { color: '#475569', lineHeight: 1.6 },
  form: { display: 'grid', gap: '20px', marginTop: '26px' },
  fieldset: { border: 0, padding: 0, margin: 0 },
  question: { fontWeight: 700, marginBottom: '10px' },
  options: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  option: { padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '.9rem' },
  optionSelected: { padding: '12px', border: '1px solid #0f766e', borderRadius: '10px', background: '#ccfbf1', color: '#115e59', fontFamily: 'Arial, sans-serif', fontSize: '.9rem' },
  button: { minHeight: '48px', border: 0, borderRadius: '12px', background: '#0f766e', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  error: { margin: 0, color: '#b91c1c', fontFamily: 'Arial, sans-serif' },
}
