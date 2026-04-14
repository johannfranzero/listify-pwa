import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../stores/chat'
import type { ChatTab, QuickAction } from '../stores/chat'
import { useListStore } from '../stores/list'
import { useAssistantStore } from '../stores/assistant'
import type { AISuggestion } from '../stores/assistant'
import { useIsDesktop } from '../hooks/useMediaQuery'

const tabIcons: Record<ChatTab, string> = {
  All: 'forum',
  Grocery: 'shopping_cart',
  Work: 'work',
  Health: 'favorite',
  Travel: 'flight',
}

const quickPrompts = [
  { label: 'High priority tasks', icon: 'flag' },
  { label: 'Budget overview', icon: 'account_balance_wallet' },
  { label: 'Suggest items', icon: 'auto_awesome' },
  { label: 'Recurring analysis', icon: 'repeat' },
  { label: 'Team activity', icon: 'group' },
  { label: 'Efficiency trends', icon: 'insights' },
]

const cardColors: Record<string, { bg: string; border: string; icon: string }> = {
  insight: { bg: 'color-mix(in srgb, var(--primary) 6%, var(--surface-container-lowest))', border: 'color-mix(in srgb, var(--primary) 15%, transparent)', icon: 'var(--primary)' },
  recommendation: { bg: 'color-mix(in srgb, var(--warning) 6%, var(--surface-container-lowest))', border: 'color-mix(in srgb, var(--warning) 15%, transparent)', icon: 'var(--warning)' },
  collaboration: { bg: 'color-mix(in srgb, var(--secondary) 6%, var(--surface-container-lowest))', border: 'color-mix(in srgb, var(--secondary) 15%, transparent)', icon: 'var(--secondary)' },
  priority: { bg: 'color-mix(in srgb, var(--error) 6%, var(--surface-container-lowest))', border: 'color-mix(in srgb, var(--error) 15%, transparent)', icon: 'var(--error)' },
}

