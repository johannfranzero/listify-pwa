import React, { useEffect, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useAuthStore } from './stores/auth'
import { useListStore } from './stores/list'
import { usePlannerStore } from './stores/planner'
import { ErrorBoundary } from './components/ErrorBoundary'

const LoginPage = React.lazy(() => import('./pages/LoginPage'))
const SignupPage = React.lazy(() => import('./pages/SignupPage'))
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage'))
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))
const ListsPage = React.lazy(() => import('./pages/ListsPage'))
const PlannerPage = React.lazy(() => import('./pages/PlannerPage'))
const InsightsPage = React.lazy(() => import('./pages/InsightsPage'))
const AssistantPage = React.lazy(() => import('./pages/AssistantPage'))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'))
const FeedbackPage = React.lazy(() => import('./pages/FeedbackPage'))
const OfflinePage = React.lazy(() => import('./pages/OfflinePage'))

import BottomNav from './components/BottomNav'
import DesktopSidebar from './components/DesktopSidebar'
import InstallPrompt from './components/InstallPrompt'
import UpdatePrompt from './components/UpdatePrompt'
import { useSettingsStore } from './stores/settings'
import { useIsDesktop } from './hooks/useMediaQuery'

function AppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <div className="desktop-layout">
        <DesktopSidebar />
        <div className="desktop-content">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 'var(--nav-height)' }}>
      <div style={{ flex: 1 }}>{children}</div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const { isAuthenticated, hasOnboarded, setAuth } = useAuthStore()
  const { settings, loadSettings, subscribeToRealtime } = useSettingsStore()
  const defaultListId = useListStore(s => s.defaultListId)

  // Sync Clerk user with AuthStore
  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && clerkUser) {
      setAuth({
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.username || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        avatar: clerkUser.imageUrl
      })
    } else {
      setAuth(null)
    }
  }, [isLoaded, isSignedIn, clerkUser])

  // Load settings globally on mount + subscribe to RT updates
  useEffect(() => {
    if (!clerkUser?.id) return
    
    const userId = clerkUser.id
    // Initial data load from Supabase
    useListStore.getState().loadFromSupabase(userId)
    
    loadSettings(userId)
    const unsubscribeSettings = subscribeToRealtime(userId)
    let unsubscribePlanner: (() => void) | undefined
    if (usePlannerStore.getState().subscribeToRealtime) {
       unsubscribePlanner = usePlannerStore.getState().subscribeToRealtime(userId)
    }
    return () => {
      if (typeof unsubscribeSettings === 'function') unsubscribeSettings()
      if (typeof unsubscribePlanner === 'function') unsubscribePlanner()
    }
  }, [clerkUser?.id])

  useEffect(() => {
    if (!defaultListId) return
    let unsubscribeList: (() => void) | undefined
    if (useListStore.getState().subscribeToRealtime) {
      unsubscribeList = useListStore.getState().subscribeToRealtime(defaultListId)
    }
    return () => {
      if (typeof unsubscribeList === 'function') unsubscribeList()
    }
  }, [defaultListId])

  // Apply accessibility settings to DOM & Sync Budget
  useEffect(() => {
    if (settings) {
      document.documentElement.classList.toggle('a11y-large-text', !!settings.accessibility_larger_text)
      document.documentElement.classList.toggle('a11y-high-contrast', !!settings.accessibility_high_contrast)
      useListStore.getState().setWeeklyBudget(settings.weekly_budget || 0)
    }
  }, [settings])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <InstallPrompt />
      <UpdatePrompt />
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[100dvh] bg-surface">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={hasOnboarded ? '/dashboard' : '/onboarding'} /> : <LoginPage />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/onboarding" /> : <SignupPage />} />
        <Route path="/onboarding" element={!isAuthenticated ? <Navigate to="/login" /> : <OnboardingPage />} />
        <Route path="/offline" element={<OfflinePage />} />

        {/* Protected routes with bottom nav */}
        <Route path="/dashboard" element={isAuthenticated ? <AppShell><DashboardPage /></AppShell> : <Navigate to="/login" />} />
        <Route path="/lists" element={isAuthenticated ? <AppShell><ListsPage /></AppShell> : <Navigate to="/login" />} />
        <Route path="/planner" element={isAuthenticated ? <AppShell><PlannerPage /></AppShell> : <Navigate to="/login" />} />
        <Route path="/insights" element={isAuthenticated ? <AppShell><InsightsPage /></AppShell> : <Navigate to="/login" />} />
        <Route path="/assistant" element={isAuthenticated ? <AppShell><AssistantPage /></AppShell> : <Navigate to="/login" />} />
        <Route path="/settings" element={isAuthenticated ? <AppShell><SettingsPage /></AppShell> : <Navigate to="/login" />} />
        <Route path="/feedback" element={isAuthenticated ? <AppShell><FeedbackPage /></AppShell> : <Navigate to="/login" />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? (hasOnboarded ? '/dashboard' : '/onboarding') : '/login'} />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}
