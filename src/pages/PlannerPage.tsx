import { useState, useMemo, useEffect } from 'react'
import { useListStore, getTotalCost } from '../stores/list'
import type { Recurring } from '../stores/list'
import { useNavigate } from 'react-router-dom'
import { useCalendarStore } from '../stores/calendar'
import { useAssistantStore } from '../stores/assistant'
import { useCurrency } from '../hooks/useCurrency'
import { useIsDesktop } from '../hooks/useMediaQuery'

const plannerCategories = ['Produce', 'Dairy', 'Pantry', 'Bakery']
const tags = ['Grocery', 'Work', 'Health', 'Personal']
const recurringOptions: { label: string; value: Recurring['interval'] | null }[] = [
  { label: 'None', value: null },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
]

const defaultAiSuggestions = [
  { name: 'Oat Milk', category: 'Dairy', price: 4.99, reason: 'Added 3 of last 4 weeks', icon: 'local_cafe' },
  { name: 'Bananas', category: 'Produce', price: 0.69, reason: 'You buy this weekly', icon: 'nutrition' },
  { name: 'Chicken Breast', category: 'Produce', price: 8.99, reason: 'Popular in your area', icon: 'restaurant' },
  { name: 'Brown Rice', category: 'Pantry', price: 3.49, reason: 'Pairs with recent purchases', icon: 'rice_bowl' },
  { name: 'Greek Yogurt', category: 'Dairy', price: 3.99, reason: 'Ran out last Tuesday', icon: 'icecream' },
]

const avatarColors = ['#0058bc', '#9e3d00', '#405e96', '#34c759']

