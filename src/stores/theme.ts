/**
 * Theme store — persists to both localStorage (for offline) and Supabase user_settings
 */
import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (t: Theme) => void
  syncToSupabase: (userId: string) => void
}

const getResolved = (t: Theme): 'light' | 'dark' => {
  if (t === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return t
}

export const useThemeStore = create<ThemeStore>((set) => {
  const saved = (localStorage.getItem('listify-theme') as Theme) || 'light'
  const resolved = getResolved(saved)
  document.documentElement.classList.toggle('dark', resolved === 'dark')

  return {
    theme: saved,
    resolved,
    setTheme: (t) => {
      localStorage.setItem('listify-theme', t)
      const r = getResolved(t)
      document.documentElement.classList.toggle('dark', r === 'dark')
      set({ theme: t, resolved: r })
    },
    syncToSupabase: async (userId: string) => {
      try {
        const { settingsApi } = await import('../lib/api')
        const theme = localStorage.getItem('listify-theme') || 'system'
        await settingsApi.update(userId, { theme })
      } catch (err) {
        console.error('[ThemeStore] Failed to sync theme to Supabase:', err)
      }
    },
  }
})
