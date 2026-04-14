/**
 * List store — Supabase-backed with offline support
 * 
 * MIGRATION NOTES:
 * - The store still exports the same selectors (getFilteredItems, getCategoryProgress, getTotalCost)
 * - Items now have UUID ids instead of timestamp strings
 * - The store loads from Supabase on init and falls back to cached data offline
 * - All mutations are optimistic (update local state immediately, then persist)
 * - Collaborative changes arrive via Supabase Realtime subscriptions
 */
import { create } from 'zustand'
import { listsApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import type { Tables } from '../types/database'
import { listItemRepository } from '../lib/repositories/SupabaseListItemRepository'

// Re-export types compatible with existing UI code
export interface Recurring {
  interval: 'daily' | 'weekly' | 'biweekly' | 'monthly'
}

export interface Collaborator {
  id: string
  name: string
  avatar: string
}

export interface ListItem {
  id: string
  name: string
  category: string
  quantity: number
  completed: boolean
  priority?: boolean
  price?: number | undefined
  notes?: string | undefined
  photoUrl?: string | undefined
  recurring?: Recurring | undefined
  dueDate?: string | undefined
  addedBy?: string | undefined
}

export type SortBy = 'category' | 'priority' | 'quantity' | 'dueDate' | 'manual'
export type FilterStatus = 'all' | 'pending' | 'completed'

interface ListStore {
  items: ListItem[]
  listName: string
  activeCategory: string
  searchQuery: string
  sortBy: SortBy
  filterStatus: FilterStatus
  weeklyBudget: number
  collaborators: Collaborator[]
  defaultListId: string | null
  loading: boolean
  synced: boolean
  error: string | null

  // Data operations
  loadFromSupabase: (userId: string) => Promise<void>
  subscribeToRealtime: (listId: string) => () => void

  // Keep existing API for backward compat
  setCategory: (c: string) => void
  setSearchQuery: (q: string) => void
  setSortBy: (s: SortBy) => void
  setFilterStatus: (f: FilterStatus) => void
  setWeeklyBudget: (b: number) => void
  addItem: (item: Omit<ListItem, 'id' | 'completed'>) => Promise<void>
  toggleItem: (id: string) => Promise<void>
  updateQuantity: (id: string, qty: number) => Promise<void>
  updateItem: (id: string, partial: Partial<ListItem>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  clearCompleted: () => Promise<void>
  reorderItems: (fromIndex: number, toIndex: number) => Promise<void>
  restoreItems: (items: ListItem[]) => Promise<void>
}

// Map Supabase row → local ListItem shape
function rowToItem(row: Tables<'list_items'>): ListItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity || 1,
    completed: row.completed || false,
    priority: row.priority || false,
    price: row.price || undefined,
    notes: row.notes || undefined,
    photoUrl: row.photo_url || undefined,
    recurring: row.recurring_interval
      ? { interval: row.recurring_interval as Recurring['interval'] }
      : undefined,
    dueDate: row.due_date || undefined,
    addedBy: row.added_by || undefined,
  }
}

const defaultCollaborators: Collaborator[] = []
// Fallback demo items removed — app starts with empty list until Supabase loads
const fallbackItems: ListItem[] = []

function sortItems(items: ListItem[], sortBy: SortBy): ListItem[] {
  if (sortBy === 'manual') return items;
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'category': return a.category.localeCompare(b.category)
      case 'priority': return (b.priority ? 1 : 0) - (a.priority ? 1 : 0)
      case 'quantity': return b.quantity - a.quantity
      case 'dueDate': return (a.dueDate || '9').localeCompare(b.dueDate || '9')
      default: return 0
    }
  })
}

