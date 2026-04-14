import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useClerk } from '@clerk/clerk-react'
import ListifyLogo from './ListifyLogo'

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
  { icon: 'checklist', label: 'Lists', route: '/lists' },
  { icon: 'rocket_launch', label: 'Planner', route: '/planner' },
  { icon: 'insights', label: 'Insights', route: '/insights' },
  { icon: 'auto_awesome', label: 'Assistant', route: '/assistant' },
]

const bottomItems = [
  { icon: 'settings', label: 'Settings', route: '/settings' },
  { icon: 'chat_bubble', label: 'Feedback', route: '/feedback' },
]

export default function DesktopSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { signOut } = useClerk()

  const handleLogout = async () => {
    document.body.classList.add('logging-out')
    await signOut()
    setTimeout(() => {
      navigate('/login')
      document.body.classList.remove('logging-out')
    }, 150)
  }

  const NavButton = ({ icon, label, route }: { icon: string; label: string; route: string }) => {
    const active = location.pathname === route
    return (
      <button
        onClick={() => navigate(route)}
        className={`desktop-sidebar-nav-item ${active ? 'active' : ''}`}
      >
        <span className={`material-symbols-outlined ${active ? 'filled' : ''}`} style={{ fontSize: 22 }}>
          {icon}
        </span>
        <span className="desktop-sidebar-nav-label">{label}</span>
        {active && <div className="desktop-sidebar-active-indicator" />}
      </button>
    )
  }

  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div className="desktop-sidebar-header">
        <ListifyLogo size="sm" center={false} />
      </div>

      {/* Profile mini-card */}
      <div
        className="desktop-sidebar-profile"
        onClick={() => navigate('/settings')}
      >
        <div className="desktop-sidebar-avatar">
          {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
        </div>
        <div className="desktop-sidebar-profile-info">
          <p className="desktop-sidebar-profile-name">{user?.name || 'Your Name'}</p>
          <p className="desktop-sidebar-profile-email">{user?.email || 'your@email.com'}</p>
        </div>
      </div>

      {/* Section label */}
      <p className="desktop-sidebar-section-label">Navigation</p>

      {/* Nav items */}
      <nav className="desktop-sidebar-nav">
        {navItems.map(item => (
          <NavButton key={item.route} {...item} />
        ))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Divider */}
      <div className="desktop-sidebar-divider" />

      {/* Bottom items */}
      <nav className="desktop-sidebar-nav desktop-sidebar-nav-bottom">
        {bottomItems.map(item => (
          <NavButton key={item.route} {...item} />
        ))}
      </nav>

      {/* Logout */}
      <button onClick={handleLogout} className="desktop-sidebar-logout">
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
        <span>Sign Out</span>
      </button>

      {/* Version */}
      <p className="desktop-sidebar-version">LISTIFY v2.0.0</p>
    </aside>
  )
}