export default function PlannerPage() {
  const navigate = useNavigate()
  const { addItem, items, weeklyBudget, collaborators } = useListStore()
  const { events, fetchEvents, lastSync } = useCalendarStore()
  const { suggestions, fetchSuggestions } = useAssistantStore()
  const { formatCurrency, currencySymbol } = useCurrency()
  const isDesktop = useIsDesktop()

  // Fetch calendar events and AI suggestions
  useEffect(() => {
    fetchEvents()
    fetchSuggestions()
  }, [])

  // Merge backend suggestions with defaults
  const aiSuggestions = useMemo(() => {
    const backendSuggestions = suggestions
      .filter(s => s.status === 'pending' && s.action_type === 'add_item')
      .slice(0, 3)
      .map(s => ({
        name: (s.action_data as any)?.name || s.title,
        category: (s.action_data as any)?.category || 'General',
        price: (s.action_data as any)?.price || 0,
        reason: s.body,
        icon: 'auto_awesome',
      }))
    return backendSuggestions.length > 0
      ? [...backendSuggestions, ...defaultAiSuggestions.slice(0, 5 - backendSuggestions.length)]
      : defaultAiSuggestions
  }, [suggestions])

  // Form state
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState('Produce')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState('')
  const [priority, setPriority] = useState(false)
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState<Recurring['interval'] | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [assignee, setAssignee] = useState('')
  const [tag, setTag] = useState('Grocery')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  // Budget
  const currentSpend = getTotalCost(items)
  const priceNum = parseFloat(price) || 0
  const itemCost = priceNum * quantity
  const projectedSpend = currentSpend + itemCost
  const budgetPct = weeklyBudget > 0 ? Math.min((currentSpend / weeklyBudget) * 100, 100) : 0
  const projectedPct = weeklyBudget > 0 ? Math.min((projectedSpend / weeklyBudget) * 100, 100) : 0
  const overBudget = weeklyBudget > 0 && projectedSpend > weeklyBudget && itemCost > 0

  // AI suggestions filtered to not already in list
  const existingNames = useMemo(() => new Set(items.map(i => i.name.toLowerCase())), [items])
  const filteredSuggestions = aiSuggestions.filter(s => !existingNames.has(s.name.toLowerCase()))

  const reset = () => {
    setItemName(''); setQuantity(1); setPrice(''); setPriority(false)
    setNotes(''); setRecurring(null); setDueDate(''); setAssignee('')
  }

  const handleAdd = () => {
    if (!itemName.trim()) return
    addItem({
      name: itemName.trim(),
      category,
      quantity,
      priority,
      price: priceNum || undefined,
      notes: notes.trim() || undefined,
      recurring: recurring ? { interval: recurring } : undefined,
      dueDate: dueDate || undefined,
      addedBy: assignee || undefined,
    })
    setJustAdded(itemName.trim())
    setTimeout(() => setJustAdded(null), 2000)
    reset()
  }

  const handleQuickAdd = (s: typeof aiSuggestions[0]) => {
    addItem({
      name: s.name,
      category: s.category,
      quantity: 1,
      price: s.price,
      priority: false,
    })
    setJustAdded(s.name)
    setTimeout(() => setJustAdded(null), 2000)
  }

  const fieldLabel = (text: string) => (
    <label style={{
      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em',
      textTransform: 'uppercase' as const, color: 'var(--on-surface-variant)',
      display: 'block', marginBottom: '0.5rem',
    }}>{text}</label>
  )

  return (
    <div className={isDesktop ? 'desktop-page-padding' : ''} style={{ padding: isDesktop ? undefined : '1rem 1rem 1.5rem', minHeight: isDesktop ? '100dvh' : undefined }}>
      {/* ── Header ── */}
      <div className={isDesktop ? 'desktop-header' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDesktop ? 0 : '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!isDesktop && (
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface)' }}>arrow_back</span>
            </button>
          )}
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--tertiary), var(--tertiary-container))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: 'white' }}>rocket_launch</span>
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>Planner</span>
        </div>
        <button onClick={() => navigate('/lists')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          color: 'var(--primary)', fontWeight: 600, fontSize: '0.8125rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>checklist</span>
          View List
        </button>
      </div>

      {/* ── Success Toast ── */}
      {justAdded && (
        <div className="animate-slide-up" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: 'color-mix(in srgb, var(--success) 12%, var(--surface-container-lowest))',
          borderRadius: '0.75rem', border: '1px solid color-mix(in srgb, var(--success) 20%, transparent)',
        }}>
          <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: 'var(--success)' }}>check_circle</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--success)' }}>
            "{justAdded}" added to your list
          </span>
        </div>
      )}

      {/* ── Desktop grid wrapper (form + suggestions) ── */}
      <div className="desktop-planner-grid">
      {/* ── Item Form ── */}
      <div className="card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1.25rem', opacity: 0 }}>
        {fieldLabel('Item Name')}
        <input
          className="ios-input" placeholder="What do you need?"
          value={itemName} onChange={e => setItemName(e.target.value)}
          style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '0.75rem', fontSize: '0.9375rem', marginBottom: '1.25rem', boxSizing: 'border-box' }}
        />

        {fieldLabel('Category')}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {plannerCategories.map(c => (
            <button key={c} className={`chip ${category === c ? 'chip-active' : 'chip-inactive'}`}
              onClick={() => setCategory(c)} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}>
              {c}
            </button>
          ))}
        </div>

        {/* Quantity + Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            {fieldLabel('Quantity')}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              background: 'var(--surface-container-high)', borderRadius: '0.75rem', padding: '0.375rem',
            }}>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{
                width: 36, height: 36, borderRadius: '0.5rem', border: 'none',
                background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 700,
              }}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '1.0625rem' }}>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} style={{
                width: 36, height: 36, borderRadius: '0.5rem', border: 'none',
                background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 700,
              }}>+</button>
            </div>
          </div>
          <div>
            {fieldLabel('Price')}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{currencySymbol}</span>
              <input className="ios-input" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 1.75rem', borderRadius: '0.75rem', fontSize: '0.9375rem', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Priority + Tag row */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button onClick={() => setPriority(!priority)} style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 0.875rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
            background: priority ? 'color-mix(in srgb, var(--warning) 15%, var(--surface-container-lowest))' : 'var(--surface-container-high)',
            color: priority ? 'var(--warning)' : 'var(--on-surface-variant)',
            fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.2s',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 16 }}>flag</span>
            {priority ? 'High Priority' : 'Priority'}
          </button>
          <div style={{ flex: 1 }} />
          {tags.map(t => (
            <button key={t} onClick={() => setTag(t)} style={{
              padding: '0.375rem 0.625rem', borderRadius: '0.5rem', border: 'none',
              background: tag === t ? 'var(--primary)' : 'transparent',
              color: tag === t ? 'var(--on-primary)' : 'var(--on-surface-variant)',
              fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            }}>{t}</button>
          ))}
        </div>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600,
          marginBottom: showAdvanced ? '1rem' : '1.25rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, transition: 'transform 0.3s', transform: showAdvanced ? 'rotate(180deg)' : 'none' }}>expand_more</span>
          {showAdvanced ? 'Less options' : 'More options'}
        </button>

        {/* Advanced fields */}
        {showAdvanced && (
          <div className="animate-slide-up" style={{ marginBottom: '1.25rem' }}>
            {/* Recurring */}
            {fieldLabel('Recurring')}
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {recurringOptions.map(r => (
                <button key={r.label} onClick={() => setRecurring(r.value)}
                  className={`chip ${recurring === r.value ? 'chip-active' : 'chip-inactive'}`}
                  style={{ padding: '0.3125rem 0.75rem', fontSize: '0.75rem' }}>
                  {r.value && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>repeat</span>}
                  {r.label}
                </button>
              ))}
            </div>

            {/* Due date */}
            {fieldLabel('Due Date')}
            <input type="date" className="ios-input" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box' }} />

            {/* Notes */}
            {fieldLabel('Notes')}
            <textarea className="ios-input" placeholder="Add a note or brand preference…" value={notes} onChange={e => setNotes(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit' }} />

            {/* Assign to */}
            {fieldLabel('Assign To')}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {collaborators.map((c, ci) => (
                <button key={c.id} onClick={() => setAssignee(assignee === c.id ? '' : c.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.875rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  background: assignee === c.id ? 'color-mix(in srgb, var(--primary) 12%, var(--surface-container-lowest))' : 'var(--surface-container-high)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: avatarColors[ci % avatarColors.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.5rem', fontWeight: 800, color: 'white',
                  }}>{c.avatar}</div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: assignee === c.id ? 'var(--primary)' : 'var(--on-surface)' }}>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Budget warning */}
        {overBudget && (
          <div className="animate-slide-up" style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1rem', marginBottom: '1rem',
            background: 'color-mix(in srgb, var(--warning) 10%, var(--surface-container-lowest))',
            borderRadius: '0.75rem', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: 'var(--warning)' }}>warning</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--warning)' }}>
              Adding this exceeds your {formatCurrency(weeklyBudget)} weekly budget by {formatCurrency(projectedSpend - weeklyBudget)}
            </span>
          </div>
        )}

        {/* Add Button */}
        <button onClick={handleAdd} className="btn-primary" style={{
          width: '100%', padding: '1rem', borderRadius: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          opacity: itemName.trim() ? 1 : 0.5, pointerEvents: itemName.trim() ? 'auto' : 'none',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_task</span>
          Add to List {itemCost > 0 && `• ${formatCurrency(itemCost)}`}
        </button>
      </div>

      {/* ── AI Suggestions ── */}
      {filteredSuggestions.length > 0 && (
        <div className="animate-slide-up" style={{ opacity: 0, animationDelay: '0.1s', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: 'var(--primary)' }}>auto_awesome</span>
            <h3 style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>
              Suggested for You
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {filteredSuggestions.map(s => (
              <div key={s.name} className="card" style={{
                minWidth: 160, padding: '1rem', flexShrink: 0,
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'var(--surface-container-high)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>{s.icon}</span>
                  </div>
                  <button onClick={() => handleQuickAdd(s)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                  }}>
                    <span className="material-symbols-outlined filled" style={{ fontSize: 24, color: 'var(--primary)' }}>add_circle</span>
                  </button>
                </div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.name}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', lineHeight: 1.3 }}>{s.reason}</p>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(s.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>{/* end desktop-planner-grid */}

      {/* ── Budget Summary ── */}
      <div className="budget-card animate-slide-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
              Remaining Budget
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {formatCurrency(Math.max(0, weeklyBudget - currentSpend))}
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--on-surface-variant)'}}> left of {formatCurrency(weeklyBudget)}</span>
            </p>
          </div>
          <span style={{
            fontSize: '0.8125rem', fontWeight: 700,
            color: budgetPct > 90 ? 'var(--error)' : budgetPct > 70 ? 'var(--warning)' : 'var(--success)',
          }}>
            {weeklyBudget > 0 ? `${(100 - budgetPct).toFixed(0)}% left` : 'No budget set'}
          </span>
        </div>
        <div className="budget-bar-track">
          <div className="budget-bar-fill" style={{
            width: `${budgetPct}%`,
            background: budgetPct > 90 ? 'var(--error)' : budgetPct > 70 ? 'var(--warning)' : 'var(--primary)',
          }} />
        </div>
        {itemCost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.625rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>After adding this item:</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: overBudget ? 'var(--error)' : 'var(--on-surface)' }}>
              {formatCurrency(projectedSpend)} ({projectedPct.toFixed(0)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