export const useListStore = create<ListStore>((set, get) => ({
  items: fallbackItems,
  listName: 'My List',
  activeCategory: 'All Items',
  searchQuery: '',
  sortBy: 'manual',
  filterStatus: 'pending',
  weeklyBudget: 0,
  collaborators: defaultCollaborators,
  defaultListId: null,
  loading: false,
  synced: false,
  error: null,

  loadFromSupabase: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      // Get or create the user's default list
      const list = await listsApi.getOrCreateDefault(userId)
      set({ defaultListId: list.id, listName: (list as any).name || 'My List' })

      // Load list items
      const rows = await listItemRepository.getByList(list.id)
      const items = rows.map(rowToItem)

      // Load collaborators from list_collaborators table
      let collabs: Collaborator[] = []
      try {
        const { data: collabRows } = await (await import('../lib/supabase')).supabase
          .from('list_collaborators')
          .select('user_id, role, invitation_email')
          .eq('list_id', list.id)
        if (collabRows && collabRows.length > 0) {
          collabs = collabRows.map((c: any, i: number) => ({
            id: c.user_id || `collab-${i}`,
            name: c.invitation_email?.split('@')[0] || `User ${i + 1}`,
            avatar: (c.invitation_email?.split('@')[0] || 'U')[0].toUpperCase() + (c.invitation_email?.split('@')[0] || '')[1]?.toUpperCase() || '',
          }))
        }
      } catch {
        // Collaborators are optional
      }

      set({
        items,
        collaborators: collabs.length > 0 ? collabs : defaultCollaborators,
        loading: false,
        synced: true,
      })
    } catch (err: any) {
      console.error('[ListStore] Failed to load from Supabase:', err)
      set({ loading: false, error: err.message || 'Failed to load list' })
      // Items remain empty on error
    }
  },


  subscribeToRealtime: (listId: string) => {
    const channel = supabase
      .channel(`list_items:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` },
        (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          if (payload.eventType === 'INSERT') {
            const newItem = rowToItem(payload.new as Tables<'list_items'>)
            set((state) => {
              // Avoid duplicates
              if (!state.items.find(i => i.id === newItem.id)) {
                return { items: [newItem, ...state.items] }
              }
              return state
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToItem(payload.new as Tables<'list_items'>)
            set((state) => ({ items: state.items.map(i => i.id === updated.id ? updated : i) }))
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id: string }).id
            set((state) => ({ items: state.items.filter(i => i.id !== oldId) }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  setCategory: (c) => set({ activeCategory: c }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSortBy: (s) => set({ sortBy: s }),
  setFilterStatus: (f) => set({ filterStatus: f }),
  setWeeklyBudget: (b) => set({ weeklyBudget: b }),

  addItem: async (item) => {
    const tempId = crypto.randomUUID()
    const newItem: ListItem = { ...item, id: tempId, completed: false }

    set((state) => ({ items: [newItem, ...state.items], error: null }))

    const { defaultListId, items } = get()
    if (defaultListId) {
      const authUser = useAuthStore.getState().user
      const userId = authUser?.id || 'local'
      try {
        await listItemRepository.create({
          id: tempId,
          list_id: defaultListId,
          user_id: userId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          priority: item.priority || false,
          price: item.price || null,
          notes: item.notes || null,
          photo_url: item.photoUrl || null,
          recurring_interval: item.recurring?.interval || null,
          due_date: item.dueDate || null,
          added_by: item.addedBy || null,
        })
        // ID is already matched, no need to update it
      } catch (err: any) {
        console.error('[ListStore] Failed to persist item:', err)
        set((state) => ({ items: state.items.filter(i => i.id !== tempId), error: err.message || 'Failed to add item' }))
      }
    }
  },

  toggleItem: async (id) => {
    const currentItem = get().items.find(i => i.id === id)
    if (!currentItem) return
    const wasCompleted = currentItem.completed

    // Optimistic update — keeps the new state even if network fails
    set((state) => ({
      items: state.items.map(i => i.id === id ? { ...i, completed: !wasCompleted } : i),
      error: null
    }))
    
    try {
      const { defaultListId } = get()
      await listItemRepository.update(id, { completed: !wasCompleted }, defaultListId || undefined)
    } catch (err: any) {
      // Don't revert — keep optimistic state so toggling works offline
      console.warn('[ListStore] toggleItem: failed to sync, keeping local state:', err.message)
    }
  },

  updateQuantity: async (id, qty) => {
    const newQty = Math.max(1, qty)
    const currentItem = get().items.find(i => i.id === id)
    if (!currentItem) return
    const oldQty = currentItem.quantity
    
    set((state) => ({
      items: state.items.map(i => i.id === id ? { ...i, quantity: newQty } : i),
      error: null
    }))
    
    try {
      const { defaultListId } = get()
      await listItemRepository.update(id, { quantity: newQty }, defaultListId || undefined)
    } catch (err: any) {
      console.warn('[ListStore] updateQuantity: failed to sync, keeping local state:', err.message)
    }
  },

  updateItem: async (id, partial) => {
    const currentItem = get().items.find(i => i.id === id)
    if (!currentItem) return
    const oldState = { ...currentItem }

    set((state) => ({
      items: state.items.map(i => i.id === id ? { ...i, ...partial } : i),
      error: null
    }))

    const dbUpdate: Record<string, unknown> = {}
    if (partial.name !== undefined) dbUpdate.name = partial.name
    if (partial.category !== undefined) dbUpdate.category = partial.category
    if (partial.quantity !== undefined) dbUpdate.quantity = partial.quantity
    if (partial.completed !== undefined) dbUpdate.completed = partial.completed
    if (partial.priority !== undefined) dbUpdate.priority = partial.priority
    if (partial.price !== undefined) dbUpdate.price = partial.price
    if (partial.notes !== undefined) dbUpdate.notes = partial.notes
    if (partial.dueDate !== undefined) dbUpdate.due_date = partial.dueDate
    if (partial.recurring !== undefined) dbUpdate.recurring_interval = partial.recurring?.interval || null

    if (Object.keys(dbUpdate).length > 0) {
      try {
        const { defaultListId } = get()
        await listItemRepository.update(id, dbUpdate, defaultListId || undefined)
      } catch (err: any) {
        console.warn('[ListStore] updateItem: failed to sync, keeping local state:', err.message)
      }
    }
  },

  removeItem: async (id) => {
    const currentItem = get().items.find(i => i.id === id)
    if (!currentItem) return

    set((state) => ({
      items: state.items.filter(i => i.id !== id),
      error: null
    }))
    
    try {
      const { defaultListId } = get()
      await listItemRepository.delete(id, defaultListId || undefined)
    } catch (err: any) {
      console.warn('[ListStore] removeItem: failed to sync, keeping local state:', err.message)
    }
  },

  clearCompleted: async () => {
    const currentItems = get().items
    const { defaultListId } = get()
    
    set((state) => ({
      items: state.items.filter(i => !i.completed),
      error: null
    }))
    
    if (defaultListId) {
      try {
        await listItemRepository.clearCompleted(defaultListId)
      } catch (err: any) {
        set((state) => ({
          items: currentItems, // Since this clears multiple, putting back all original is easiest
          error: err.message || 'Failed to clear completed items'
        }))
      }
    }
  },

  reorderItems: async (fromIndex: number, toIndex: number) => {
    const previousItems = get().items
    set((s) => {
      const newItems = [...s.items]
      const [moved] = newItems.splice(fromIndex, 1)
      if (moved) {
        newItems.splice(toIndex, 0, moved)
      }
      return { items: newItems, error: null }
    })
    
    const { items, defaultListId } = get()
    if (defaultListId) {
      try {
        await Promise.all(
          items.map((item, idx) => listItemRepository.update(item.id, { sort_order: idx }, defaultListId || undefined))
        )
      } catch (err: any) {
        // Simple error output, rolling back would require complex reordering
        set({ error: err.message || 'Failed to reorder items' })
      }
    }
  },

  restoreItems: async (itemsToRestore) => {
    set((state) => ({ items: [...itemsToRestore, ...state.items], error: null }))
    const { defaultListId } = get()
    if (defaultListId) {
      const authUser = useAuthStore.getState().user
      const userId = authUser?.id || 'local'
      try {
        await Promise.all(itemsToRestore.map(item => listItemRepository.create({
          id: item.id,
          list_id: defaultListId,
          user_id: userId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          completed: item.completed,
          priority: item.priority || false,
          price: item.price || null,
          notes: item.notes || null,
          photo_url: item.photoUrl || null,
          recurring_interval: item.recurring?.interval || null,
          due_date: item.dueDate || null,
          added_by: item.addedBy || null,
        })))
      } catch (err: any) {
        console.error('[ListStore] Failed to restore items:', err)
        set((state) => {
          const restoredIds = new Set(itemsToRestore.map(i => i.id))
          return {
            items: state.items.filter(i => !restoredIds.has(i.id)),
            error: err.message || 'Failed to restore items'
          }
        })
      }
    }
  },
}))

// ── Selector helpers (unchanged API for existing components) ──

export function getFilteredItems(
  items: ListItem[],
  category: string,
  searchQuery: string,
  filterStatus: FilterStatus,
  sortBy: SortBy,
  showAlwaysIds: Set<string> = new Set(),
): ListItem[] {
  let result = items
  if (category !== 'All Items') result = result.filter(i => i.category === category)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
  }
  if (filterStatus === 'pending') result = result.filter(i => !i.completed || showAlwaysIds.has(i.id))
  if (filterStatus === 'completed') result = result.filter(i => i.completed)
  result = sortItems(result, sortBy)
  return result
}

export function getCategoryProgress(items: ListItem[]): { category: string; total: number; completed: number; pct: number }[] {
  const cats = new Map<string, { total: number; completed: number }>()
  for (const item of items) {
    const entry = cats.get(item.category) || { total: 0, completed: 0 }
    entry.total++
    if (item.completed) entry.completed++
    cats.set(item.category, entry)
  }
  return Array.from(cats.entries()).map(([category, { total, completed }]) => ({
    category,
    total,
    completed,
    pct: Math.round((completed / total) * 100),
  }))
}

export function getTotalCost(items: ListItem[], onlyPending = true): number {
  return items
    .filter(i => (onlyPending ? !i.completed : true))
    .reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
}
