import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useListStore } from '../stores/list'
import { useSettingsStore } from '../stores/settings'
import { useCurrency } from '../hooks/useCurrency'
import ListifyLogo from '../components/ListifyLogo'

const focusOptions = [
  { id: 'grocery', icon: 'shopping_cart', label: 'Grocery', color: '#34c759' },
  { id: 'work', icon: 'work', label: 'Work', color: '#007aff' },
  { id: 'health', icon: 'favorite', label: 'Health', color: '#ff2d55' },
  { id: 'personal', icon: 'person', label: 'Personal', color: '#af52de' },
]

const TOTAL_STEPS = 5

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, completeOnboarding } = useAuthStore()
  const { addItem } = useListStore()
  const { updateSetting } = useSettingsStore()
  const { currencySymbol } = useCurrency()
  const [step, setStep] = useState(0)
  const [selectedFocus, setSelectedFocus] = useState<Set<string>>(new Set())
  const [demoItem, setDemoItem] = useState('')
  const [demoAdded, setDemoAdded] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const handleSkip = () => {
    completeOnboarding()
    navigate('/dashboard')
  }

  const handleFinish = () => {
    if (user?.id && budgetInput) {
      updateSetting(user.id, 'weekly_budget', Number(budgetInput) || 0).catch(console.error)
    }
    completeOnboarding()
    navigate('/dashboard')
  }

  const next = useCallback(() => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1)
    else handleFinish()
  }, [step])

  const handleDemoAdd = () => {
    const name = demoItem.trim() || 'Milk'
    addItem({ name, category: 'Dairy', quantity: 1, price: 3.49 })
    setDemoAdded(true)
  }

  // ── Step content ──

  const renderStep0 = () => (
    <div className="animate-fade-in" style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <ListifyLogo size="lg" showTagline />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { icon: 'checklist', title: 'Smart Lists', desc: 'Organize by category with search, sort & filters', color: 'var(--primary)' },
          { icon: 'rocket_launch', title: 'Planner', desc: 'Plan items, set recurring, track budget', color: 'var(--tertiary)' },
          { icon: 'insights', title: 'Insights', desc: 'Charts, trends, AI tips for smarter spending', color: '#ff9500' },
          { icon: 'auto_awesome', title: 'AI Assistant', desc: 'Context-aware help across all your lists', color: '#af52de' },
        ].map((f, i) => (
          <div key={f.title} className="card animate-slide-up" style={{
            textAlign: 'center', padding: '1.25rem 0.75rem', opacity: 0,
            animationDelay: `${0.15 + i * 0.08}s`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `color-mix(in srgb, ${f.color} 12%, var(--surface-container-lowest))`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '0.625rem',
            }}>
              <span className="material-symbols-outlined filled" style={{ fontSize: 22, color: f.color }}>{f.icon}</span>
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem' }}>{f.title}</h3>
            <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.625rem 1rem', borderRadius: '0.75rem',
        background: 'color-mix(in srgb, var(--primary) 5%, var(--surface-container-lowest))',
        marginBottom: '0.5rem',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>cloud_sync</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Syncs across devices • Offline support • Collaboration</span>
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 1rem',
          background: 'linear-gradient(135deg, var(--primary), var(--tertiary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined filled" style={{ fontSize: 28, color: 'white' }}>add_task</span>
        </div>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
          Try adding an item
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
          See how it flows into your List, Planner & Insights
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <input
          className="ios-input"
          placeholder='Try "Milk" or any item…'
          value={demoItem}
          onChange={e => { setDemoItem(e.target.value); setDemoAdded(false) }}
          style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '0.75rem', fontSize: '0.9375rem', marginBottom: '1rem', boxSizing: 'border-box' }}
        />
        <button onClick={handleDemoAdd} className="btn-primary" style={{
          width: '100%', padding: '0.875rem', borderRadius: '0.875rem', fontSize: '0.9375rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
          Add to List
        </button>
      </div>

      {demoAdded && (
        <div className="animate-slide-up" style={{ opacity: 0 }}>
          <div className="card" style={{
            display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem',
            background: 'color-mix(in srgb, var(--success) 6%, var(--surface-container-lowest))',
            border: '1px solid color-mix(in srgb, var(--success) 15%, transparent)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: 'var(--success)' }}>check_circle</span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--success)' }}>
                "{demoItem.trim() || 'Milk'}" added!
              </span>
            </div>
            {[
              { icon: 'checklist', text: 'Appears in your Smart List with price & category' },
              { icon: 'rocket_launch', text: 'Ready in the Planner for scheduling' },
              { icon: 'insights', text: 'Tracked in Insights for budget analysis' },
            ].map(r => (
              <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.25rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>{r.icon}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 1rem',
          background: 'linear-gradient(135deg, #af52de, #ff2d55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined filled" style={{ fontSize: 28, color: 'white' }}>tune</span>
        </div>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
          What's your focus?
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
          Select all that apply — we'll tailor your experience
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {focusOptions.map(fo => {
          const active = selectedFocus.has(fo.id)
          return (
            <button key={fo.id} onClick={() => {
              const next = new Set(selectedFocus)
              active ? next.delete(fo.id) : next.add(fo.id)
              setSelectedFocus(next)
            }} className="card" style={{
              padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer',
              border: active ? `2px solid ${fo.color}` : '2px solid transparent',
              background: active ? `color-mix(in srgb, ${fo.color} 8%, var(--surface-container-lowest))` : undefined,
              transition: 'all 0.25s ease',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: '0 auto 0.75rem',
                background: `color-mix(in srgb, ${fo.color} 15%, var(--surface-container-lowest))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.25s ease',
                transform: active ? 'scale(1.1)' : 'scale(1)',
              }}>
                <span className="material-symbols-outlined filled" style={{ fontSize: 24, color: fo.color }}>{fo.icon}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{fo.label}</span>
              {active && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: fo.color }}>check_circle</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 1rem',
          background: 'linear-gradient(135deg, #ff9500, #ffcc00)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined filled" style={{ fontSize: 28, color: 'white' }}>savings</span>
        </div>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
          Set your budget
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
          We'll help you stay on track each week
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>{currencySymbol}</span>
          <input
            type="number"
            className="ios-input"
            placeholder="0"
            value={budgetInput}
            onChange={e => setBudgetInput(e.target.value)}
            style={{
              width: '120px', padding: '0.5rem', fontSize: '2rem', fontWeight: 800,
              textAlign: 'center', borderBottom: '2px solid var(--primary)', borderRadius: 0,
              background: 'transparent'
            }}
          />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Weekly Target Amount</p>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{
        width: 80, height: 80, borderRadius: 22, margin: '0 auto 1.5rem',
        background: 'linear-gradient(135deg, var(--success), #34c759)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px color-mix(in srgb, var(--success) 30%, transparent)',
      }}>
        <span className="material-symbols-outlined filled" style={{ fontSize: 40, color: 'white' }}>celebration</span>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
        You're all set! 🎉
      </h2>
      <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', marginBottom: '2rem', lineHeight: 1.6 }}>
        Your first list is ready. Start adding items, plan your week, and let the AI assistant help you stay on track.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { icon: 'checklist', text: 'Smart Lists — search, sort, swipe', color: 'var(--primary)' },
          { icon: 'account_balance_wallet', text: 'Budget tracking — real-time alerts', color: '#ff9500' },
          { icon: 'group', text: 'Collaboration — share & assign', color: '#007aff' },
          { icon: 'auto_awesome', text: 'AI Assistant — context-aware help', color: '#af52de' },
        ].map(b => (
          <div key={b.text} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1rem', borderRadius: '0.875rem',
            background: 'var(--surface-container-low)',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: b.color }}>{b.icon}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4]
  const isLastStep = step === TOTAL_STEPS - 1
  const canProceed = step !== 2 || selectedFocus.size > 0

  return (
    <div className="desktop-onboarding-container" style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      padding: '2rem 1.5rem 1.5rem', background: 'var(--surface)',
      maxWidth: 480, margin: '0 auto',
    }}>
      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={handleSkip} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--on-surface-variant)', fontSize: '0.875rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.25rem',
        }}>
          Skip
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
        </button>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem' }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? 'var(--primary)' : 'var(--surface-container-high)',
            transition: 'background 0.3s ease',
          }} />
        ))}
      </div>
      <p style={{
        fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em',
        textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '1rem',
      }}>
        Step {step + 1} of {TOTAL_STEPS}
      </p>

      {/* Content */}
      {steps[step] && steps[step]!()}

      {/* Navigation */}
      <div style={{ marginTop: '1.5rem' }}>
        <button onClick={next} disabled={!canProceed} className="btn-primary" style={{
          width: '100%', padding: '1.125rem', fontSize: '1.0625rem', borderRadius: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          opacity: canProceed ? 1 : 0.5, transition: 'opacity 0.2s',
        }}>
          {isLastStep ? (
            <>Let's Go <span className="material-symbols-outlined" style={{ fontSize: 20 }}>rocket_launch</span></>
          ) : (
            <>Continue <span style={{ fontSize: '1.25rem' }}>→</span></>
          )}
        </button>

        {step > 0 && (
          <button onClick={() => setStep(step - 1)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
            width: '100%', marginTop: '0.75rem', padding: '0.75rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--on-surface-variant)', fontSize: '0.875rem', fontWeight: 600,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Back
          </button>
        )}
      </div>
    </div>
  )
}
