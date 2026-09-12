import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'
import QuickAdd from '../components/QuickAdd'
import { DailyProgressCard, FocusCard, GreetingHeader, PriorityQueue } from '../components/DashboardWidgets'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

function useDashboardData() {
  const [state, setState] = useState({ loading: true, user: null, tasks: [], habits: [], goals: [], error: '' })

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
          fetch(`${API_BASE_URL}/goals`, { headers }),
        ])
        if (responses.some((response) => !response.ok)) throw new Error('Your session has expired.')
        const [user, tasks, habits, goals] = await Promise.all(responses.map((response) => response.json()))
        if (!cancelled) setState({ loading: false, user, tasks, habits, goals, error: '' })
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
  const { loading, user, tasks: initialTasks, habits: initialHabits, goals: initialGoals, error } = useDashboardData()
  const [tasks, setTasks] = useState([])
  const [habits, setHabits] = useState([])
  const [goals, setGoals] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newHabit, setNewHabit] = useState('')

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    setHabits(initialHabits)
  }, [initialHabits])

  useEffect(() => {
    setGoals(initialGoals)
  }, [initialGoals])

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
  const priorityTask = [...tasks].filter((task) => !task.completed).sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))[0]

  function timeGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const greeting = timeGreeting()

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <p>Loading your dashboard…</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="Dashboard">
        <p>{error}</p>
      </AppShell>
    )
  }

  return (
    <AppShell title="Dashboard">
      <div style={styles.dashboardHeader}>
        <GreetingHeader user={user} />
        <QuickAdd onCreated={(kind, created) => kind === 'task' ? setTasks((current) => [...current, created]) : setGoals((current) => [created, ...current])} />
      </div>

      <section style={styles.widgetGrid}>
        <DailyProgressCard tasks={tasks} habits={habits} />
        <FocusCard task={priorityTask} />
      </section>
      <section style={styles.queueSection}>
        <PriorityQueue tasks={tasks} />
      </section>

      <section style={styles.statsGrid}>
        <StatCard label="Open tasks" value={tasks.length - completedCount} hint="Across all lists" />
        <StatCard label="Completed" value={completedCount} hint="This week" />
        <StatCard label="Streak" value="0 days" hint="Keep it going" />
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Today's tasks</h2>
          <form onSubmit={addTask} style={styles.addForm}>
            <input 
              value={newTask} 
              onChange={(event) => setNewTask(event.target.value)} 
              placeholder="New task" 
              style={styles.smallInput} 
            />
            <button type="submit" style={styles.addButton}>Add task</button>
          </form>
        </div>

        {tasks.length === 0 ? (
          <EmptyState icon="✓" title="No tasks yet" description="Add your first task to start tracking your day." />
        ) : (
          <ul style={styles.taskList}>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </ul>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Daily habits</h2>
          <form onSubmit={addHabit} style={styles.addForm}>
            <input 
              value={newHabit} 
              onChange={(event) => setNewHabit(event.target.value)} 
              placeholder="New habit" 
              style={styles.smallInput} 
            />
            <button type="submit" style={styles.addButton}>Add habit</button>
          </form>
        </div>
        
        {habits.length === 0 ? (
          <EmptyState icon="⚡" title="No habits yet" description="Create a habit to start your streak." />
        ) : (
          <ul style={styles.taskList}>
            {habits.map((habit) => (
              <li key={habit.id} style={styles.taskRow}>
                <input 
                  type="checkbox" 
                  checked={habit.completed_today} 
                  onChange={() => checkInHabit(habit)} 
                  style={styles.checkbox} 
                />
                <span style={habit.completed_today ? styles.taskTitleDone : styles.taskTitle}>
                  {habit.name}
                </span>
                <span style={styles.taskDue}>
                  {habit.completed_today ? 'Done today' : habit.frequency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  )
}

const styles = {
  dashboardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '24px',
  },
  widgetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  queueSection: {
    marginBottom: '32px',
  },
  heroSection: {
    marginBottom: '32px',
  },
  heroTitle: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#0F172A',
  },
  heroSubtitle: {
    margin: '8px 0 0',
    color: '#64748B',
    fontSize: '0.95rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    padding: '20px',
    borderRadius: '12px',
    background: '#ffffff',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    display: 'grid',
    gap: '8px',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748B',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#0F172A',
  },
  statHint: {
    fontSize: '0.75rem',
    color: '#94A3B8',
  },
  card: {
    marginBottom: '32px',
    padding: '24px',
    borderRadius: '12px',
    background: '#ffffff',
    border: '1px solid rgba(148, 163, 184, 0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#0F172A',
  },
  addForm: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  smallInput: {
    minHeight: '38px',
    width: '160px',
    borderRadius: '8px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    padding: '0 12px',
    fontSize: '0.85rem',
    color: '#0F172A',
  },
  addButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#0F766E',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  taskList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gap: '1px',
  },
  taskRow: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr auto',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(248, 250, 252, 0.5)',
    borderRadius: '8px',
  },
  taskCheckWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  taskTitle: {
    fontSize: '0.9rem',
    color: '#0F172A',
  },
  taskTitleDone: {
    fontSize: '0.9rem',
    color: '#94A3B8',
    textDecoration: 'line-through',
  },
  taskDue: {
    fontSize: '0.75rem',
    color: '#94A3B8',
  },
}