export default function AssistantPage() {
  const navigate = useNavigate()
  const { messages, chats, activeChat, setActiveChat, sendMessage, isTyping } = useChatStore()
  const { addItem } = useListStore()
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { suggestions, fetchSuggestions, generateSuggestions, acceptSuggestion, dismissSuggestion, generating } = useAssistantStore()
  const isDesktop = useIsDesktop()

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending')

  const currentMessages = messages[activeChat] || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages, isTyping])

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const suggestionIcons: Record<string, string> = {
    item: 'shopping_cart', task: 'task_alt', budget: 'account_balance_wallet', efficiency: 'speed',
  }
  const suggestionColors: Record<string, string> = {
    item: 'var(--primary)', task: 'var(--secondary)', budget: 'var(--warning)', efficiency: 'var(--success)',
  }

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  const handleQuickAction = (action: QuickAction) => {
    switch (action.action) {
      case 'add_planner':
        navigate('/planner')
        break
      case 'add_grocery':
        addItem({ name: 'Quick Add Item', category: 'Grocery', quantity: 1 })
        navigate('/lists')
        break
      case 'mark_complete':
        navigate('/lists')
        break
      case 'view_insights':
        navigate('/insights')
        break
      case 'navigate':
        if (action.data) navigate(action.data)
        break
    }
  }

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.')
      return
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      sendMessage(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  return (
    <div className="desktop-chat-container" style={{ display: 'flex', flexDirection: 'column', height: isDesktop ? '100dvh' : 'calc(100dvh - var(--nav-height))' }}>
      {/* ── Header ── */}
      <div style={{ padding: isDesktop ? '1.5rem 2.5rem 1rem' : '1rem', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: 'white' }}>auto_awesome</span>
            </div>
            <div>
              <h1 style={{ fontSize: isDesktop ? '1.25rem' : '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>AI Assistant</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>Context-aware • Connected</span>
              </div>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--on-surface-variant)', cursor: 'pointer' }}
            onClick={() => navigate('/settings')}>tune</span>
        </div>

        {/* ── Chat Tabs ── */}
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {chats.map(c => (
            <button key={c} onClick={() => setActiveChat(c)}
              className={`chip ${activeChat === c ? 'chip-active' : 'chip-inactive'}`}
              style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0.375rem 0.75rem', gap: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{tabIcons[c]}</span>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

        {/* ── AI Suggestion Cards ── */}
        {pendingSuggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>
                AI Suggestions
              </p>
              <button onClick={() => generateSuggestions()} disabled={generating}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, animation: generating ? 'spin 1s linear infinite' : 'none' }}>
                  {generating ? 'progress_activity' : 'auto_awesome'}
                </span>
                {generating ? 'Generating…' : 'Generate New'}
              </button>
            </div>
            {pendingSuggestions.slice(0, 3).map((s) => (
              <div key={s.id} className="animate-slide-up" style={{
                padding: '0.75rem', borderRadius: '0.875rem',
                background: 'var(--surface-container-lowest)',
                border: `1px solid color-mix(in srgb, ${suggestionColors[s.type] || 'var(--outline-variant)'} 20%, transparent)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: suggestionColors[s.type] || 'var(--primary)', marginTop: 1 }}>
                    {suggestionIcons[s.type] || 'lightbulb'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.125rem' }}>{s.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{s.body}</p>
                    <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                      {s.action_type && (
                        <button onClick={() => acceptSuggestion(s.id)} style={{
                          padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.6875rem', fontWeight: 700,
                          background: suggestionColors[s.type] || 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span> Accept
                        </button>
                      )}
                      <button onClick={() => dismissSuggestion(s.id)} style={{
                        padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.6875rem', fontWeight: 600,
                        background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', border: 'none', cursor: 'pointer',
                      }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{
          textAlign: 'center', fontSize: '0.625rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--on-surface-variant)', padding: '0.25rem 0',
        }}>
          Today
        </p>

        {currentMessages.map((msg, i) => (
          <div key={msg.id} className="animate-slide-up" style={{
            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            opacity: 0, animationDelay: `${Math.min(i * 0.04, 0.3)}s`,
          }}>
            {msg.role === 'ai' && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginRight: '0.5rem', marginTop: '0.25rem',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>auto_awesome</span>
              </div>
            )}
            <div style={{ maxWidth: '85%' }}>
              {/* Message bubble */}
              <div
                className={msg.role === 'user' ? 'bubble-user' : ''}
                style={msg.role === 'ai' ? {
                  background: msg.cardType ? cardColors[msg.cardType]?.bg : 'var(--surface-container-low)',
                  border: msg.cardType ? `1px solid ${cardColors[msg.cardType]?.border}` : 'none',
                  borderRadius: '1.25rem 1.25rem 1.25rem 0.25rem',
                  padding: '1rem 1.25rem',
                  color: 'var(--on-surface)',
                } : undefined}
              >
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>{msg.content}</p>

                {/* Task cards inside message */}
                {msg.tasks && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {msg.tasks.map(t => (
                      <div key={t.label} style={{
                        display: 'flex', alignItems: 'center', gap: '0.625rem',
                        padding: '0.625rem 0.75rem',
                        background: msg.role === 'user'
                          ? 'rgba(255,255,255,0.15)'
                          : 'var(--surface-container-high)',
                        borderRadius: '0.625rem',
                      }}>
                        <span className="material-symbols-outlined" style={{
                          fontSize: 18,
                          color: msg.cardType ? cardColors[msg.cardType]?.icon : 'var(--primary)',
                        }}>{t.icon}</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick action buttons */}
                {msg.quickActions && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.75rem' }}>
                    {msg.quickActions.map(qa => (
                      <button key={qa.label} onClick={() => handleQuickAction(qa)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.4375rem 0.75rem', borderRadius: '0.625rem',
                        border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                        background: 'color-mix(in srgb, var(--primary) 5%, transparent)',
                        color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{qa.icon}</span>
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <p style={{
                fontSize: '0.5625rem', color: 'var(--on-surface-variant)', opacity: 0.6,
                marginTop: '0.25rem', textAlign: msg.role === 'user' ? 'right' : 'left',
                paddingLeft: msg.role === 'ai' ? '0.25rem' : 0,
                paddingRight: msg.role === 'user' ? '0.25rem' : 0,
              }}>{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>auto_awesome</span>
            </div>
            <div style={{
              padding: '0.75rem 1rem', background: 'var(--surface-container-low)',
              borderRadius: '1.25rem 1.25rem 1.25rem 0.25rem',
              display: 'flex', gap: '0.375rem', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: 'var(--on-surface-variant)',
                  opacity: 0.4, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Prompts ── */}
      {currentMessages.length <= 3 && (
        <div style={{
          padding: '0.5rem 1rem', display: 'flex', gap: '0.375rem',
          overflowX: 'auto', borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)',
        }}>
          {quickPrompts.map(qp => (
            <button key={qp.label} onClick={() => { sendMessage(qp.label) }} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.4375rem 0.75rem', borderRadius: '9999px', whiteSpace: 'nowrap',
              background: 'var(--surface-container-high)', border: 'none',
              color: 'var(--on-surface)', fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--primary)' }}>{qp.icon}</span>
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Bar ── */}
      <div style={{
        padding: isDesktop ? '1rem 2.5rem' : '0.75rem 1rem', borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: 'var(--surface)',
      }}>
        <button onClick={() => navigate('/planner')} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--surface-container-high)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--on-surface-variant)' }}>add</span>
        </button>
        <input
          className="ios-input"
          placeholder={`Ask about ${activeChat === 'All' ? 'anything' : activeChat.toLowerCase()}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '0.625rem 1rem', borderRadius: '1.25rem', fontSize: '0.9375rem' }}
        />
        <button onClick={handleVoiceInput} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isListening ? 'var(--error)' : 'var(--surface-container-high)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 20, color: isListening ? 'white' : 'var(--on-surface-variant)',
          }}>{isListening ? 'hearing' : 'mic'}</span>
        </button>
        <button onClick={handleSend} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: input.trim() ? 'var(--primary)' : 'var(--surface-container-high)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s ease',
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 20, color: input.trim() ? 'white' : 'var(--on-surface-variant)',
          }}>arrow_upward</span>
        </button>
      </div>
    </div>
  )
}
