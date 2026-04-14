import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = sessionStorage.getItem('listify-install-dismissed')

    if (isStandalone || dismissed) return

    if (isIOSDevice) {
      setIsIOS(true)
      setTimeout(() => setShow(true), 3000)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    }
    setShow(false)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('listify-install-dismissed', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      padding: '1rem',
    }} onClick={handleDismiss}>
      <div className="animate-slide-up" onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: '1.75rem',
        padding: '2rem',
        maxWidth: 400, width: '100%',
        textAlign: 'center',
      }}>
        {/* App Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <span className="material-symbols-outlined filled" style={{ fontSize: 32, color: 'white' }}>format_list_bulleted</span>
        </div>

        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>
          Install LISTIFY
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Get the full app experience with offline access, push notifications, and instant loading.
        </p>

        {isIOS ? (
          <div style={{
            background: 'var(--surface-container)',
            borderRadius: '1rem', padding: '1.25rem',
            textAlign: 'left', marginBottom: '1.5rem',
          }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--on-surface)' }}>
              To install on iOS:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['Tap the Share button', 'Scroll down and tap "Add to Home Screen"', 'Tap "Add" to confirm'].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--primary)', color: 'var(--on-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleDismiss} className="btn-secondary" style={{ flex: 1, padding: '0.875rem' }}>
            Later
          </button>
          {!isIOS && (
            <button onClick={handleInstall} className="btn-primary" style={{ flex: 1 }}>
              Install Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
