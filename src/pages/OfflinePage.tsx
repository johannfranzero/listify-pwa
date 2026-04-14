import { useNavigate } from 'react-router-dom'

export default function OfflinePage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center', background: 'var(--surface)',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'var(--surface-container-high)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--on-surface-variant)' }}>wifi_off</span>
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>You're offline</h1>
      <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', marginBottom: '2rem', maxWidth: 300, lineHeight: 1.6 }}>
        Check your internet connection and try again. Some features may still be available offline.
      </p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>refresh</span>
        Try Again
      </button>
    </div>
  )
}
