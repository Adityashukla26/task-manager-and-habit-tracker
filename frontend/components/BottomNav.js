import Link from 'next/link'
import { useRouter } from 'next/router'

export default function BottomNav() {
  const router = useRouter()
  const items = [{ label: 'Home', path: '/dashboard' }, { label: 'Tasks', path: '/tasks' }, { label: '+', path: '/dashboard', add: true }, { label: 'Habits', path: '/habits' }, { label: 'Goals', path: '/goals' }]
  return <nav className="mobile-bottom-nav" aria-label="Mobile navigation" style={styles.nav}>{items.map((item) => <Link key={item.label} href={item.path} aria-label={item.add ? 'Quick add' : item.label} style={item.add ? styles.add : router.pathname === item.path ? styles.active : styles.item}>{item.label}</Link>)}</nav>
}
const styles = { nav: { display: 'none' }, item: { color: '#64748B', textDecoration: 'none', fontSize: '0.72rem', fontWeight: 700 }, active: { color: '#0F766E', textDecoration: 'none', fontSize: '0.72rem', fontWeight: 700 }, add: { width: '46px', height: '46px', display: 'grid', placeItems: 'center', marginTop: '-22px', borderRadius: '50%', background: '#0F766E', color: '#fff', textDecoration: 'none', fontSize: '1.4rem', boxShadow: '0 6px 16px rgba(15, 118, 110, .3)' } }
