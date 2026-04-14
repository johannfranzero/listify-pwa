import { useState, useRef, useEffect, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListStore } from '../stores/list'
import { useCurrency } from '../hooks/useCurrency'

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

interface SearchResult {
  type: 'item' | 'page'
  icon: string
  title: string
  subtitle: string
  route: string
}

const pages: SearchResult[] = [
  { type: 'page', icon: 'dashboard', title: 'Dashboard', subtitle: 'Overview & stats', route: '/dashboard' },
  { type: 'page', icon: 'checklist', title: 'Lists', subtitle: 'Manage your items', route: '/lists' },
  { type: 'page', icon: 'rocket_launch', title: 'Planner', subtitle: 'Plan & schedule', route: '/planner' },
  { type: 'page', icon: 'insights', title: 'Insights', subtitle: 'Analytics & trends', route: '/insights' },
  { type: 'page', icon: 'auto_awesome', title: 'Assistant', subtitle: 'AI help', route: '/assistant' },
  { type: 'page', icon: 'settings', title: 'Settings', subtitle: 'Preferences', route: '/settings' },
]

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate()
  const { items } = useListStore()
  const { formatCurrency } = useCurrency()
  const [query, setQuery] = useState('')
  const [deferredQuery, setDeferredQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setDeferredQuery('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (!open) onClose() // toggle via parent
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const lower = deferredQuery.toLowerCase()
  const matchedItems: SearchResult[] = deferredQuery.length > 0
    ? items
      .filter(i => i.name.toLowerCase().includes(lower) || i.category.toLowerCase().includes(lower))
      .slice(0, 5)
      .map(i => ({
        type: 'item' as const,
        icon: i.completed ? 'check_circle' : 'shopping_cart',
        title: i.name,
        subtitle: `${i.category} • ${i.completed ? 'Done' : 'Pending'}${i.price ? ` • ${formatCurrency(i.price)}` : ''}`,
        route: '/lists',
      }))
    : []

  const matchedPages = deferredQuery.length > 0
    ? pages.filter(p => p.title.toLowerCase().includes(lower) || p.subtitle.toLowerCase().includes(lower))
    : pages

  const results = [...matchedItems, ...matchedPages]

  const handleSelect = (r: SearchResult) => {
    onClose()
    navigate(r.route)
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 997,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease',
      }} />
      <div style={{
        position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(440px, calc(100vw - 2rem))', zIndex: 998,
        background: 'var(--surface-container-lowest)',
        borderRadius: '1.25rem',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        animation: 'slideDownPanel 0.2s ease',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--on-surface-variant)' }}>search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              startTransition(() => {
                setDeferredQuery(e.target.value)
              })
            }}
            placeholder="Search items, pages…"
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: '1rem', fontWeight: 500, color: 'var(--on-surface)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            padding: '0.125rem 0.375rem', borderRadius: '0.25rem',
            border: '1px solid var(--outline-variant)', fontSize: '0.625rem',
            color: 'var(--on-surface-variant)', fontWeight: 600,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '0.5rem' }}>
          {results.length === 0 && query.length > 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)' }}>
              <p style={{ fontSize: '0.875rem' }}>No results for "{query}"</p>
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.title}-${i}`}
                onClick={() => handleSelect(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  textAlign: 'left', transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-container-high)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: r.type === 'item'
                    ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                    : 'color-mix(in srgb, var(--secondary) 10%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: 16, color: r.type === 'item' ? 'var(--primary)' : 'var(--secondary)',
                  }}>{r.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)' }}>{r.title}</p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>{r.subtitle}</p>
                </div>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--on-surface-variant)', opacity: 0.5,
                }}>{r.type}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
