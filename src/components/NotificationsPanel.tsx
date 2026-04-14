import { useEffect } from 'react'
import { useNotificationStore } from '../stores/notifications'

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
}

const typeIcons: Record<string, { icon: string; color: string }> = {
  collab_invite: { icon: 'person_add', color: 'var(--primary)' },
  item_completed: { icon: 'check_circle', color: 'var(--success)' },
  budget_alert: { icon: 'account_balance_wallet', color: 'var(--warning)' },
  achievement: { icon: 'emoji_events', color: '#ff9500' },
  reminder: { icon: 'alarm', color: 'var(--secondary)' },
  system: { icon: 'info', color: 'var(--on-surface-variant)' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllRead } = useNotificationStore()

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease',
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 56, right: '0.75rem', zIndex: 999,
          width: 'min(360px, calc(100vw - 1.5rem))',
          maxHeight: 'calc(100dvh - 120px)',
          background: 'var(--surface-container-lowest)',
          borderRadius: '1rem',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideDownPanel 0.25s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Notifications</h3>
            {unreadCount > 0 && (
              <span style={{
                background: 'var(--error)', color: 'white',
                fontSize: '0.625rem', fontWeight: 800,
                padding: '0.125rem 0.375rem', borderRadius: '0.5rem',
              }}>{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600,
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3, marginBottom: '0.5rem' }}>notifications_off</span>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>No notifications yet</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>We'll notify you about important updates</p>
            </div>
          ) : (
            notifications.map((n) => {
              const meta = typeIcons[n.type] ?? typeIcons['system']!
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  style={{
                    display: 'flex', gap: '0.75rem', padding: '0.75rem',
                    borderRadius: '0.75rem', cursor: 'pointer',
                    background: n.read ? 'transparent' : 'color-mix(in srgb, var(--primary) 4%, transparent)',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `color-mix(in srgb, ${meta.color} 12%, var(--surface-container-lowest))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: meta.color }}>{meta.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.8125rem', fontWeight: n.read ? 500 : 700,
                      marginBottom: '0.125rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{n.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{n.body}</p>
                    <p style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', opacity: 0.6, marginTop: '0.25rem' }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--primary)', flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
