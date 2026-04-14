import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/dashboard', icon: 'grid_view', label: 'Dashboard' },
  { path: '/lists', icon: 'format_list_bulleted', label: 'Lists' },
  { path: '/planner', icon: 'calendar_today', label: 'Planner' },
  { path: '/insights', icon: 'insights', label: 'Insights' },
  { path: '/assistant', icon: 'auto_awesome', label: 'Assistant' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="glass-nav" aria-label="Bottom Navigation" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 'var(--nav-height)',
      paddingBottom: 'var(--safe-bottom)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      maxWidth: 480, margin: '0 auto',
    }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path
        return (
          <button 
            key={tab.path} 
            onClick={() => navigate(tab.path)} 
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem',
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem',
            color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
            transition: 'color 0.2s ease',
          }}>
            <span className={`material-symbols-outlined ${active ? 'filled' : ''}`} aria-hidden="true" style={{ fontSize: '1.5rem' }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: '0.625rem', fontWeight: active ? 700 : 500,
              letterSpacing: '0.01em',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
