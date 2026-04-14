export function Skeleton({ width, height, br = '0.5rem', className = '' }: { width?: string | number, height?: string | number, br?: string, className?: string }) {
  return (
    <div className={`skeleton ${className}`} style={{
      width: width || '100%',
      height: height || '1rem',
      borderRadius: br,
      background: 'var(--surface-container-highest)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        .skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent,
            color-mix(in srgb, var(--on-surface) 5%, transparent),
            transparent
          );
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
