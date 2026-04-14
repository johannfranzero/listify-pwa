/**
 * Notifications Store — in-app notification bell with read/unread
 */
import { create } from 'zustand'
import { getAuthenticatedClient, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'

export interface Notification {
  id: string
  type: 'budget_alert' | 'collab_invite' | 'reminder' | 'suggestion' | 'achievement'
  title: string
  body: string
  data: Record<string, any> | null
  read: boolean
  created_at: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean

  fetchNotifications: (limit?: number) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (limit = 20) => {
    set({ loading: true })
    try {
      const client = await getAuthenticatedClient()
      const token = (client as any).rest?.headers?.Authorization
      const res = await fetch(`${SUPABASE_URL}/functions/v1/notifications-push?limit=${limit}`, {
        headers: {
          'Authorization': token || `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      })
      const data = await res.json()
      set({ notifications: data.notifications || [], unreadCount: data.unread_count || 0, loading: false })
    } catch (err) {
      set({ loading: false })
      console.error('[Notifications] Fetch failed:', err)
    }
  },

  markAsRead: async (id: string) => {
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
    try {
      const client = await getAuthenticatedClient()
      await client.from('notifications').update({ read: true }).eq('id', id)
    } catch (err) {
      console.error('[Notifications] Mark read failed:', err)
    }
  },

  markAllRead: async () => {
    const unreadIds = get().notifications.filter(n => !n.read).map(n => n.id)
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }))
    try {
      const client = await getAuthenticatedClient()
      for (const id of unreadIds) {
        await client.from('notifications').update({ read: true }).eq('id', id)
      }
    } catch (err) {
      console.error('[Notifications] Mark all read failed:', err)
    }
  },
}))
