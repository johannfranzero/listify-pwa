import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  PointerActivationConstraint,
} from '@dnd-kit/core'
import type { PointerEvent as DndPointerEvent } from 'react'

// Custom sensor that ignores interactive elements inside sortable items
class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: { nativeEvent: globalThis.PointerEvent }) => {
        // Don't start dragging from interactive elements
        const target = event.target as HTMLElement
        if (!target) return false
        
        // Walk up the DOM to check if we're inside an interactive element
        let el: HTMLElement | null = target
        while (el) {
          if (
            el.dataset?.noDnd !== undefined ||
            el.tagName === 'BUTTON' ||
            el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'SELECT' ||
            el.getAttribute('role') === 'button'
          ) {
            return false
          }
          // Stop at the sortable container boundary  
          if (el.classList?.contains('swipe-content')) break
          el = el.parentElement
        }
        return true
      },
    },
  ]
}
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useListStore, getFilteredItems, getCategoryProgress, getTotalCost } from '../stores/list'
import type { SortBy, FilterStatus, ListItem } from '../stores/list'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'
import { useCurrency } from '../hooks/useCurrency'
import { useNavigate } from 'react-router-dom'
import SideDrawer from '../components/SideDrawer'
import UndoToast, { useUndoToast } from '../components/UndoToast'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { SUPABASE_URL, SUPABASE_ANON_KEY, getAuthenticatedClient } from '../lib/supabase'
import { checkAchievements } from '../lib/achievements'
import { generateListsCSV, downloadBlob } from '../lib/exportUtils'

const categories = ['All Items', 'Produce', 'Dairy', 'Pantry', 'Bakery']
const avatarColors = ['#0058bc', '#9e3d00', '#405e96', '#34c759']
const sortOptions: { value: SortBy; label: string; icon: string }[] = [
  { value: 'manual', label: 'Manual Order', icon: 'drag_indicator' },
  { value: 'category', label: 'Category', icon: 'category' },
  { value: 'priority', label: 'Priority', icon: 'flag' },
  { value: 'quantity', label: 'Quantity', icon: 'inventory_2' },
  { value: 'dueDate', label: 'Due Date', icon: 'calendar_today' },
]

