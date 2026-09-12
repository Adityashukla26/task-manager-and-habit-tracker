import Link from 'next/link'

export function GreetingHeader({ user }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return <section><h1 style={styles.heroTitle}>{greeting}, {(user?.full_name || 'there').split(' ')[0]}.</h1><p style={styles.muted}>Here is what is on your plate today.</p></section>
}

export function DailyProgressCard({ tasks, habits }) {
  const total = tasks.length + habits.length
  const completed = tasks.filter((task) => task.completed).length + habits.filter((habit) => habit.completed_today).length
  const percent = total ? Math.round((completed / total) * 100) : 0
  return <section style={styles.card}><div style={styles.row}><div><h2 style={styles.title}>Daily progress</h2><p style={styles.muted}>{completed} of {total} items complete</p></div><strong style={styles.percent}>{percent}%</strong></div><div style={styles.track}><div style={{ ...styles.fill, width: `${percent}%` }} /></div></section>
}

export function PriorityQueue({ tasks }) {
  const queue = [...tasks].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)).slice(0, 5)
  return <section style={styles.card}><div style={styles.row}><h2 style={styles.title}>Priority queue</h2><Link href="/tasks" style={styles.link}>View all</Link></div>{queue.length ? <ul style={styles.list}>{queue.map((task) => <li key={task.id} style={styles.item}><span>{task.title}</span><span style={styles.score}>{task.priority_score}</span></li>)}</ul> : <p style={styles.muted}>Your queue is clear.</p>}</section>
}

export function FocusCard({ task }) {
  return <section style={styles.card}><h2 style={styles.title}>Focus next</h2>{task ? <><p style={styles.focusTitle}>{task.title}</p><p style={styles.muted}>Priority score {task.priority_score}</p><Link href={`/tasks/${task.id}`} style={styles.link}>Open task</Link></> : <p style={styles.muted}>Choose a task to focus on.</p>}</section>
}

const styles = {
  card: { padding: '20px', borderRadius: '12px', background: '#fff', border: '1px solid #E2E8F0' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
  title: { margin: 0, fontSize: '1rem', color: '#0F172A' },
  heroTitle: { margin: 0, fontSize: '1.8rem', color: '#0F172A' },
  muted: { margin: '8px 0 0', color: '#64748B', fontSize: '0.88rem' },
  percent: { fontSize: '1.6rem', color: '#0F766E' },
  track: { height: '8px', marginTop: '18px', borderRadius: '99px', background: '#E2E8F0', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: '99px', background: '#0F766E' },
  list: { display: 'grid', gap: '8px', padding: 0, margin: '16px 0 0', listStyle: 'none' },
  item: { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px', background: '#F8FAFC', borderRadius: '8px', color: '#334155' },
  score: { fontWeight: 700, color: '#0F766E' },
  link: { color: '#0F766E', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' },
  focusTitle: { margin: '18px 0 0', color: '#0F172A', fontWeight: 700 },
}
