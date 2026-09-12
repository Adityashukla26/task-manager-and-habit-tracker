import { useEffect } from 'react'

export default function Toast({ message, actionLabel, onAction, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(onDismiss, 5000)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null
  return (
    <div role="status" aria-live="polite" style={styles.toast}>
      <span>{message}</span>
      {actionLabel ? <button type="button" onClick={onAction} style={styles.action}>{actionLabel}</button> : null}
      <button type="button" aria-label="Dismiss notification" onClick={onDismiss} style={styles.dismiss}>×</button>
    </div>
  )
}

const styles = {
  toast: { position: 'fixed', left: '50%', bottom: '24px', zIndex: 50, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: 'min(92vw, 520px)', padding: '12px 14px', borderRadius: '10px', background: '#0F172A', color: '#fff', boxShadow: '0 12px 30px rgba(15, 23, 42, .2)', fontSize: '0.85rem' },
  action: { border: 'none', background: 'transparent', color: '#5EEAD4', fontWeight: 700, cursor: 'pointer' },
  dismiss: { border: 'none', background: 'transparent', color: '#CBD5E1', fontSize: '1.1rem', cursor: 'pointer' },
}
