import { SignIn } from '@clerk/clerk-react'
import ListifyLogo from '../components/ListifyLogo'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', background: 'var(--surface)',
    }}>
      <div style={{ maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <ListifyLogo size="lg" showTagline />
        </div>

        <SignIn 
          signUpUrl="/signup" 
          forceRedirectUrl="/dashboard"
          appearance={{
            elements: {
              formButtonPrimary: 'btn-primary',
              card: 'card',
              headerTitle: 'text-2xl font-bold',
              headerSubtitle: 'text-sm text-on-surface-variant'
            }
          }}
        />
      </div>
    </div>
  )
}
