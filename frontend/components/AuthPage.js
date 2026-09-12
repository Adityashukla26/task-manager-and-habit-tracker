import { useState } from 'react'
import { useRouter } from 'next/router'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  rememberMe: true,
  termsAccepted: false,
}

function buildApiUrl(path) {
  return new URL(path, API_BASE_URL).toString()
}

async function postJson(path, body) {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const rawText = await response.text()
  let data = {}

  if (rawText) {
    try {
      data = JSON.parse(rawText)
    } catch {
      data = { detail: rawText }
    }
  }

  if (!response.ok) {
    throw new Error(data.detail || 'Request failed')
  }

  return data
}

function Field({ label, type = 'text', value, onChange, placeholder, error, autoComplete }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={error ? { ...styles.input, ...styles.inputError } : styles.input}
      />
      {error ? <span style={styles.fieldError}>{error}</span> : null}
    </label>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} style={active ? styles.tabActive : styles.tab}>
      {children}
    </button>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('neutral')
  const [errors, setErrors] = useState({})

  const updateField = (field) => (event) => {
    const { type, checked, value } = event.target
    setForm((current) => ({
      ...current,
      [field]: type === 'checkbox' ? checked : value,
    }))
  }

  const validate = () => {
    const nextErrors = {}

    if (mode === 'signup' && !form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.'
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (mode === 'signup' && form.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.'
    }

    if (mode === 'signup' && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (mode === 'signup' && !form.termsAccepted) {
      nextErrors.termsAccepted = 'Please accept the terms to continue.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    if (!validate()) {
      setMessageType('error')
      setMessage('Please fix the highlighted fields.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signin') {
        const data = await postJson('/auth/signin', {
          email: form.email,
          password: form.password,
        })

        window.localStorage.setItem('tf_token', data.token)
        window.localStorage.setItem('tf_user', JSON.stringify(data))
        router.push('/dashboard')

        setMessageType('success')
        setMessage(`Welcome back, ${data.full_name || form.email}.`)
      } else {
        const data = await postJson('/auth/signup', {
          full_name: form.fullName,
          email: form.email,
          password: form.password,
        })

        window.localStorage.setItem('tf_token', data.token)
        window.localStorage.setItem('tf_user', JSON.stringify(data))
        router.push('/onboarding')
        setMessageType('success')
        setMessage('Account created. Let’s set up your workspace.')
      }
      setErrors({})
    } catch (error) {
      setMessageType('error')
      setMessage(error.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setErrors({})
    setMessage('')
    setMessageType('neutral')
  }

  return (
    <main style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <section style={styles.card}>
        <div style={styles.brandRow}>
          <div style={styles.brandMark}>TF</div>
          <div>
            <h1 style={styles.brandTitle}>TaskFlow</h1>
            <p style={styles.brandText}>Sign in or create an account to keep your tasks and habits in one place.</p>
          </div>
        </div>

        <div style={styles.tabs}>
          <TabButton active={mode === 'signin'} onClick={() => switchMode('signin')}>
            Sign In
          </TabButton>
          <TabButton active={mode === 'signup'} onClick={() => switchMode('signup')}>
            Sign Up
          </TabButton>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.headerBlock}>
            <h2 style={styles.title}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
            <p style={styles.subtitle}>
              {mode === 'signin'
                ? 'Use your email and password to continue.'
                : 'A minimal setup to get you started quickly.'}
            </p>
          </div>

          {mode === 'signup' ? (
            <Field
              label="Full name"
              value={form.fullName}
              onChange={updateField('fullName')}
              placeholder="Alex Morgan"
              error={errors.fullName}
              autoComplete="name"
            />
          ) : null}

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            placeholder="you@example.com"
            error={errors.email}
            autoComplete="email"
          />

          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={updateField('password')}
            placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password'}
            error={errors.password}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />

          {mode === 'signup' ? (
            <>
              <Field
                label="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                placeholder="Repeat your password"
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              <div style={styles.checkboxRow}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.termsAccepted}
                    onChange={updateField('termsAccepted')}
                    style={styles.checkbox}
                  />
                  <span>I agree to the Terms and Privacy Policy</span>
                </label>
                {errors.termsAccepted ? <span style={styles.fieldError}>{errors.termsAccepted}</span> : null}
              </div>
            </>
          ) : (
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={form.rememberMe} onChange={updateField('rememberMe')} style={styles.checkbox} />
              <span>Remember me</span>
            </label>
          )}

          <button type="submit" style={loading ? styles.buttonDisabled : styles.button} disabled={loading}>
            {loading ? 'Working...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          {message ? <div style={messageType === 'success' ? styles.successMessage : styles.errorMessage}>{message}</div> : null}

          <p style={styles.footerText}>
            {mode === 'signin' ? "Need an account?" : 'Already registered?'}{' '}
            <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} style={styles.linkButton}>
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '32px',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
    color: '#0F172A',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
  glowOne: {
    position: 'absolute',
    top: '-12%',
    left: '-8%',
    width: '36vw',
    height: '36vw',
    borderRadius: '999px',
    background: 'radial-gradient(circle, rgba(20,184,166,0.14), transparent 70%)',
    filter: 'blur(30px)',
    pointerEvents: 'none',
  },
  glowTwo: {
    position: 'absolute',
    right: '-10%',
    bottom: '-14%',
    width: '42vw',
    height: '42vw',
    borderRadius: '999px',
    background: 'radial-gradient(circle, rgba(14,165,233,0.12), transparent 70%)',
    filter: 'blur(34px)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: 'min(100%, 460px)',
    padding: '28px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.82)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.10)',
    backdropFilter: 'blur(18px)',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '22px',
  },
  brandMark: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 800,
    color: '#ffffff',
    background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
  },
  brandTitle: {
    margin: 0,
    fontSize: '1.1rem',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  brandText: {
    margin: '4px 0 0',
    color: '#475569',
    fontSize: '0.92rem',
    lineHeight: 1.55,
  },
  tabs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    padding: '6px',
    borderRadius: '16px',
    background: '#F1F5F9',
    marginBottom: '20px',
  },
  tab: {
    minHeight: '44px',
    border: 'none',
    borderRadius: '12px',
    background: 'transparent',
    color: '#475569',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  tabActive: {
    minHeight: '44px',
    border: 'none',
    borderRadius: '12px',
    background: '#0F172A',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  form: {
    display: 'grid',
    gap: '14px',
  },
  headerBlock: {
    display: 'grid',
    gap: '6px',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.7rem, 3vw, 2.2rem)',
    letterSpacing: '-0.03em',
    lineHeight: 1.08,
  },
  subtitle: {
    margin: 0,
    color: '#475569',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },
  field: {
    display: 'grid',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#334155',
  },
  input: {
    width: '100%',
    minHeight: '50px',
    borderRadius: '14px',
    border: '1px solid #CBD5E1',
    background: '#ffffff',
    padding: '0 14px',
    color: '#0F172A',
    fontSize: '0.98rem',
    outline: 'none',
  },
  inputError: {
    borderColor: '#FCA5A5',
    boxShadow: '0 0 0 3px rgba(248, 113, 113, 0.10)',
  },
  fieldError: {
    color: '#B91C1C',
    fontSize: '0.82rem',
  },
  checkboxRow: {
    display: 'grid',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    color: '#334155',
    fontSize: '0.92rem',
    lineHeight: 1.4,
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#0F766E',
  },
  button: {
    minHeight: '52px',
    border: 'none',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 14px 30px rgba(15, 118, 110, 0.18)',
  },
  buttonDisabled: {
    minHeight: '52px',
    border: 'none',
    borderRadius: '14px',
    background: '#94A3B8',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'wait',
  },
  successMessage: {
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'rgba(16, 185, 129, 0.10)',
    border: '1px solid rgba(16, 185, 129, 0.22)',
    color: '#047857',
    fontSize: '0.92rem',
    lineHeight: 1.5,
  },
  errorMessage: {
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.18)',
    color: '#B91C1C',
    fontSize: '0.92rem',
    lineHeight: 1.5,
  },
  footerText: {
    margin: '2px 0 0',
    textAlign: 'center',
    color: '#475569',
    fontSize: '0.92rem',
    lineHeight: 1.5,
  },
  linkButton: {
    border: 'none',
    background: 'transparent',
    color: '#0F766E',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
}

const globalStyles = `
  * { box-sizing: border-box; }
  html, body, #__next { margin: 0; min-height: 100%; }
  body { overflow-x: hidden; }
  button, input { font: inherit; }
  button:focus-visible, input:focus-visible {
    outline: 2px solid rgba(14, 165, 233, 0.7);
    outline-offset: 2px;
  }
`

if (typeof document !== 'undefined' && !document.getElementById('taskflow-auth-global-styles')) {
  const styleTag = document.createElement('style')
  styleTag.id = 'taskflow-auth-global-styles'
  styleTag.textContent = globalStyles
  document.head.appendChild(styleTag)
}