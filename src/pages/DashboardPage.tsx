import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListStore, getCategoryProgress, getTotalCost } from '../stores/list'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notifications'
import { useAssistantStore } from '../stores/assistant'
import { useSettingsStore } from '../stores/settings'
import { useCurrency } from '../hooks/useCurrency'
import { useIsDesktop } from '../hooks/useMediaQuery'
import SideDrawer from '../components/SideDrawer'
import NotificationsPanel from '../components/NotificationsPanel'
import GlobalSearch from '../components/GlobalSearch'

const avatarColors = ['#0058bc', '#9e3d00', '#405e96', '#34c759']
const categoryIcons: Record<string, string> = {
  Produce: 'nutrition',
  Dairy: 'water_drop',
  Pantry: 'kitchen',
  Bakery: 'bakery_dining',
  Work: 'work',
  Grocery: 'shopping_cart',
  Health: 'favorite',
  Personal: 'person',
  Travel: 'flight',
}

// Activity feed and reminders are now derived from real data inside the component

export default function DashboardPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { user } = useAuthStore()
  const { items, weeklyBudget, collaborators, setWeeklyBudget } = useListStore()
  const { settings, updateSetting } = useSettingsStore()
  const { currencySymbol, formatCurrency, formatCurrencyCompact } = useCurrency()
  const [dismissedReminders, setDismissedReminders] = useState<Set<number>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(weeklyBudget.toString())
  const { unreadCount, fetchNotifications } = useNotificationStore()
  const { suggestions, fetchSuggestions, acceptSuggestion, dismissSuggestion } = useAssistantStore()

  const handleSetBudget = () => {
    navigate('/settings')
  }

  // Fetch notifications and AI suggestions on mount
  useEffect(() => {
    fetchNotifications()
    fetchSuggestions()
  }, [])

  // Sync budget input when weeklyBudget changes externally
  useEffect(() => {
    setBudgetInput(weeklyBudget.toString())
  }, [weeklyBudget])

  const handleBudgetSave = () => {
    const num = parseFloat(budgetInput)
    if (!isNaN(num) && num >= 0) {
      setWeeklyBudget(num)
      if (user?.id && settings) {
        updateSetting(user.id, 'weekly_budget' as any, num as any)
      }
    } else {
      setBudgetInput(weeklyBudget.toString())
    }
    setEditingBudget(false)
  }

  // Live computed data
  const totalItems = items.length
  const completedItems = items.filter(i => i.completed).length
  const pendingItems = totalItems - completedItems
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const totalCost = getTotalCost(items, true)
  const budgetPct = weeklyBudget > 0 ? Math.min(Math.round((totalCost / weeklyBudget) * 100), 100) : 0
  const catProgress = getCategoryProgress(items)
  const budgetExceeded = totalCost > weeklyBudget && weeklyBudget > 0;
  const totalSpent = totalCost;

  // Derive activity feed from real items
  const activityFeed = useMemo(() => {
    const avatarColorList = ['var(--avatar-1)', 'var(--avatar-2)', 'var(--avatar-3)', 'var(--avatar-4)']
    // Show most recent items as activity
    const recent = [...items]
      .sort((a, b) => {
        // Completed items first (as recent activity), then by name
        if (a.completed !== b.completed) return a.completed ? -1 : 1
        return 0
      })
      .slice(0, 3)
    return recent.map((item, i) => {
      const collab = collaborators.find(c => c.id === item.addedBy)
      return {
        user: collab?.name || user?.name || 'You',
        avatar: collab?.avatar || user?.name?.split(' ').map(n => n[0]).join('') || 'U',
        action: item.completed ? 'completed' : 'added',
        item: item.name,
        list: 'List',
        time: item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Recently',
        color: avatarColorList[i % avatarColorList.length],
      }
    })
  }, [items, collaborators, user])

  // Derive reminders from items with due dates
  const liveReminders = useMemo(() => {
    const now = Date.now()
    const threeDays = 3 * 86400000
    return items
      .filter(i => !i.completed && i.dueDate && new Date(i.dueDate).getTime() <= now + threeDays)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 3)
      .map(item => {
        const dueDate = new Date(item.dueDate!)
        const isToday = dueDate.toDateString() === new Date().toDateString()
        const isTomorrow = dueDate.toDateString() === new Date(now + 86400000).toDateString()
        const timeStr = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        return { title: item.name, time: timeStr, icon: item.recurring ? 'repeat' : 'event', route: '/lists' as const }
      })
  }, [items])

  const activeReminders = liveReminders.filter((_, i) => !dismissedReminders.has(i))
  // Category quick stats
  const categoryStats = useMemo(() => {
    const cats = ['Produce', 'Dairy', 'Pantry', 'Bakery']
    return cats.map(cat => {
      const catItems = items.filter(i => i.category === cat)
      const catCompleted = catItems.filter(i => i.completed).length
      const catTotal = catItems.length
      const catCost = catItems.filter(i => !i.completed).reduce((s, i) => s + (i.price || 0) * i.quantity, 0)
      return {
        name: cat,
        icon: categoryIcons[cat] || 'category',
        total: catTotal,
        completed: catCompleted,
        remaining: catTotal - catCompleted,
        pct: catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0,
        cost: catCost,
      }
    }).filter(c => c.total > 0)
  }, [items])

  // AI suggestion
  const aiSuggestion = useMemo(() => {
    const groceryPct = catProgress.find(c => c.category === 'Produce')?.pct || 0
    if (groceryPct >= 70) return { text: `You're ${groceryPct}% done with Produce — don't forget milk for next week!`, type: 'success' as const }
    if (budgetPct > 85) return { text: `Budget alert: you've used ${budgetPct}% of your weekly budget. Consider deferring non-essentials.`, type: 'warning' as const }
    if (completionRate > 60) return { text: `Great momentum! ${completionRate}% complete. Keep it up to hit your weekly goal.`, type: 'success' as const }
    return { text: `You have ${pendingItems} items remaining. Start with high-priority items to stay on track.`, type: 'info' as const }
  }, [catProgress, budgetPct, completionRate, pendingItems])

  // Weekly focus metric
  const weeklyFocus = useMemo(() => {
    if (budgetPct > 85) return { label: 'Budget', value: `${100 - budgetPct}%`, sub: 'remaining this week', color: 'var(--warning)', icon: 'account_balance_wallet' }
    if (completionRate >= 80) return { label: 'Efficiency', value: `${completionRate}%`, sub: 'tasks completed', color: 'var(--success)', icon: 'speed' }
    return { label: 'Progress', value: `${completionRate}%`, sub: 'overall completion', color: 'var(--primary)', icon: 'trending_up' }
  }, [budgetPct, completionRate])



  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <div className={isDesktop ? 'desktop-page-padding' : ''} style={{ padding: isDesktop ? undefined : '1rem 1rem 1.5rem', minHeight: isDesktop ? '100dvh' : undefined }}>
      {!isDesktop && <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(!searchOpen)} />

      {/* ── Header ── */}
      <div className={isDesktop ? 'desktop-header' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDesktop ? 0 : '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!isDesktop && (
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface-variant)' }}>menu</span>
            </button>
          )}
          <h1 style={{ fontSize: isDesktop ? '1.5rem' : '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{isDesktop ? 'Dashboard' : 'LISTIFY'}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => setSearchOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface-variant)' }}>search</span>
          </button>
          <button onClick={() => setNotifOpen(!notifOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface-variant)' }}>notifications</span>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--error)', color: 'white',
                fontSize: '0.5625rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          {!isDesktop && (
            <>
              <button onClick={() => navigate('/insights')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface-variant)' }}>insights</span>
              </button>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-fixed), var(--primary-fixed-dim))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }} onClick={() => navigate('/settings')}>
                <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: 'var(--primary)' }}>person</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Greeting ── */}
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          {greeting}, {user?.name?.split(' ')[0] || 'there'} 👋
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
          {pendingItems} items remaining • {formatCurrencyCompact(totalCost)} pending spend
        </p>
      </div>

      {/* ── Empty State for New Users ── */}
      {totalItems === 0 && (
        <div className="card animate-slide-up" style={{
          textAlign: 'center', padding: '2.5rem 1.5rem', marginBottom: '1.5rem', opacity: 0,
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 4%, var(--surface-container-lowest)), color-mix(in srgb, var(--tertiary) 3%, var(--surface-container-lowest)))',
          border: '1px solid color-mix(in srgb, var(--primary) 10%, transparent)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, var(--primary), var(--tertiary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 32, color: 'white' }}>rocket_launch</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Welcome to LISTIFY!</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Start by adding your first item. We'll track your budget, suggest savings, and help you stay organized.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => navigate('/planner')} className="btn-primary" style={{
              padding: '0.75rem 1.5rem', borderRadius: '0.875rem', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add First Item
            </button>
            <button onClick={() => navigate('/assistant')} className="btn-secondary" style={{
              padding: '0.75rem 1.25rem', borderRadius: '0.875rem', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span> Explore AI
            </button>
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="desktop-quick-actions" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.25rem' }}>
        {[
          { icon: 'add', label: 'Add Item', color: 'var(--primary)', bg: 'linear-gradient(135deg, var(--primary), var(--primary-container))', textColor: 'white', route: '/planner' },
          { icon: 'shopping_cart', label: 'Add Grocery', color: 'var(--primary)', bg: 'var(--primary-fixed)', textColor: 'var(--primary)', route: '/planner' },
          { icon: 'task_alt', label: 'Add Task', color: 'var(--tertiary)', bg: 'color-mix(in srgb, var(--tertiary) 12%, var(--surface-container-lowest))', textColor: 'var(--tertiary)', route: '/planner' },
          { icon: 'favorite', label: 'Health Goal', color: '#ff2d55', bg: 'color-mix(in srgb, #ff2d55 10%, var(--surface-container-lowest))', textColor: '#ff2d55', route: '/planner' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.route)} style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem',
            borderRadius: '9999px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            background: a.bg, color: a.textColor, fontWeight: 600, fontSize: '0.8125rem',
            transition: 'transform 0.2s', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Budget Overview Widget */}
      <div className="glass-card animate-slide-up" style={{ padding: '1.25rem', marginBottom: '1.5rem', animationDelay: '0.1s' }}>
        {weeklyBudget === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 48, height: 48, background: 'color-mix(in srgb, var(--primary) 15%, transparent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--primary)' }}>account_balance_wallet</span>
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: 'var(--on-surface)' }}>Set Your Weekly Budget</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              Track your spending and get smart alerts when you're nearing your limit.
            </p>
            <button
              onClick={handleSetBudget}
              className="ios-btn primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', fontWeight: 600 }}>
              Set Budget Now
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Weekly Budget</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.02em', margin: 0 }}>
                  {formatCurrency(weeklyBudget)}
                </p>
              </div>
              <div style={{
                padding: '0.375rem 0.625rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                background: budgetExceeded ? 'color-mix(in srgb, var(--error) 15%, transparent)' : 'color-mix(in srgb, var(--primary) 15%, transparent)',
                color: budgetExceeded ? 'var(--error)' : 'var(--primary)',
              }}>
                {budgetExceeded ? 'Over Budget' : `${Math.round(budgetPct)}% Used`}
              </div>
            </div>

            <div style={{ height: 8, background: 'var(--surface-container-high)', borderRadius: 4, overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{
                height: '100%',
                background: budgetExceeded ? 'var(--error)' : 'linear-gradient(90deg, var(--primary), var(--tertiary))',
                width: `${Math.min(100, budgetPct)}%`,
                borderRadius: 4,
                transition: 'width 1s cubic-bezier(0.1, 0, 0.1, 1)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              <span>{formatCurrency(totalSpent)} spent</span>
              <span>{budgetExceeded ? formatCurrency(totalSpent - weeklyBudget) + ' over' : formatCurrency(weeklyBudget - totalSpent) + ' left'}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Reminders ── */}
      {activeReminders.length > 0 && (
        <div className="animate-slide-up" style={{ marginBottom: '1.25rem', opacity: 0 }}>
          {activeReminders.map((r, ri) => {
            const origIdx = liveReminders.indexOf(r)
            return (
              <div key={ri} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem 1rem', borderRadius: '1rem',
                background: 'var(--surface-container-low)', marginBottom: '0.5rem',
                cursor: 'pointer',
              }} onClick={() => navigate(r.route)}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--primary-fixed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: 'var(--primary)' }}>{r.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{r.time}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={(e) => { e.stopPropagation(); setDismissedReminders(prev => new Set(prev).add(origIdx)) }} style={{
                    background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.25rem',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>close</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Mini Stats Grid ── */}
      <div className="desktop-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card animate-slide-up stagger-1" style={{ padding: '1rem', opacity: 0, cursor: 'pointer' }} onClick={() => navigate('/lists')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: 'var(--primary)' }}>checklist</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)' }}>Completion</span>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{completionRate}%</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{completedItems}/{totalItems} items</p>
        </div>
        <div className="card animate-slide-up stagger-2" style={{ padding: '1rem', opacity: 0, cursor: 'pointer' }} onClick={() => !editingBudget && setEditingBudget(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: budgetPct > 85 ? 'var(--warning)' : 'var(--success)' }}>account_balance_wallet</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)' }}>Budget</span>
            {!editingBudget && (
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--on-surface-variant)', opacity: 0.5, marginLeft: 'auto' }}>edit</span>
            )}
          </div>
          {editingBudget ? (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--on-surface)' }}>{currencySymbol}</span>
              <input
                type="number" min="0" step="5" autoFocus
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                onBlur={handleBudgetSave}
                onKeyDown={e => { if (e.key === 'Enter') handleBudgetSave() }}
                style={{
                  width: 80, padding: '0.375rem 0.5rem', borderRadius: '0.5rem',
                  fontSize: '1.5rem', fontWeight: 900, textAlign: 'left',
                  background: 'var(--surface-container-high)',
                  border: '2px solid var(--primary)',
                  color: 'var(--on-surface)', outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>/week</span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', color: budgetPct > 85 ? 'var(--warning)' : 'var(--on-surface)' }}>
                {formatCurrencyCompact(Math.max(0, weeklyBudget - totalCost))}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
                {formatCurrencyCompact(totalCost)} of {formatCurrencyCompact(weeklyBudget)}
              </p>
            </>
          )}
          <div className="progress-bar" style={{ marginTop: '0.375rem' }}>
            <div className="progress-fill" style={{ width: `${budgetPct}%`, background: budgetPct > 85 ? 'var(--warning)' : 'var(--primary)' }} />
          </div>
        </div>
      </div>

      {/* ── Category Cards ── */}
      <div className="animate-slide-up stagger-3" style={{ opacity: 0, marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Today's Tasks</p>
        <div className="desktop-category-grid" style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {categoryStats.map(cat => (
            <div key={cat.name} className="card" style={{
              minWidth: 150, padding: '1rem', flexShrink: 0, cursor: 'pointer',
            }} onClick={() => navigate('/lists')}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--surface-container-high)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--on-surface-variant)' }}>{cat.icon}</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>{cat.name}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>{cat.remaining} remaining</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${cat.pct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.6875rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{cat.pct}%</span>
                <span style={{ color: 'var(--on-surface-variant)' }}>${cat.cost.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI + Activity (side-by-side on desktop) ── */}
      <div className="desktop-dashboard-bottom">
      {/* ── AI Assistant Card ── */}
      <div className="card animate-slide-up stagger-4" style={{
        background: aiSuggestion.type === 'warning'
          ? 'linear-gradient(135deg, var(--warning), color-mix(in srgb, var(--warning) 80%, #000))'
          : 'linear-gradient(135deg, var(--primary), var(--primary-container))',
        color: 'white', marginBottom: '1.25rem', opacity: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>AI Assistant</span>
        </div>
        <p style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '1rem' }}>
          {aiSuggestion.text}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/assistant')} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.75rem',
            padding: '0.625rem 1rem', color: 'white', fontWeight: 600, fontSize: '0.8125rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
            Ask AI
          </button>
          <button onClick={() => navigate('/planner')} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.75rem',
            padding: '0.625rem 1rem', color: 'white', fontWeight: 600, fontSize: '0.8125rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_task</span>
            Plan
          </button>
        </div>
      </div>

      {/* ── Collaboration Feed ── */}
      <div className="animate-slide-up stagger-5" style={{ marginBottom: '1.25rem', opacity: 0 }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Recent Activity</p>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {activityFeed.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              borderBottom: i < activityFeed.length - 1 ? '1px solid var(--surface-container-high)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: a.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.625rem', fontWeight: 800, color: 'white', flexShrink: 0,
              }}>{a.avatar}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8125rem' }}>
                  <strong>{a.user}</strong> {a.action} <strong>{a.item}</strong>
                </p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>{a.time}</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: a.action === 'completed' ? 'var(--success)' : 'var(--primary)' }}>
                {a.action === 'completed' ? 'check_circle' : 'add_circle'}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>{/* end desktop-dashboard-bottom */}

      {/* ── Weekly Focus Card ── */}
      <div className="card animate-slide-up" style={{
        background: 'linear-gradient(135deg, var(--inverse-surface), color-mix(in srgb, var(--inverse-surface) 90%, var(--primary)))',
        color: 'var(--inverse-on-surface)', opacity: 0, animationDelay: '0.35s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="material-symbols-outlined filled" style={{ fontSize: 18, opacity: 0.7 }}>{weeklyFocus.icon}</span>
          <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7 }}>Weekly Focus: {weeklyFocus.label}</span>
        </div>
        <p style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{weeklyFocus.value}</p>
        <p style={{ fontSize: '0.8125rem', opacity: 0.7, marginBottom: '1rem' }}>{weeklyFocus.sub}</p>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[40, 55, 30, 45, 65, 80, completionRate * 0.8].map((h, i) => (
            <div key={i} style={{
              flex: 1, height: Math.max(h * 0.7, 12), borderRadius: 4,
              background: i === 6 ? weeklyFocus.color : 'color-mix(in srgb, var(--primary) 30%, transparent)',
              transition: 'height 0.5s ease',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
