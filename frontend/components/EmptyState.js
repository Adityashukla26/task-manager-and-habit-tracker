/**
 * EmptyState - Generic empty state placeholder
 */
export default function EmptyState({ icon = '📭', title = 'Nothing here yet', description = 'Get started by creating something new.' }) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>{icon}</div>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.description}>{description}</p>
    </div>
  )
}

const styles = {
  container: {
    padding: '60px 32px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  icon: {
    fontSize: '3.5rem',
    opacity: 0.6,
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#0F172A',
  },
  description: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#64748B',
    maxWidth: '400px',
  },
}
