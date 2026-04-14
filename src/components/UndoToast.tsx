import { useState, useEffect, useRef } from 'react'

interface UndoToastProps {
  message: string
  duration?: number
  onUndo: () => void
  onDismiss: () => void
}

export default function UndoToast({ message, duration = 4000, onUndo, onDismiss }: UndoToastProps) {
  const [progress, setProgress] = useState(100)
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct <= 0) {
        clearInterval(timerRef.current)
        setExiting(true)
        setTimeout(onDismiss, 300)
      }
    }, 50)
    return () => clearInterval(timerRef.current)
  }, [duration, onDismiss])

  const handleUndo = () => {
    clearInterval(timerRef.current)
    setExiting(true)
    onUndo()
  }

  return (
    <div
      style={{
        position: 'fixed', bottom: 'calc(var(--nav-height) + 1rem)',
        left: '50%', transform: `translateX(-50%) ${exiting ? 'translateY(120%)' : 'translateY(0)'}`,
        zIndex: 9999,
        background: 'var(--inverse-surface, #1c1b1f)', color: 'var(--inverse-on-surface, #f4eff4)',
        borderRadius: '0.875rem', padding: '0.75rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        minWidth: 280, maxWidth: 'calc(100vw - 2rem)',
        transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
        animation: exiting ? 'none' : 'slideUpToast 0.3s ease forwards',
        overflow: 'hidden',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>delete</span>
      <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
      <button
        onClick={handleUndo}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--inverse-primary, #d0bcff)', fontWeight: 700,
          fontSize: '0.875rem', padding: '0.25rem 0.5rem', borderRadius: '0.5rem',
          flexShrink: 0,
        }}
      >
        Undo
      </button>
      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: 'rgba(255,255,255,0.1)',
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'var(--inverse-primary, #d0bcff)',
          transition: 'width 0.05s linear',
        }} />
      </div>
    </div>
  )
}

// Hook to manage undo toast state
export function useUndoToast() {
  const [toast, setToast] = useState<{
    message: string
    undoAction: () => void
  } | null>(null)

  const showToast = (message: string, undoAction: () => void) => {
    setToast({ message, undoAction })
  }

  const handleUndo = () => {
    toast?.undoAction()
    setToast(null)
  }

  const handleDismiss = () => {
    setToast(null)
  }

  return { toast, showToast, handleUndo, handleDismiss }
}
