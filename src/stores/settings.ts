/**
 * Settings store backed by Supabase user_settings table
 * Replaces the useState toggles in SettingsPage.tsx
 */
import { create } from 'zustand'
import { settingsApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

type UserSettings = Tables<'user_settings'>

interface SettingsStore {
  settings: UserSettings | null
  loading: boolean
  error: string | null

  // Load settings from Supabase
  loadSettings: (userId: string) => Promise<void>

  // Update a setting (optimistic + persist)
  updateSetting: <K extends keyof UserSettings>(
    userId: string,
    key: K,
    value: UserSettings[K]
  ) => Promise<void>

  // Batch update multiple settings
  updateSettings: (
    userId: string,
    updates: Partial<UserSettings>
  ) => Promise<void>

  // Real-time subscription
  subscribeToRealtime: (userId: string) => () => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadSettings: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      let settings = await settingsApi.get(userId)
      if (!settings) {
        // First login — create default settings
        settings = await settingsApi.createDefaults(userId)
      }
      set({ settings, loading: false })
    } catch (err) {
      console.error('[SettingsStore] Failed to load settings:', err)
      set({ error: 'Failed to load settings', loading: false })
    }
  },

  updateSetting: async (userId, key, value) => {
    const current = get().settings
    if (!current) return

    // Optimistic update
    set({ settings: { ...current, [key]: value } })

    try {
      await settingsApi.update(userId, { [key]: value })
    } catch (err) {
      // Revert on failure
      console.error('[SettingsStore] Failed to update setting:', err)
      set({ settings: current })
    }
  },

  updateSettings: async (userId, updates) => {
    const current = get().settings
    if (!current) return

    // Optimistic update
    set({ settings: { ...current, ...updates } })

    try {
      await settingsApi.update(userId, updates)
    } catch (err) {
      console.error('[SettingsStore] Failed to update settings:', err)
      set({ settings: current })
    }
  },

  subscribeToRealtime: (userId: string) => {
    const channel = supabase
      .channel('public:user_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
        (payload) => {
          set({ settings: payload.new as UserSettings })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
