import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk, UserButton } from '@clerk/clerk-react'
import { useThemeStore } from '../stores/theme'
import { useAuthStore } from '../stores/auth'
import { useInsightsStore } from '../stores/insights'
import { useCalendarStore } from '../stores/calendar'
import { useSettingsStore } from '../stores/settings'
import { useListStore } from '../stores/list'
import { useCurrency } from '../hooks/useCurrency'
import { useIsDesktop } from '../hooks/useMediaQuery'

type SettingsItem = {
  icon: string
  label: string
  toggle?: boolean
  value?: boolean | string
  onToggle?: () => void
  action?: () => void
  badge?: string
  danger?: boolean
  subtitle?: string
}

type ThemeOption = 'light' | 'dark' | 'system'

const PUBLIC_VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { signOut, openUserProfile } = useClerk()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const { theme: preference, settled, setTheme } = useThemeStore() as any
  const { user } = useAuthStore()

  const { settings, loadSettings, updateSetting } = useSettingsStore()
  const { weeklyBudget, setWeeklyBudget } = useListStore()
  const { currencySymbol } = useCurrency()
  const isDesktop = useIsDesktop()
  const [budgetInput, setBudgetInput] = useState(weeklyBudget.toString())
  const [reminders, setReminders] = useState(true)
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [collabUpdates, setCollabUpdates] = useState(true)
  const [largerText, setLargerText] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [voiceSupport, setVoiceSupport] = useState(false)
  const [cloudSync, setCloudSync] = useState(true)
  const [offlineData, setOfflineData] = useState(true)
  const [calendarSync, setCalendarSync] = useState(false)
  const [aiPersonalization, setAiPersonalization] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    if (user?.id) loadSettings(user.id)
  }, [user?.id])

  // Sync from settings store
  useEffect(() => {
    if (settings) {
      if (settings.notifications_reminders !== undefined && settings.notifications_reminders !== null) setReminders(settings.notifications_reminders)
      if (settings.notifications_budget !== undefined && settings.notifications_budget !== null) setBudgetAlerts(settings.notifications_budget)
      if (settings.notifications_collab !== undefined && settings.notifications_collab !== null) setCollabUpdates(settings.notifications_collab)
      if (settings.accessibility_larger_text !== undefined && settings.accessibility_larger_text !== null) setLargerText(settings.accessibility_larger_text)
      if (settings.accessibility_high_contrast !== undefined && settings.accessibility_high_contrast !== null) setHighContrast(settings.accessibility_high_contrast)
      if (settings.accessibility_voice !== undefined && settings.accessibility_voice !== null) setVoiceSupport(settings.accessibility_voice)
      if (settings.weekly_budget !== undefined && settings.weekly_budget !== null) {
        setBudgetInput(settings.weekly_budget.toString())
        setWeeklyBudget(settings.weekly_budget)
      }
    }
  }, [settings])

  // Persist toggle change
  const handleToggle = (key: string, value: boolean, localSetter: (v: boolean) => void) => {
    localSetter(value)
    if (user?.id && settings) {
      updateSetting(user.id, key as any, value as any)
    }
  }

  // Budget change handler
  const handleBudgetChange = (val: string) => {
    setBudgetInput(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 0) {
      setWeeklyBudget(num)
      if (user?.id && settings) {
        updateSetting(user.id, 'weekly_budget' as any, num as any)
      }
    }
  }

  const { exportReport } = useInsightsStore()
  const { connected, syncCalendar, connectProvider, disconnectProvider, syncing } = useCalendarStore()

  const handleLogout = async () => {
    document.body.classList.add('logging-out')
    await signOut()
    window.location.href = '/login'
  }

  const handleExport = async (format: string) => {
    if (format === 'CSV' || format === 'PDF') {
      const blob = await exportReport(format.toLowerCase() as 'csv' | 'pdf')
      if (blob && format === 'CSV') {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `listify-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }
  }

  const handleCalendarToggle = async () => {
    if (calendarSync) {
      await disconnectProvider('google')
      setCalendarSync(false)
    } else {
      const result = await connectProvider('google')
      if (result.status === 'setup_required' && result.oauth_url) {
        alert('Google Calendar sync requires OAuth setup. Connect through Google Calendar settings.')
      }
      setCalendarSync(true)
      await syncCalendar()
    }
  }

  const handleImportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const text = evt.target?.result as string
      if (!text) return
      
      const rows = text.split('\n').filter(r => r.trim().length > 0)
      if (rows.length < 2) return
      
      let importedCount = 0
      for (let i = 1; i < rows.length; i++) {
        const regex = /\"([^\"]*)\"|([^,]+)/g
        const cols: string[] = []
        const row = rows[i];
        if (!row) continue;
        
        let match
        while ((match = regex.exec(row)) !== null) {
          cols.push((match[1] ?? match[2] ?? '') as string)
        }
        
        if (cols.length >= 2) {
          const qtyStr = cols[2] !== undefined ? cols[2] : '1'
          const dateStr = cols[6]
          
          const payload: any = {
            name: cols[0] || 'Imported item',
            category: cols[1] || 'All Items',
            quantity: parseInt(qtyStr) || 1,
          }
          if (cols[3] !== undefined && cols[3].trim() !== '') {
            const parsedPrice = parseFloat(cols[3])
            if (!isNaN(parsedPrice)) payload.price = parsedPrice
          }
          if (dateStr !== undefined && dateStr !== 'None') {
            payload.dueDate = new Date(dateStr).toISOString()
          }
          useListStore.getState().addItem(payload)
          importedCount++
        }
      }
      alert(`Imported ${importedCount} items!`)
      if (importInputRef.current) importInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

    const handleAction = (label: string) => {
    if (label === 'Manage Account') {
      openUserProfile()
    } else if (label === 'Import Data') {
      importInputRef.current?.click()
    } else if (label === 'Currency Selection') {
      const newCurr = prompt('Enter your 3-letter currency code (e.g. PHP, USD, EUR, GBP):', settings?.currency || 'PHP')
      if (newCurr !== null && newCurr.trim() !== '' && user?.id) {
        updateSetting(user.id, 'currency', newCurr.trim().toUpperCase())
      }
    } else if (label === 'Clear Cache') {
      if (window.confirm('Are you sure you want to clear your local cache? You will need to sign in again.')) {
        localStorage.clear()
        window.location.href = '/login'
      }
    } else if (label === 'Delete Account') {
      if (window.confirm('Are you ABSOLUTELY sure? This will delete all your local data and log you out.')) {
        localStorage.clear()
        window.location.href = '/login'
      }
    } else if (label === 'Enable Push') {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission().then(async permission => {
          if (permission === 'granted') {
            try {
              const registration = await navigator.serviceWorker.ready
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
              })
              alert('Successfully subscribed to Web Push Notifications! Your device is registered.')
            } catch (err) {
              console.error(err)
              alert('Push subscription failed. Ensure you are on HTTPS or localhost.')
            }
          } else {
            alert('Push permissions denied.')
          }
        })
      } else {
        alert('Push not supported by this browser.')
      }
    } else {
      alert(`${label} — Coming soon!`)
    }
  }

  const themeOption: ThemeOption = (preference as ThemeOption) || 'system'

  // ── Section Data ──

  const profileSection = {
    title: 'Profile',
    icon: 'person',
    items: [
      { icon: 'account_circle', label: 'Manage Account', subtitle: 'Update profile and security', action: () => handleAction('Manage Account') },
      { icon: 'email', label: 'Email', value: user?.email || '-' },
      { icon: 'workspace_premium', label: 'Subscription', value: 'Premium', badge: 'PRO' },
    ] as SettingsItem[],
  }

  const leftSections: { title: string; icon: string; items: SettingsItem[] }[] = [
    {
      title: 'Appearance',
      icon: 'palette',
      items: [
        { icon: 'light_mode', label: 'Light Theme', toggle: true, value: themeOption === 'light', onToggle: () => setTheme('light') },
        { icon: 'dark_mode', label: 'Dark Theme', toggle: true, value: themeOption === 'dark', onToggle: () => setTheme('dark') },
        { icon: 'brightness_auto', label: 'System Default', toggle: true, value: themeOption === 'system', onToggle: () => setTheme('system') },
      ],
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      items: [
        { icon: 'notifications_active', label: 'Enable Web Push', subtitle: 'Receive background OS alerts', action: () => handleAction('Enable Push') },
        { icon: 'alarm', label: 'Reminders', subtitle: 'Task and event alerts', toggle: true, value: reminders, onToggle: () => handleToggle('notifications_reminders', !reminders, setReminders) },
        { icon: 'account_balance_wallet', label: 'Budget Alerts', subtitle: 'Overspending warnings', toggle: true, value: budgetAlerts, onToggle: () => handleToggle('notifications_budget', !budgetAlerts, setBudgetAlerts) },
        { icon: 'group', label: 'Collaborator Updates', subtitle: 'When team members add/complete', toggle: true, value: collabUpdates, onToggle: () => handleToggle('notifications_collab', !collabUpdates, setCollabUpdates) },
      ],
    },
    {
      title: 'Language & Region',
      icon: 'language',
      items: [
        { icon: 'translate', label: 'Language', value: 'English', action: () => handleAction('Language Selection') },
        { icon: 'attach_money', label: 'Currency', value: `${settings?.currency || 'PHP'} (${currencySymbol})`, action: () => handleAction('Currency Selection') },
        { icon: 'calendar_today', label: 'Date Format', value: 'MM/DD/YYYY', action: () => handleAction('Date Format') },
      ],
    },
    {
      title: 'Accessibility',
      icon: 'accessibility_new',
      items: [
        { icon: 'text_increase', label: 'Larger Text', toggle: true, value: largerText, onToggle: () => handleToggle('accessibility_larger_text', !largerText, setLargerText) },
        { icon: 'contrast', label: 'High Contrast', toggle: true, value: highContrast, onToggle: () => handleToggle('accessibility_high_contrast', !highContrast, setHighContrast) },
        { icon: 'mic', label: 'Voice Support', toggle: true, value: voiceSupport, onToggle: () => handleToggle('accessibility_voice', !voiceSupport, setVoiceSupport) },
      ],
    },
  ]

  const rightSections: { title: string; icon: string; items: SettingsItem[] }[] = [
    {
      title: 'Data & Sync',
      icon: 'cloud_sync',
      items: [
        { icon: 'cloud', label: 'Cloud Sync', subtitle: 'Auto-sync across devices', toggle: true, value: cloudSync, onToggle: () => handleToggle('data_cloud_sync', !cloudSync, setCloudSync) },
        { icon: 'wifi_off', label: 'Offline Data', subtitle: 'Keep data available offline', toggle: true, value: offlineData, onToggle: () => handleToggle('data_offline', !offlineData, setOfflineData) },
        { icon: 'upload_file', label: 'Export as CSV', action: () => handleExport('CSV') },
        { icon: 'picture_as_pdf', label: 'Export as PDF', action: () => handleExport('PDF') },
        { icon: 'download', label: 'Import Data', action: () => handleAction('Import') },
        { icon: 'delete_sweep', label: 'Clear Cache', subtitle: 'Free up storage space', action: () => handleAction('Clear Cache') },
      ],
    },
    {
      title: 'Integrations',
      icon: 'extension',
      items: [
        { icon: 'event', label: 'Calendar Sync', subtitle: syncing ? 'Syncing…' : (calendarSync ? 'Connected' : 'Sync due dates to calendar'), toggle: true, value: calendarSync, onToggle: handleCalendarToggle },
        { icon: 'auto_awesome', label: 'AI Personalization', subtitle: 'Learn your preferences', toggle: true, value: aiPersonalization, onToggle: () => handleToggle('integrations_ai_personalization', !aiPersonalization, setAiPersonalization) },
        { icon: 'smart_toy', label: 'AI Assistant Preferences', action: () => navigate('/assistant') },
      ],
    },
    {
      title: 'Support',
      icon: 'help',
      items: [
        { icon: 'quiz', label: 'Help Center & FAQs', action: () => handleAction('Help Center') },
        { icon: 'support_agent', label: 'Contact Support', action: () => handleAction('Contact Support') },
        { icon: 'chat_bubble', label: 'Send Feedback', action: () => navigate('/feedback') },
        { icon: 'star', label: 'Rate LISTIFY', action: () => handleAction('Rate App') },
      ],
    },
    {
      title: 'Danger Zone',
      icon: 'warning',
      items: [
        { icon: 'delete_forever', label: 'Delete Account', subtitle: 'Permanently erase all data', danger: true, action: () => handleAction('Delete Account') },
      ],
    },
  ]

  // For mobile, merge all sections into one flat list
  const allSections = [profileSection, ...leftSections, ...rightSections]

  // ── Render helpers ──

  const renderSettingsItem = (item: SettingsItem, i: number, total: number) => (
    <div key={item.label} onClick={item.action} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.875rem 1.25rem',
      borderBottom: i < total - 1 ? '1px solid var(--surface-container-high)' : 'none',
      cursor: item.action ? 'pointer' : 'default',
      transition: 'background 0.15s',
    }}>
      <span className="material-symbols-outlined" style={{
        fontSize: 22,
        color: item.danger ? 'var(--error)' : 'var(--on-surface-variant)',
      }}>{item.icon}</span>
      <div style={{ flex: 1 }}>
        <span style={{
          fontSize: '0.9375rem', fontWeight: 500,
          color: item.danger ? 'var(--error)' : 'var(--on-surface)',
        }}>{item.label}</span>
        {item.subtitle && (
          <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>{item.subtitle}</p>
        )}
      </div>
      {item.badge && (
        <span style={{
          fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em',
          background: 'linear-gradient(135deg, var(--primary), var(--tertiary))',
          color: 'white', padding: '0.1875rem 0.5rem', borderRadius: '9999px',
        }}>{item.badge}</span>
      )}
      {item.toggle ? (
        <div className={`toggle-track ${item.value ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); item.onToggle?.() }}>
          <div className="toggle-thumb" />
        </div>
      ) : item.label === 'Weekly Budget' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)' }}>{currencySymbol}</span>
          <input
            type="number"
            min="0"
            step="5"
            value={budgetInput}
            onChange={e => handleBudgetChange(e.target.value)}
            className="ios-input"
            style={{
              width: 80, padding: '0.375rem 0.5rem', borderRadius: '0.5rem',
              fontSize: '0.875rem', fontWeight: 600, textAlign: 'right',
            }}
          />
        </div>
      ) : typeof item.value === 'string' ? (
        <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>{item.value}</span>
      ) : item.action ? (
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--on-surface-variant)' }}>chevron_right</span>
      ) : null}
    </div>
  )

  const renderSection = (section: { title: string; icon: string; items: SettingsItem[] }, si: number, alwaysOpen?: boolean) => (
    <div key={section.title} className="animate-slide-up" style={{ marginBottom: '1.25rem', opacity: 0, animationDelay: `${0.05 + si * 0.04}s` }}>
      <button
        onClick={() => !alwaysOpen && setExpandedSection(expandedSection === section.title ? null : section.title)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
          background: 'none', border: 'none', cursor: alwaysOpen ? 'default' : 'pointer', padding: '0.25rem',
          marginBottom: '0.5rem',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>{section.icon}</span>
        <h3 style={{
          flex: 1, textAlign: 'left', fontSize: '0.6875rem', fontWeight: 700,
          letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--on-surface-variant)',
        }}>
          {section.title}
        </h3>
        {!alwaysOpen && (
          <span className="material-symbols-outlined" style={{
            fontSize: 18, color: 'var(--on-surface-variant)',
            transition: 'transform 0.3s',
            transform: expandedSection === section.title ? 'rotate(180deg)' : 'none',
          }}>expand_more</span>
        )}
      </button>

      {(alwaysOpen || expandedSection === section.title || expandedSection === null) && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {section.items.map((item, i) => renderSettingsItem(item, i, section.items.length))}
        </div>
      )}
    </div>
  )

  // ── Desktop Layout ──
  if (isDesktop) {
    return (
      <div className="desktop-page-padding" style={{ minHeight: '100dvh' }}>
        <input 
          type="file" 
          accept=".csv,.txt" 
          ref={importInputRef} 
          style={{ display: 'none' }} 
          onChange={handleImportUpload} 
        />

        {/* ── Desktop Header ── */}
        <div className="desktop-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Settings</h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', opacity: 0.6 }}>LISTIFY v2.0.0</span>
        </div>

        {/* ── Profile Banner Card ── */}
        <div className="card animate-slide-up" style={{ marginBottom: '1.5rem', opacity: 0, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <UserButton afterSignOutUrl="/login" />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>{user?.name || 'Your Name'}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>{user?.email || 'your@email.com'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em',
                  background: 'linear-gradient(135deg, var(--primary), var(--tertiary))',
                  color: 'white', padding: '0.25rem 0.625rem', borderRadius: '9999px',
                }}>PRO</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Premium Member</span>
              </div>
            </div>
            <button onClick={() => openUserProfile()} style={{
              background: 'var(--surface-container-high)', border: 'none', cursor: 'pointer',
              padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
              color: 'var(--on-surface)', fontWeight: 600, fontSize: '0.8125rem',
              transition: 'background 0.15s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
              Manage Account
            </button>
          </div>
        </div>

        {/* ── Two-Column Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 2rem', alignItems: 'start' }}>
          {/* Left Column */}
          <div>
            {leftSections.map((section, i) => renderSection(section, i, true))}
          </div>
          {/* Right Column */}
          <div>
            {rightSections.map((section, i) => renderSection(section, i + leftSections.length, true))}
          </div>
        </div>

        {/* ── Sign Out ── */}
        <div style={{ maxWidth: 320, margin: '1rem 0 0' }}>
          <button onClick={handleLogout} className="animate-slide-up" style={{
            width: '100%', padding: '0.875rem', marginTop: '0.5rem',
            background: 'color-mix(in srgb, var(--error) 8%, var(--surface-container-lowest))',
            border: 'none', borderRadius: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            color: 'var(--error)', fontWeight: 700, fontSize: '0.9375rem',
            opacity: 0, animationDelay: '0.5s',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // ── Mobile Layout ──
  return (
    <div style={{ padding: '1rem 1rem 2rem' }}>
      <input 
        type="file" 
        accept=".csv,.txt" 
        ref={importInputRef} 
        style={{ display: 'none' }} 
        onChange={handleImportUpload} 
      />
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface)' }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Settings</h1>
      </div>

      {/* ── Profile Card ── */}
      <div className="card animate-slide-up" style={{ marginBottom: '1.5rem', opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <UserButton afterSignOutUrl="/login" />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{user?.name || 'Your Name'}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '0.375rem' }}>{user?.email || 'your@email.com'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{
                fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em',
                background: 'linear-gradient(135deg, var(--primary), var(--tertiary))',
                color: 'white', padding: '0.1875rem 0.5rem', borderRadius: '9999px',
              }}>PRO</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>Member</span>
            </div>
          </div>
          <button onClick={() => openUserProfile()} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--on-surface-variant)' }}>edit</span>
          </button>
        </div>
      </div>

      {/* ── Settings Sections ── */}
      {allSections.slice(1).map((section, si) => renderSection(section, si))}

      {/* ── Logout ── */}
      <button onClick={handleLogout} className="animate-slide-up" style={{
        width: '100%', padding: '1rem', marginTop: '0.5rem',
        background: 'color-mix(in srgb, var(--error) 8%, var(--surface-container-lowest))',
        border: 'none', borderRadius: '1rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        color: 'var(--error)', fontWeight: 700, fontSize: '0.9375rem',
        opacity: 0, animationDelay: '0.5s',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
        Sign Out
      </button>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.6875rem', color: 'var(--on-surface-variant)', opacity: 0.6 }}>
        LISTIFY v2.0.0 — Built with ♥
      </p>
    </div>
  )
}
