import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}


function useDashboardData() {
  const [state, setState] = useState({ loading: true, user: null, tasks: [], habits: [], error: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('tf_token') : null
        if (!token) throw new Error('Please sign in to continue.')
        const headers = { Authorization: `Bearer ${token}` }
        const responses = await Promise.all([
          fetch(`${API_BASE_URL}/users/me`, { headers }),
          fetch(`${API_BASE_URL}/tasks`, { headers }),
          fetch(`${API_BASE_URL}/habits`, { headers }),
        ])
        if (responses.some((response) => !response.ok)) throw new Error('Your session has expired.')
        const [user, tasks, habits] = await Promise.all(responses.map((response) => response.json()))
        if (!cancelled) setState({ loading: false, user, tasks, habits, error: '' })
      } catch (error) {
        if (!cancelled) setState((current) => ({ ...current, loading: false, error: error.message }))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

function StatCard({ label, value, hint }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statHint}>{hint}</span>
    </div>
  )
}

function TaskRow({ task, onToggle }) {
  return (
    <li style={styles.taskRow}>
      <label style={styles.taskCheckWrap}>
        <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} style={styles.checkbox} />
      </label>
      <span style={task.completed ? styles.taskTitleDone : styles.taskTitle}>{task.title}</span>
      <span style={styles.taskDue}>{task.completed ? 'Done' : 'Open'}</span>
    </li>
  )
}

