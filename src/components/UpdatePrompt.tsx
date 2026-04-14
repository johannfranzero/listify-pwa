import { useState, useEffect } from 'react'

export default function UpdatePrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShow(true)
            }
          })
        })
      })
    }
  }, [])

  if (!show) return null

  return (
    <div className="animate-slide-up" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
      padding: '0.75rem 1rem',
      background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
      color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>system_update</span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Update available</span>
      </div>
      <button
        onClick={() => { window.location.reload() }}
        style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.5rem',
          color: 'white', padding: '0.375rem 0.875rem', fontWeight: 700, fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        Refresh Now
      </button>
    </div>
  )
}
