/**
 * LISTIFY Logo — reusable across auth screens, navbar, splash, and app icon.
 * Renders a modern minimal SVG icon (checklist/checkmark) + wordmark.
 * Scales via the `size` prop: 'sm' (navbar), 'md' (default), 'lg' (auth/splash).
 */

const sizes = {
  sm: { icon: 28, font: '1rem', gap: '0.5rem' },
  md: { icon: 36, font: '1.25rem', gap: '0.625rem' },
  lg: { icon: 52, font: '2.25rem', gap: '0.75rem' },
}

interface ListifyLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  center?: boolean
}

export default function ListifyLogo({ size = 'md', showTagline = false, center = true }: ListifyLogoProps) {
  const s = sizes[size]

  return (
    <div style={{ textAlign: center ? 'center' : 'left', display: 'flex', flexDirection: 'column', alignItems: center ? 'center' : 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
        {/* Icon — rounded-square with stylized checklist */}
        <div style={{
          width: s.icon, height: s.icon, borderRadius: s.icon * 0.25,
          background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, var(--tertiary)))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px color-mix(in srgb, var(--primary) 30%, transparent)',
          flexShrink: 0,
        }}>
          <svg
            width={s.icon * 0.55}
            height={s.icon * 0.55}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Checkmark */}
            <polyline points="4,12.5 9,17.5 20,6.5" />
            {/* Two list lines */}
            <line x1="4" y1="6" x2="10" y2="6" opacity="0.5" />
            <line x1="4" y1="21" x2="14" y2="21" opacity="0.5" />
          </svg>
        </div>

        {/* Wordmark */}
        <span style={{
          fontSize: s.font,
          fontWeight: 900,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, var(--on-surface), color-mix(in srgb, var(--on-surface) 70%, var(--primary)))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          LISTIFY
        </span>
      </div>

      {showTagline && (
        <p style={{
          color: 'var(--on-surface-variant)', fontSize: '0.875rem', fontWeight: 500,
          marginTop: '0.625rem', letterSpacing: '0.01em',
        }}>
          Organize your world with precision.
        </p>
      )}
    </div>
  )
}
