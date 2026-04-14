import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useClerk } from '@clerk/clerk-react'
import ListifyLogo from './ListifyLogo'

interface SideDrawerProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
  { icon: 'checklist', label: 'Lists', route: '/lists' },
  { icon: 'rocket_launch', label: 'Planner', route: '/planner' },
  { icon: 'insights', label: 'Insights', route: '/insights' },
  { icon: 'auto_awesome', label: 'Assistant', route: '/assistant' },
  { icon: 'settings', label: 'Settings', route: '/settings' },
]

const utilityItems = [
  { icon: 'person', label: 'Profile', route: '/settings' },
  { icon: 'notifications', label: 'Notifications', route: '/settings' },
  { icon: 'help', label: 'Help & Support', route: '/settings' },
]

const quickActions = [
  { icon: 'shopping_cart', label: 'Add Grocery', route: '/planner' },
  { icon: 'add_task', label: 'Add Task', route: '/planner' },
  { icon: 'account_balance_wallet', label: 'View Budget', route: '/insights' },
  { icon: 'event', label: 'Upcoming Events', route: '/lists' },
]

export default function SideDrawer({ open, onClose }: SideDrawerProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { signOut } = useClerk()
  const drawerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleNav = (route: string) => {
    onClose()
    setTimeout(() => navigate(route), 150)
  }

  const handleLogout = async () => {
    onClose()
    document.body.classList.add('logging-out')
    await signOut()
    setTimeout(() => {
      navigate('/login')
      document.body.classList.remove('logging-out')
    }, 150)
  }

  const sectionLabel = (text: string) => (
    <p style={{
      fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.2em',
      textTransform: 'uppercase', color: 'var(--on-surface-variant)',
      padding: '0.75rem 1.5rem 0.375rem',
    }}>{text}</p>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="drawer-backdrop"
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="drawer-panel"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 300, maxWidth: '85vw', zIndex: 1000,
          background: 'var(--surface)',
          borderRight: '1px solid color-mix(in srgb, var(--outline-variant) 15%, transparent)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '2rem 1.5rem 1.25rem',
          borderBottom: '1px solid var(--surface-container-high)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <ListifyLogo size="sm" center={false} />
            <button onClick={onClose} style={{
              background: 'var(--surface-container-high)', border: 'none',
              width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>close</span>
            </button>
          </div>

          {/* Profile mini-card */}
          <div onClick={() => handleNav('/settings')} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem', borderRadius: '0.875rem',
            background: 'var(--surface-container-low)', cursor: 'pointer',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.875rem', fontWeight: 800, color: 'white',
            }}>
              {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{user?.name || 'Your Name'}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>{user?.email || 'your@email.com'}</p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-surface-variant)' }}>chevron_right</span>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, paddingTop: '0.5rem' }}>
          {sectionLabel('Navigation')}
          {navItems.map(item => (
            <button key={item.label} onClick={() => handleNav(item.route)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
              padding: '0.75rem 1.5rem', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--on-surface)', fontSize: '0.9375rem',
              fontWeight: 500, transition: 'background 0.15s', textAlign: 'left',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--on-surface-variant)' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--surface-container-high)', margin: '0.5rem 1.5rem' }} />

          {sectionLabel('Quick Actions')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.25rem 1.5rem 0.5rem' }}>
            {quickActions.map(qa => (
              <button key={qa.label} onClick={() => handleNav(qa.route)} style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.625rem 0.625rem', borderRadius: '0.75rem',
                background: 'var(--surface-container-low)', border: 'none',
                cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 600,
                color: 'var(--on-surface)', transition: 'background 0.15s',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>{qa.icon}</span>
                {qa.label}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--surface-container-high)', margin: '0.5rem 1.5rem' }} />

          {sectionLabel('Account')}
          {utilityItems.map(item => (
            <button key={item.label} onClick={() => handleNav(item.route)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
              padding: '0.75rem 1.5rem', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--on-surface)', fontSize: '0.9375rem',
              fontWeight: 500, transition: 'background 0.15s', textAlign: 'left',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--on-surface-variant)' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Logout */}
        <div style={{ padding: '0.75rem 1.5rem 2rem' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
            padding: '0.875rem 1rem', background: 'color-mix(in srgb, var(--error) 8%, var(--surface-container-lowest))',
            border: 'none', borderRadius: '0.875rem', cursor: 'pointer',
            color: 'var(--error)', fontSize: '0.9375rem', fontWeight: 600,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>logout</span>
            Log Out
          </button>
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.625rem', color: 'var(--on-surface-variant)', opacity: 0.5 }}>
            LISTIFY v2.0.0
          </p>
        </div>
      </div>
    </>
  )
}
