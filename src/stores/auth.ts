/**
 * Auth store — handles local session state and syncs with Clerk
 */
import { create } from 'zustand'

interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string
}

interface AuthStore {
  isAuthenticated: boolean
  hasOnboarded: boolean
  user: AuthUser | null
  isLoading: boolean
  setAuth: (user: AuthUser | null) => void
  completeOnboarding: () => void
  updateUser: (updates: Partial<AuthUser>) => void
  setHasOnboarded: (val: boolean) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  hasOnboarded: localStorage.getItem('listify-onboarded') === 'true',
  user: null,
  isLoading: true,

  setAuth: (user) => {
    set({ 
      isAuthenticated: !!user, 
      user, 
      isLoading: false 
    })
  },

  setHasOnboarded: (val) => {
    localStorage.setItem('listify-onboarded', val ? 'true' : 'false')
    set({ hasOnboarded: val })
  },

  completeOnboarding: () => {
    localStorage.setItem('listify-onboarded', 'true')
    set({ hasOnboarded: true })
  },

  updateUser: (updates) => {
    const state = get()
    if (state.user) {
      const newUser = { ...state.user, ...updates }
      set({ user: newUser })
    }
  },
}))