export default function Dashboard() {
  const { loading, user, tasks: initialTasks, habits: initialHabits, error } = useDashboardData()
  const [tasks, setTasks] = useState([])
  const [habits, setHabits] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newHabit, setNewHabit] = useState('')

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    setHabits(initialHabits)
  }, [initialHabits])

  const apiRequest = async (path, options = {}) => {
    const token = window.localStorage.getItem('tf_token')
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    })
    if (!response.ok) throw new Error((await response.json()).detail || 'Request failed')
    return response.json()
  }

  const toggleTask = async (task) => {
    const updated = await apiRequest(`/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: task.title, completed: !task.completed }),
    })
    setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  const addTask = async (event) => {
    event.preventDefault()
    if (!newTask.trim()) return
    const task = await apiRequest('/tasks', { method: 'POST', body: JSON.stringify({ title: newTask }) })
    setTasks((current) => [...current, task])
    setNewTask('')
  }

  const addHabit = async (event) => {
    event.preventDefault()
    if (!newHabit.trim()) return
    const habit = await apiRequest('/habits', { method: 'POST', body: JSON.stringify({ name: newHabit }) })
    setHabits((current) => [...current, habit])
    setNewHabit('')
  }

  const checkInHabit = async (habit) => {
    await apiRequest(`/habits/${habit.id}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ completed: !habit.completed_today }),
    })
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, completed_today: !item.completed_today } : item))
  }

  const completedCount = useMemo(() => tasks.filter((task) => task.completed).length, [tasks])
  const greeting = timeGreeting()

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.glowOne} />
        <div style={styles.glowTwo} />
        <p style={styles.loadingText}>Loading your dashboard…</p>
      </main>
    )
  }

  if (error) {
    return <main style={styles.page}><p style={styles.loadingText}>{error}</p></main>
  }

  return (
    <main style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.shell}>
        <header style={styles.topBar}>
          <div style={styles.brandRow}>
            <div style={styles.brandMark}>TF</div>
            <span style={styles.brandTitle}>TaskFlow</span>
          </div>

          <div style={styles.profileRow}>
            <div style={styles.avatar}>{initials(user?.full_name)}</div>
            <div>
              <div style={styles.profileName}>{user?.full_name}</div>
              <div style={styles.profileEmail}>{user?.email}</div>
            </div>
          </div>
        </header>

        <section style={styles.heroCard}>
          <h1 style={styles.heroTitle}>
            {greeting}, {(user?.full_name || '').split(' ')[0] || 'there'}.
          </h1>
          <p style={styles.heroSubtitle}>Here's what's on your plate today.</p>
        </section>

        <section style={styles.statsGrid}>
          <StatCard label="Open tasks" value={tasks.length - completedCount} hint="Across all lists" />
          <StatCard label="Completed" value={completedCount} hint="This week" />
          <StatCard label="Streak" value="4 days" hint="Keep it going" />
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h2 style={styles.cardTitle}>Today's tasks</h2>
            <form onSubmit={addTask} style={styles.addForm}>
              <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="New task" style={styles.smallInput} />
              <button type="submit" style={styles.addButton}>Add task</button>
            </form>
          </div>

          {tasks.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>Nothing here yet</p>
              <p style={styles.emptyText}>Add your first task to start tracking your day.</p>
            </div>
          ) : (
            <ul style={styles.taskList}>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </ul>
          )}
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h2 style={styles.cardTitle}>Daily habits</h2>
            <form onSubmit={addHabit} style={styles.addForm}>
              <input value={newHabit} onChange={(event) => setNewHabit(event.target.value)} placeholder="New habit" style={styles.smallInput} />
              <button type="submit" style={styles.addButton}>Add habit</button>
            </form>
          </div>
          {habits.length === 0 ? <p style={styles.emptyText}>Create a habit to start your streak.</p> : (
            <ul style={styles.taskList}>
              {habits.map((habit) => (
                <li key={habit.id} style={styles.taskRow}>
                  <input type="checkbox" checked={habit.completed_today} onChange={() => checkInHabit(habit)} style={styles.checkbox} />
                  <span style={habit.completed_today ? styles.taskTitleDone : styles.taskTitle}>{habit.name}</span>
                  <span style={styles.taskDue}>{habit.completed_today ? 'Done today' : habit.frequency}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '32px',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
    color: '#0F172A',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  },
  loadingText: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    marginTop: '20vh',
    color: '#475569',
    fontSize: '0.98rem',
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
  shell: {
    position: 'relative',
    zIndex: 1,
    width: 'min(100%, 820px)',
    margin: '0 auto',
    display: 'grid',
    gap: '20px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brandMark: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 800,
    color: '#ffffff',
    background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
  },
  brandTitle: {
    fontWeight: 800,
    fontSize: '1.05rem',
    letterSpacing: '-0.02em',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: '#0F766E',
    background: 'rgba(15, 118, 110, 0.12)',
  },
  profileName: {
    fontSize: '0.9rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  profileEmail: {
    fontSize: '0.78rem',
    color: '#64748B',
  },
  heroCard: {
    padding: '28px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.82)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.10)',
    backdropFilter: 'blur(18px)',
  },
  heroTitle: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
  },
  heroSubtitle: {
    margin: '8px 0 0',
    color: '#475569',
    fontSize: '0.95rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px',
  },
  statCard: {
    padding: '18px',
    borderRadius: '18px',
    background: 'rgba(255, 255, 255, 0.82)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    display: 'grid',
    gap: '4px',
  },
  statLabel: {
    fontSize: '0.78rem',
    color: '#64748B',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize: '1.6rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  statHint: {
    fontSize: '0.78rem',
    color: '#94A3B8',
  },
  card: {
    padding: '24px',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.82)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 800,
  },
  addButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  addForm: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  smallInput: {
    minHeight: '38px',
    width: '150px',
    borderRadius: '10px',
    border: '1px solid #CBD5E1',
    padding: '0 10px',
    color: '#0F172A',
    background: '#ffffff',
  },
  taskList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gap: '2px',
  },
  taskRow: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr auto',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 8px',
    borderRadius: '12px',
  },
  taskCheckWrap: {
    display: 'grid',
    placeItems: 'center',
  },
  checkbox: {
    width: '17px',
    height: '17px',
    accentColor: '#0F766E',
  },
  taskTitle: {
    fontSize: '0.94rem',
    color: '#0F172A',
  },
  taskTitleDone: {
    fontSize: '0.94rem',
    color: '#94A3B8',
    textDecoration: 'line-through',
  },
  taskDue: {
    fontSize: '0.78rem',
    color: '#94A3B8',
  },
  emptyState: {
    padding: '28px 12px',
    textAlign: 'center',
  },
  emptyTitle: {
    margin: 0,
    fontWeight: 700,
  },
  emptyText: {
    margin: '4px 0 0',
    color: '#64748B',
    fontSize: '0.9rem',
  },
}