/**
 * Calendar Store — calendar events and sync status
 */
import { create } from 'zustand'
import { getAuthenticatedClient, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'

export interface CalendarEvent {
  id: string
  provider: 'google' | 'outlook'
  external_id: string | null
  title: string
  start_time: string
  end_time: string | null
  linked_task_id: string | null
  synced_at: string
}

interface CalendarState {
  events: CalendarEvent[]
  syncing: boolean
  connected: { google: boolean; outlook: boolean }
  lastSync: string | null

  fetchEvents: () => Promise<void>
  syncCalendar: () => Promise<{ synced: number }>
  connectProvider: (provider: 'google' | 'outlook') => Promise<{ status: string; oauth_url?: string }>
  disconnectProvider: (provider: 'google' | 'outlook') => Promise<void>
}

async function callEdgeFunction(path: string, options: RequestInit = {}) {
  const client = await getAuthenticatedClient()
  const token = (client as any).rest?.headers?.Authorization
  return fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    ...options,
    headers: {
      'Authorization': token || `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      ...(options.headers || {}),
    },
  })
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  syncing: false,
  connected: { google: false, outlook: false },
  lastSync: null,

  fetchEvents: async () => {
    try {
      const res = await callEdgeFunction('calendar-sync')
      const data = await res.json()
      const events = data.events || []
      set({
        events,
        connected: {
          google: events.some((e: any) => e.provider === 'google'),
          outlook: events.some((e: any) => e.provider === 'outlook'),
        },
      })
    } catch (err) {
      console.error('[Calendar] Fetch failed:', err)
    }
  },

  syncCalendar: async () => {
    set({ syncing: true })
    try {
      const res = await callEdgeFunction('calendar-sync/sync', { method: 'POST', body: '{}' })
      const data = await res.json()
      set({ syncing: false, lastSync: new Date().toISOString() })
      // Refresh events
      await get().fetchEvents()
      return { synced: data.synced || 0 }
    } catch (err) {
      set({ syncing: false })
      console.error('[Calendar] Sync failed:', err)
      return { synced: 0 }
    }
  },

  connectProvider: async (provider) => {
    try {
      const res = await callEdgeFunction('calendar-sync/connect', {
        method: 'POST', body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      return { status: data.status, oauth_url: data.oauth_url }
    } catch (err) {
      console.error('[Calendar] Connect failed:', err)
      return { status: 'error' }
    }
  },

  disconnectProvider: async (provider) => {
    try {
      await callEdgeFunction('calendar-sync/disconnect', {
        method: 'POST', body: JSON.stringify({ provider }),
      })
      set(s => ({
        events: s.events.filter(e => e.provider !== provider),
        connected: { ...s.connected, [provider]: false },
      }))
    } catch (err) {
      console.error('[Calendar] Disconnect failed:', err)
    }
  },
}))