// ── Swipe-able Item Component ──
function SwipeItem({
  item,
  onToggle,
  onDelete,
  onUpdateQty,
  onUpdateItem,
  onExpand,
  expanded,
  collaborators,
  showDragHandle,
  dragListeners,
}: {
  item: ListItem
  onToggle: () => void
  onDelete: () => void
  onUpdateQty: (qty: number) => void
  onUpdateItem: (partial: Partial<ListItem>) => void
  onExpand: () => void
  expanded: boolean
  collaborators: { id: string; name: string; avatar: string }[]
  showDragHandle?: boolean
  dragListeners?: Record<string, any>
}) {
  const { formatCurrency } = useCurrency()
  const contentRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) {
      startX.current = touch.clientX
    }
    currentX.current = 0
    setDragging(false) // Don't start dragging immediately
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) {
      const dx = touch.clientX - startX.current
      currentX.current = dx
      // Only start visual "dragging" if we pass a small threshold (10px)
      if (Math.abs(dx) > 10) {
        setDragging(true)
        setOffset(dx)
      }
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    setDragging(false)
    const threshold = 100
    if (currentX.current < -threshold) {
      onDelete()
    } else if (currentX.current > threshold) {
      onToggle()
    }
    setOffset(0)
  }, [onDelete, onToggle])

  const addedCollab = collaborators.find(c => c.id === item.addedBy)
  const dueSoon = item.dueDate && new Date(item.dueDate) <= new Date(Date.now() + 2 * 86400000)

  return (
    <div className="swipe-container">
      {/* Background layers */}
      <div className="swipe-bg swipe-bg-complete">
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
        Done
      </div>
      <div className="swipe-bg swipe-bg-delete">
        Delete
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
      </div>

      {/* Foreground card */}
      <div
        ref={contentRef}
        className={`swipe-content ${dragging ? 'dragging' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '1rem 1.25rem', cursor: 'pointer',
          }}
          onClick={onExpand}
        >
          {/* Drag handle */}
          {showDragHandle && (
            <div
              {...(dragListeners || {})}
              onClick={e => e.stopPropagation()}
              style={{
                cursor: 'grab', display: 'flex', alignItems: 'center',
                padding: '0.25rem 0', marginLeft: '-0.25rem', marginRight: '-0.25rem',
                color: 'var(--on-surface-variant)', opacity: 0.4,
                touchAction: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>drag_indicator</span>
            </div>
          )}
          {/* Checkbox */}
          <button
            type="button"
            data-no-dnd
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle() }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: -8,
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: item.completed ? 'none' : '2px solid var(--outline-variant)',
              background: item.completed ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
              pointerEvents: 'none',
            }}>
              {item.completed && <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-primary)' }}>check</span>}
            </div>
          </button>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontWeight: 600, fontSize: '0.9375rem',
              textDecoration: item.completed ? 'line-through' : 'none',
              opacity: item.completed ? 0.5 : 1,
            }}>{item.name}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>{item.category}</span>
              {item.priority && <span className="badge badge-priority">Priority</span>}
              {item.recurring && <span className="badge badge-recurring">{item.recurring.interval}</span>}
              {dueSoon && !item.completed && <span className="badge badge-due">Due soon</span>}
            </div>
          </div>

          {/* Right side: meta icons + price + qty */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {item.notes && <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-surface-variant)', opacity: 0.6 }}>sticky_note_2</span>}
              {addedCollab && (
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: avatarColors[collaborators.indexOf(addedCollab) % avatarColors.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.5rem', fontWeight: 800, color: 'white',
                }}>{addedCollab.avatar}</div>
              )}
            </div>
            {item.price != null && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                {formatCurrency(item.price * item.quantity)}
              </span>
            )}
          </div>

          {/* Quantity stepper */}
          {!item.completed && (
            <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{
              display: 'flex', alignItems: 'center', gap: '0.125rem',
              background: 'var(--surface-container-high)', borderRadius: '0.625rem', padding: '0.25rem',
            }}>
              <button onClick={() => onUpdateQty(item.quantity - 1)} style={{
                width: 28, height: 28, borderRadius: '0.5rem',
                border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--on-surface-variant)', fontSize: '1rem', fontWeight: 600,
              }}>−</button>
              <span style={{ width: 24, textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>{item.quantity}</span>
              <button onClick={() => onUpdateQty(item.quantity + 1)} style={{
                width: 28, height: 28, borderRadius: '0.5rem',
                border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--on-surface-variant)', fontSize: '1rem', fontWeight: 600,
              }}>+</button>
            </div>
          )}
        </div>

        {/* Expandable detail */}
        <div className={`item-detail ${expanded ? 'open' : ''}`}>
          <textarea
            placeholder="Add a note…"
            value={item.notes || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdateItem({ notes: e.target.value })}
            rows={2}
          />
          {item.recurring && (
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>repeat</span>
              Repeats {item.recurring.interval}
            </p>
          )}
          {item.dueDate && (
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>event</span>
              Due {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 2 : 0,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} className="animate-slide-up" {...attributes}>
      <SwipeItem {...props} dragListeners={listeners} />
    </div>
  )
}

// ── Main Page ──

export default function ListsPage() {
  const store = useListStore()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const {
    items, activeCategory, searchQuery, sortBy, filterStatus,
    weeklyBudget, collaborators, listName, loading,
    setCategory, setSearchQuery, setSortBy, setFilterStatus,
    toggleItem, updateQuantity, updateItem, removeItem, clearCompleted, setWeeklyBudget
  } = store

  const { updateSetting } = useSettingsStore()
  const { user } = useAuthStore()
  const { currencySymbol, formatCurrency } = useCurrency()

  const { toast, showToast, handleUndo, handleDismiss } = useUndoToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteResult, setInviteResult] = useState<string | null>(null)

  // Undo-able delete
  const handleDelete = (item: ListItem) => {
    removeItem(item.id)
    showToast(`"${item.name}" deleted`, () => {
      store.restoreItems([item])
    })
  }

  // Achievement-aware toggle
  const handleToggle = (id: string) => {
    console.log(`[ListsPage] Toggling item: ${id}`)
    
    // Check if we are marking it as done
    const item = items.find(i => i.id === id)
    const isNowCompleted = item && !item.completed

    if (isNowCompleted && filterStatus === 'pending') {
      // Add to toggling list to keep it visible for a moment
      setTogglingIds(prev => new Set(prev).add(id))
      toggleItem(id)
      setTimeout(() => {
        setTogglingIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 1000)
    } else {
      toggleItem(id)
    }
    
    setTimeout(() => checkAchievements(), 300)
  }

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const realOldIndex = items.findIndex((i) => i.id === active.id)
      const realNewIndex = items.findIndex((i) => i.id === over.id)
      
      if (realOldIndex !== -1 && realNewIndex !== -1) {
        store.reorderItems(realOldIndex, realNewIndex)
      }
    }
  }

  // Undo-able clear completed
  const handleClearCompleted = () => {
    const completedList = items.filter(i => i.completed)
    clearCompleted()
    showToast(`${completedList.length} completed items cleared`, () => {
      store.restoreItems(completedList)
    })
  }

  // Invite collaborator
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteResult(null)
    try {
      const client = await getAuthenticatedClient()
      const token = (client as any).rest?.headers?.Authorization
      const res = await fetch(`${SUPABASE_URL}/functions/v1/collab-invite`, {
        method: 'POST',
        headers: {
          'Authorization': token || `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: inviteEmail, list_id: store.defaultListId }),
      })
      if (res.ok) {
        setInviteResult('Invitation sent!')
        setInviteEmail('')
        setTimeout(() => { setInviteOpen(false); setInviteResult(null) }, 1500)
      } else {
        setInviteResult('Failed to send invite')
      }
    } catch {
      setInviteResult('Network error')
    } finally {
      setInviteSending(false)
    }
  }

  const filtered = useMemo(() => 
    getFilteredItems(items, activeCategory, searchQuery, filterStatus, sortBy, togglingIds),
    [items, activeCategory, searchQuery, filterStatus, sortBy, togglingIds]
  )
  const pending = filtered.filter(i => !i.completed || togglingIds.has(i.id))
  const completed = filtered.filter(i => i.completed && !togglingIds.has(i.id))
  const totalCost = getTotalCost(items)
  const budgetPct = weeklyBudget > 0 ? Math.min((totalCost / weeklyBudget) * 100, 100) : 0
  const catProgress = getCategoryProgress(items)
  const remaining = items.filter(i => !i.completed).length

  // Dynamic header title
  const headerTitle = useMemo(() => {
    if (activeCategory !== 'All Items') return `${activeCategory} List`
    if (filterStatus === 'completed') return 'Completed Items'
    if (filterStatus === 'pending') return 'Pending Items'
    return 'My Lists'
  }, [activeCategory, filterStatus])

  const statusText = useMemo(() => {
    const r = filtered.filter(i => !i.completed).length
    return `${r} item${r !== 1 ? 's' : ''} remaining — ${formatCurrency(totalCost)} spent of`
  }, [filtered, totalCost, formatCurrency])

  if (loading && items.length === 0) {
    return (
      <div style={{
        minHeight: '80dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1rem',
        color: 'var(--on-surface-variant)'
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid var(--surface-container-high)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Loading your list…</p>
      </div>
    )
  }

  return (
    <div className={isDesktop ? 'desktop-page-padding' : ''} style={{ padding: isDesktop ? undefined : '1rem 1rem 1.5rem', minHeight: isDesktop ? '100dvh' : undefined }}>
      {!isDesktop && <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}

      {/* ── Header ── */}
      <div className={isDesktop ? 'desktop-header' : ''} style={{ marginBottom: isDesktop ? 0 : '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!isDesktop && (
              <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface-variant)' }}>menu</span>
              </button>
            )}
            <h1 style={{ fontSize: isDesktop ? '1.5rem' : '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', transition: 'all 0.2s' }}>{headerTitle}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Collaborator Avatars */}
            <div className="avatar-stack">
              {collaborators.map((c, i) => (
                <div key={c.id} className="avatar" style={{ background: avatarColors[i % avatarColors.length] }}>{c.avatar}</div>
              ))}
            </div>
            <button onClick={() => setInviteOpen(true)} style={{
              width: 28, height: 28, borderRadius: '50%', border: '2px dashed var(--outline-variant)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-surface-variant)' }}>person_add</span>
            </button>
            <button onClick={() => setShowSearch(!showSearch)} style={{
              background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--primary)' }}>
                {showSearch ? 'close' : 'search'}
              </span>
            </button>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }} onClick={() => navigate('/settings')}>
              <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: 'var(--primary)' }}>person</span>
            </div>
          </div>
        </div>
        {/* Status line */}
        <div style={{
          fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 500,
          paddingLeft: '2.625rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
          flexWrap: 'wrap'
        }}>
          {statusText} <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{formatCurrency(weeklyBudget)}</span> budget {totalCost > weeklyBudget ? '⚠️' : ''}
        </div>
      </div>

      {/* ── Search Bar ── */}
      {showSearch && (
        <div className="search-bar animate-slide-up" style={{ marginBottom: '1rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--on-surface-variant)' }}>search</span>
          <input
            autoFocus
            type="text"
            placeholder="Search items…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>close</span>
            </button>
          )}
        </div>
      )}

      {/* ── Title ── */}
      <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{listName}</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
        {remaining} items remaining for this week.
      </p>

      {/* ── Sort + Filter Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div className="filter-pills" style={{ flex: 1 }}>
          {(['all', 'pending', 'completed'] as FilterStatus[]).map(f => (
            <button key={f} className={`filter-pill ${filterStatus === f ? 'active' : ''}`} onClick={() => setFilterStatus(f)}>
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Done'}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <button className="sort-btn" onClick={() => setShowSortMenu(!showSortMenu)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sort</span>
            Sort
          </button>
          {showSortMenu && (
            <div className="sort-dropdown">
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`sort-option ${sortBy === opt.value ? 'active' : ''}`}
                  onClick={() => { setSortBy(opt.value); setShowSortMenu(false) }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Export Button */}
        <button className="sort-btn" style={{ padding: '0.5rem' }} onClick={() => {
          const blob = generateListsCSV(filtered)
          downloadBlob(blob, `listify-export-${new Date().toISOString().split('T')[0]}.csv`)
          showToast('List exported successfully!', () => {})
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
        </button>
      </div>

      {/* ── Budget Card ── */}
      <div className="budget-card animate-slide-up" style={{ marginBottom: '1.25rem', opacity: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Weekly Budget</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {formatCurrency(totalCost)}
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--on-surface-variant)'}}> / {formatCurrency(weeklyBudget)}</span>
            </p>
          </div>
          <span style={{
            fontSize: '0.8125rem', fontWeight: 700,
            color: budgetPct > 90 ? 'var(--error)' : budgetPct > 70 ? 'var(--warning)' : 'var(--success)',
          }}>
            {weeklyBudget > 0 ? `${budgetPct.toFixed(0)}%` : 'No budget set'}
          </span>
        </div>
        <div className="budget-bar-track">
          <div className="budget-bar-fill" style={{
            width: `${budgetPct}%`,
            background: budgetPct > 90 ? 'var(--error)' : budgetPct > 70 ? 'var(--warning)' : 'var(--primary)',
          }} />
        </div>
      </div>

      {/* ── Category Chips ── */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.25rem', paddingBottom: '0.25rem' }}>
        {categories.map(c => (
          <button key={c} className={`chip ${activeCategory === c ? 'chip-active' : 'chip-inactive'}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* ── Category Progress ── */}
      {activeCategory === 'All Items' && (
        <div className="card animate-slide-up" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', opacity: 0, animationDelay: '0.05s' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '0.625rem' }}>Progress by Category</p>
          {catProgress.map(cp => (
            <div key={cp.category} className="category-progress-row">
              <span className="category-progress-label">{cp.category}</span>
              <div style={{ flex: 1 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${cp.pct}%` }} />
                </div>
              </div>
              <span className="category-progress-pct">{cp.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Items List ── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3, marginBottom: '0.5rem' }}>checklist</span>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>No items found</p>
          <p style={{ fontSize: '0.8125rem', opacity: 0.7 }}>Try a different filter or search term</p>
        </div>
      )}

      {/* Pending / Main List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={(filterStatus === 'all' ? filtered : filterStatus === 'completed' ? completed : pending).map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {(filterStatus === 'all' ? filtered : filterStatus === 'completed' ? completed : pending).map((item, i) => (
              <SortableItem
                key={item.id}
                item={item}
                onToggle={() => handleToggle(item.id)}
                onDelete={() => handleDelete(item)}
                onUpdateQty={(qty: number) => updateQuantity(item.id, qty)}
                onUpdateItem={(partial: Partial<ListItem>) => updateItem(item.id, partial)}
                onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                expanded={expandedId === item.id}
                collaborators={collaborators}
                showDragHandle={sortBy === 'manual' && filterStatus !== 'completed'}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Completed (only separated if NOT in 'all' mode) */}
      {completed.length > 0 && filterStatus !== 'all' && filterStatus !== 'completed' && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            margin: '1.25rem 0 0.75rem', padding: '0 0.25rem',
          }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)' }}>
              Completed ({completed.length})
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--outline-variant)', opacity: 0.3 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {completed.map(item => (
              <div key={item.id} style={{ opacity: 0.6 }}>
                <SwipeItem
                  item={item}
                  onToggle={() => toggleItem(item.id)}
                  onDelete={() => removeItem(item.id)}
                  onUpdateQty={(qty) => updateQuantity(item.id, qty)}
                  onUpdateItem={(partial) => updateItem(item.id, partial)}
                  onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  expanded={expandedId === item.id}
                  collaborators={collaborators}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Clear Completed ── */}
      {completed.length > 0 && (
        <button onClick={handleClearCompleted} className="btn-secondary" style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '1rem', borderRadius: '1rem', fontSize: '0.9375rem', marginBottom: '1rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete_sweep</span>
          Clear Completed
        </button>
      )}

      {/* ── FAB ── */}
      <button onClick={() => navigate('/planner')} className={isDesktop ? 'desktop-fab' : ''} style={{
        position: 'fixed', bottom: isDesktop ? '2rem' : 'calc(var(--nav-height) + 1rem)', right: isDesktop ? '2rem' : '1rem',
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
        color: 'white', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px color-mix(in srgb, var(--primary) 30%, transparent)',
        transition: 'transform 0.2s ease', zIndex: 50,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add</span>
      </button>

      {/* ── Invite Modal ── */}
      {inviteOpen && (
        <>
          <div onClick={() => setInviteOpen(false)} style={{
            position: 'fixed', inset: 0, zIndex: 900,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'fixed', bottom: '10%', left: '50%', transform: 'translateX(-50%)',
            width: 'min(380px, calc(100vw - 2rem))', zIndex: 901,
            background: 'var(--surface-container-lowest)',
            borderRadius: '1.25rem', padding: '1.5rem',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Invite Collaborator</h3>
              <button onClick={() => setInviteOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--on-surface-variant)' }}>close</span>
              </button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Enter an email to invite someone to collaborate on this list.
            </p>
            <input
              className="ios-input"
              placeholder="Email address"
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '0.75rem', fontSize: '0.9375rem', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            {inviteResult && (
              <p style={{
                fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem',
                color: inviteResult.includes('sent') ? 'var(--success)' : 'var(--error)',
              }}>{inviteResult}</p>
            )}
            <button
              onClick={handleInvite}
              disabled={inviteSending || !inviteEmail.trim()}
              className="btn-primary"
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '0.875rem', fontSize: '0.9375rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                opacity: inviteSending || !inviteEmail.trim() ? 0.5 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {inviteSending ? 'progress_activity' : 'send'}
              </span>
              {inviteSending ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </>
      )}

      {/* ── Undo Toast ── */}
      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={handleUndo}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  )
}
