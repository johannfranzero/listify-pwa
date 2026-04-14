import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SUPABASE_URL, SUPABASE_ANON_KEY, getAuthenticatedClient } from '../lib/supabase'
import { useIsDesktop } from '../hooks/useMediaQuery'

const feedbackCategories = [
  { icon: 'bug_report', label: 'Bug Report', color: 'var(--error)' },
  { icon: 'lightbulb', label: 'Feature Request', color: 'var(--tertiary)' },
  { icon: 'thumb_up', label: 'General Feedback', color: 'var(--primary)' },
  { icon: 'speed', label: 'Performance', color: '#ff9500' },
  { icon: 'palette', label: 'Design', color: '#af52de' },
  { icon: 'help', label: 'Question', color: '#34c759' },
]

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return
    try {
      const client = await getAuthenticatedClient()
      const token = (client as any).rest?.headers?.Authorization
      await fetch(`${SUPABASE_URL}/functions/v1/notifications-push`, {
        method: 'POST',
        headers: {
          'Authorization': token || `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'system',
          title: `User Feedback${selectedCategory ? ` — ${selectedCategory}` : ''}`,
          body: `${rating > 0 ? `Rating: ${rating}/5 — ` : ''}${feedback.trim()}`,
        }),
      })
    } catch {
      // Still show success — feedback is best-effort
    }
    setSubmitted(true)
    setTimeout(() => navigate(isDesktop ? '/dashboard' : '/settings'), 2500)
  }

  // ── Desktop Layout ──
  if (isDesktop) {
    return (
      <div className="desktop-page-padding" style={{ minHeight: '100dvh' }}>
        {/* Header */}
        <div className="desktop-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Feedback</h1>
        </div>

        {submitted ? (
          <div className="animate-slide-up" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'color-mix(in srgb, var(--success) 15%, var(--surface-container-lowest))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <span className="material-symbols-outlined filled" style={{ fontSize: 40, color: 'var(--success)' }}>check_circle</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Thank you!</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '1rem', maxWidth: 400, margin: '0 auto' }}>
              Your feedback helps us improve LISTIFY. We'll review it shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left Column — Main feedback */}
              <div>
                {/* Rating */}
                <div className="card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1.25rem', opacity: 0 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>How's your experience?</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => setRating(star === rating ? 0 : star)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '0.375rem', transition: 'transform 0.15s',
                          transform: (hoveredStar >= star || rating >= star) ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        <span className={`material-symbols-outlined ${(hoveredStar >= star || rating >= star) ? 'filled' : ''}`}
                          style={{
                            fontSize: 36,
                            color: (hoveredStar >= star || rating >= star) ? '#ff9500' : 'var(--outline-variant)',
                            transition: 'color 0.15s',
                          }}
                        >star</span>
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                      {rating <= 2 ? "We'll work on it!" : rating <= 4 ? 'Thanks for the rating!' : 'Awesome, glad you love it!'}
                    </p>
                  )}
                </div>

                {/* Feedback Text */}
                <div className="card animate-slide-up stagger-1" style={{ padding: '1.5rem', marginBottom: '1.25rem', opacity: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span className="material-symbols-outlined filled" style={{ fontSize: 24, color: 'var(--primary)' }}>rate_review</span>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Share your thoughts</h3>
                  </div>
                  <textarea
                    placeholder="Tell us what you think about LISTIFY, report a bug, or suggest a feature..."
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    rows={8}
                    style={{
                      width: '100%', padding: '1rem',
                      background: 'var(--surface-container-high)',
                      border: '1px solid transparent', borderRadius: '0.75rem',
                      resize: 'vertical', fontFamily: 'inherit',
                      fontSize: '0.9375rem', color: 'var(--on-surface)',
                      boxSizing: 'border-box', outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'transparent'}
                  />
                </div>

                {/* Submit */}
                <button type="submit" className="btn-primary animate-slide-up stagger-2" disabled={!feedback.trim()} style={{
                  width: '100%', padding: '1rem', borderRadius: '1rem', fontSize: '1rem',
                  opacity: feedback.trim() ? 1 : 0.5, transition: 'opacity 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                  Submit Feedback
                </button>
              </div>

              {/* Right Column — Category & attachment */}
              <div>
                {/* Category Selection */}
                <div className="card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1.25rem', opacity: 0, animationDelay: '0.1s' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Category</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {feedbackCategories.map(cat => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setSelectedCategory(selectedCategory === cat.label ? null : cat.label)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.75rem 1rem', borderRadius: '0.75rem',
                          border: selectedCategory === cat.label ? `2px solid ${cat.color}` : '2px solid var(--surface-container-high)',
                          background: selectedCategory === cat.label ? `color-mix(in srgb, ${cat.color} 8%, var(--surface-container-lowest))` : 'var(--surface-container-lowest)',
                          cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: cat.color }}>{cat.icon}</span>
                        <span style={{
                          fontSize: '0.8125rem', fontWeight: 600,
                          color: selectedCategory === cat.label ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                        }}>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Screenshot Upload */}
                <div className="card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1.25rem', opacity: 0, animationDelay: '0.15s' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Attachment</h3>
                  <div style={{
                    padding: '2rem',
                    border: '2px dashed var(--outline-variant)', borderRadius: '0.75rem',
                    textAlign: 'center', cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>add_a_photo</span>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                      Drag & drop or click to upload
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', opacity: 0.6 }}>PNG, JPG up to 5MB</p>
                  </div>
                </div>

                {/* Tips Card */}
                <div className="card animate-slide-up" style={{ padding: '1.5rem', opacity: 0, animationDelay: '0.2s',
                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 5%, var(--surface-container-lowest)), color-mix(in srgb, var(--tertiary) 3%, var(--surface-container-lowest)))',
                  border: '1px solid color-mix(in srgb, var(--primary) 10%, transparent)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: 'var(--primary)' }}>tips_and_updates</span>
                    <h4 style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--primary)' }}>Feedback Tips</h4>
                  </div>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {[
                      'Be specific about what happened',
                      'Include steps to reproduce bugs',
                      'Screenshots help us understand faster',
                      'Feature ideas are always welcome!',
                    ].map(tip => (
                      <li key={tip} style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    )
  }

  // ── Mobile Layout ──
  return (
    <div style={{ padding: '1rem 1rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface)' }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Feedback</h1>
      </div>

      {submitted ? (
        <div className="animate-slide-up" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--success) 15%, var(--surface-container-lowest))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 32, color: 'var(--success)' }}>check_circle</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Thank you!</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Your feedback helps us improve LISTIFY.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Rating */}
          <div className="card animate-slide-up" style={{ padding: '1.25rem', marginBottom: '1rem', opacity: 0, textAlign: 'center' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>How's your experience?</h3>
            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? 0 : star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <span className={`material-symbols-outlined ${rating >= star ? 'filled' : ''}`}
                    style={{ fontSize: 32, color: rating >= star ? '#ff9500' : 'var(--outline-variant)' }}
                  >star</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', marginBottom: '1rem', paddingBottom: '0.25rem' }}>
            {feedbackCategories.map(cat => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat.label ? null : cat.label)}
                className="chip"
                style={{
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem',
                  background: selectedCategory === cat.label ? `color-mix(in srgb, ${cat.color} 15%, var(--surface-container-lowest))` : undefined,
                  border: selectedCategory === cat.label ? `1.5px solid ${cat.color}` : undefined,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: cat.color }}>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1rem', opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <span className="material-symbols-outlined filled" style={{ fontSize: 28, color: 'var(--primary)' }}>rate_review</span>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Share your thoughts</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>We'd love to hear from you</p>
              </div>
            </div>

            <textarea
              placeholder="Tell us what you think about LISTIFY, report a bug, or suggest a feature..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={6}
              style={{
                width: '100%', padding: '1rem',
                background: 'var(--surface-container-high)',
                border: 'none', borderRadius: '0.75rem',
                resize: 'vertical', fontFamily: 'inherit',
                fontSize: '0.9375rem', color: 'var(--on-surface)',
                boxSizing: 'border-box', outline: 'none',
              }}
            />

            {/* Screenshot Upload */}
            <div style={{
              marginTop: '1rem', padding: '1.25rem',
              border: '2px dashed var(--outline-variant)', borderRadius: '0.75rem',
              textAlign: 'center', cursor: 'pointer',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>add_a_photo</span>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                Attach a screenshot (optional)
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', opacity: 0.6 }}>PNG, JPG up to 5MB</p>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={!feedback.trim()} style={{
            width: '100%', padding: '1rem', borderRadius: '1rem', fontSize: '1rem',
            opacity: feedback.trim() ? 1 : 0.5,
          }}>
            Submit Feedback
          </button>
        </form>
      )}
    </div>
  )
}
