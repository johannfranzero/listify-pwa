/**
 * Typed API helpers for LISTIFY backend operations
 * 
 * These wrap Supabase PostgREST calls with type-safe interfaces
 * and integrate with the offline sync engine.
 */
import { getAuthenticatedClient } from './supabase'
import { queueMutation, isOnline, setCachedData, getCachedData } from './offlineSync'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

// ── In-flight request tracking ──
const pendingCreates = new Map<string, PromiseLike<any>>()

// ── Lists API ──

export const listsApi = {
  /** Get all lists for the current user */
  async getAll(): Promise<Tables<'lists'>[]> {
    if (!isOnline()) {
      return await getCachedData<Tables<'lists'>[]>('lists') || []
    }
    const client = await getAuthenticatedClient()
    const { data, error } = await client
      .from('lists')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    await setCachedData('lists', data)
    return data
  },

  /** Get or create a default list for the user */
  async getOrCreateDefault(userId: string): Promise<Tables<'lists'>> {
    const client = await getAuthenticatedClient()
    const { data: existing } = await client
      .from('lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (existing) return existing

    const { data, error } = await client
      .from('lists')
      .insert({ user_id: userId, name: 'My List' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Create a new list */
  async create(list: TablesInsert<'lists'>): Promise<Tables<'lists'>> {
    if (!isOnline()) {
      await queueMutation({ table: 'lists', operation: 'INSERT', data: list })
      return list as Tables<'lists'>
    }
    const client = await getAuthenticatedClient()
    const { data, error } = await client.from('lists').insert(list).select().single()
    if (error) throw error
    return data
  },

  /** Update a list */
  async update(id: string, updates: TablesUpdate<'lists'>): Promise<void> {
    if (!isOnline()) {
      await queueMutation({ table: 'lists', operation: 'UPDATE', data: updates, filters: { id } })
      return
    }
    const client = await getAuthenticatedClient()
    const { error } = await client.from('lists').update(updates).eq('id', id)
    if (error) throw error
  },

  /** Delete a list */
  async delete(id: string): Promise<void> {
    if (!isOnline()) {
      await queueMutation({ table: 'lists', operation: 'DELETE', data: {}, filters: { id } })
      return
    }
    const client = await getAuthenticatedClient()
    const { error } = await client.from('lists').delete().eq('id', id)
    if (error) throw error
  },
}

// ── List Items API ──

export const listItemsApi = {
  /** Get all items for a list */
  async getByList(listId: string): Promise<Tables<'list_items'>[]> {
    const cacheKey = `list_items_${listId}`
    if (!isOnline()) {
      return await getCachedData<Tables<'list_items'>[]>(cacheKey) || []
    }
    const client = await getAuthenticatedClient()
    const { data, error } = await client
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('sort_order', { ascending: true })
    if (error) throw error
    await setCachedData(cacheKey, data)
    return data
  },

  /** Create a new item */
  async create(item: TablesInsert<'list_items'>): Promise<Tables<'list_items'>> {
    const tempItem = item.id ? (item as Tables<'list_items'>) : { id: crypto.randomUUID(), ...item } as Tables<'list_items'>

    if (!isOnline()) {
      await queueMutation({ table: 'list_items', operation: 'INSERT', data: tempItem })
      const cacheKey = `list_items_${item.list_id}`
      const cached = await getCachedData<Tables<'list_items'>[]>(cacheKey) || []
      await setCachedData(cacheKey, [tempItem, ...cached])
      return tempItem
    }
    const client = await getAuthenticatedClient()
    const promise = client.from('list_items').insert(item).select().single()
    if (tempItem.id) pendingCreates.set(tempItem.id, promise)
    try {
      const { data, error } = await promise
      if (error) throw error
      // Also update cache if online to ensure it's fresh
      const cacheKey = `list_items_${item.list_id}`
      const cached = await getCachedData<Tables<'list_items'>[]>(cacheKey) || []
      await setCachedData(cacheKey, [data, ...cached])
      return data
    } finally {
      if (tempItem.id) pendingCreates.delete(tempItem.id)
    }
  },

  /** Update an item (toggle, quantity, etc.) */
  async update(id: string, updates: TablesUpdate<'list_items'>, listId?: string): Promise<void> {
    const applyToCache = async (lId: string) => {
      const cacheKey = `list_items_${lId}`
      const cached = await getCachedData<Tables<'list_items'>[]>(cacheKey)
      if (cached) {
        const updated = cached.map(item => item.id === id ? { ...item, ...updates } : item)
        await setCachedData(cacheKey, updated)
      }
    }

    if (!isOnline()) {
      await queueMutation({ table: 'list_items', operation: 'UPDATE', data: updates, filters: { id } })
      if (listId) await applyToCache(listId)
      return
    }
    if (pendingCreates.has(id)) {
      try { await pendingCreates.get(id) } catch (e) {}
    }
    const client = await getAuthenticatedClient()
    const { error } = await client.from('list_items').update(updates).eq('id', id)
    if (error) throw error
    if (listId) await applyToCache(listId)
  },

  async delete(id: string, listId?: string): Promise<void> {
    const applyToCache = async (lId: string) => {
      const cacheKey = `list_items_${lId}`
      const cached = await getCachedData<Tables<'list_items'>[]>(cacheKey)
      if (cached) {
        const filtered = cached.filter(item => item.id !== id)
        await setCachedData(cacheKey, filtered)
      }
    }

    if (!isOnline()) {
      await queueMutation({ table: 'list_items', operation: 'DELETE', data: {}, filters: { id } })
      if (listId) await applyToCache(listId)
      return
    }
    if (pendingCreates.has(id)) {
      try { await pendingCreates.get(id) } catch (e) {}
    }
    const client = await getAuthenticatedClient()
    const { error } = await client.from('list_items').delete().eq('id', id)
    if (error) throw error
    if (listId) await applyToCache(listId)
  },

  /** Clear all completed items in a list */
  async clearCompleted(listId: string): Promise<void> {
    const client = await getAuthenticatedClient()
    const { error } = await client
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('completed', true)
    if (error) throw error
  },
}

// ── Planner Tasks API ──

export const plannerApi = {
  /** Get all tasks for the current user */
  async getAll(): Promise<Tables<'planner_tasks'>[]> {
    if (!isOnline()) {
      return await getCachedData<Tables<'planner_tasks'>[]>('planner_tasks') || []
    }
    const client = await getAuthenticatedClient()
    const { data, error } = await client
      .from('planner_tasks')
      .select('*')
      .order('scheduled_date', { ascending: true })
    if (error) throw error
    await setCachedData('planner_tasks', data)
    return data
  },

  /** Get tasks for a specific date range */
  async getByDateRange(start: string, end: string): Promise<Tables<'planner_tasks'>[]> {
    const client = await getAuthenticatedClient()
    const { data, error } = await client
      .from('planner_tasks')
      .select('*')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date', { ascending: true })
    if (error) throw error
    return data
  },

  /** Create a new task */
  async create(task: TablesInsert<'planner_tasks'>): Promise<Tables<'planner_tasks'>> {
    if (!isOnline()) {
      const tempTask = { id: crypto.randomUUID(), ...task }
      await queueMutation({ table: 'planner_tasks', operation: 'INSERT', data: tempTask })
      return tempTask as Tables<'planner_tasks'>
    }
    const client = await getAuthenticatedClient()
    const promise = client.from('planner_tasks').insert(task).select().single()
    if (task.id) pendingCreates.set(task.id, promise)
    try {
      const { data, error } = await promise
      if (error) throw error
      return data
    } finally {
      if (task.id) pendingCreates.delete(task.id)
    }
  },

  /** Update a task */
  async update(id: string, updates: TablesUpdate<'planner_tasks'>): Promise<void> {
    if (!isOnline()) {
      await queueMutation({ table: 'planner_tasks', operation: 'UPDATE', data: updates, filters: { id } })
      return
    }
    if (pendingCreates.has(id)) {
      try { await pendingCreates.get(id) } catch (e) {}
    }
    const client = await getAuthenticatedClient()
    const { error } = await client.from('planner_tasks').update(updates).eq('id', id)
    if (error) throw error
  },

  /** Delete a task */
  async delete(id: string): Promise<void> {
    if (!isOnline()) {
      await queueMutation({ table: 'planner_tasks', operation: 'DELETE', data: {}, filters: { id } })
      return
    }
    if (pendingCreates.has(id)) {
      try { await pendingCreates.get(id) } catch (e) {}
    }
    const client = await getAuthenticatedClient()
    const { error } = await client.from('planner_tasks').delete().eq('id', id)
    if (error) throw error
  },

  /** Link a planner task to a list item */
  async linkToListItem(taskId: string, listId: string, listItemId: string): Promise<void> {
    const client = await getAuthenticatedClient()
    const { error } = await client
      .from('planner_tasks')
      .update({ linked_list_id: listId, linked_list_item_id: listItemId })
      .eq('id', taskId)
    if (error) throw error
  },
}

// ── Settings API ──

export const settingsApi = {
  /** Get user settings */
  async get(userId: string): Promise<Tables<'user_settings'> | null> {
    const cacheKey = `settings_${userId}`
    if (!isOnline()) {
      return await getCachedData<Tables<'user_settings'>>(cacheKey)
    }
    const client = await getAuthenticatedClient()
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
    if (data) await setCachedData(cacheKey, data)
    return data
  },

  /** Create default settings for a new user */
  async createDefaults(userId: string): Promise<Tables<'user_settings'>> {
    const client = await getAuthenticatedClient()
    const { data, error } = await client
      .from('user_settings')
      .insert({ user_id: userId, weekly_budget: 0, currency: 'PHP' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Update user settings */
  async update(userId: string, updates: TablesUpdate<'user_settings'>): Promise<void> {
    if (!isOnline()) {
      await queueMutation({
        table: 'user_settings',
        operation: 'UPDATE',
        data: updates,
        filters: { user_id: userId },
      })
      return
    }
    const client = await getAuthenticatedClient()
    const { error } = await client
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)
    if (error) throw error
  },
}


// ── Activity Log API ──

export const activityApi = {
  /** Get recent activity for the current user */
  async getRecent(userId: string, limit = 20): Promise<Tables<'activity_log'>[]> {
    const client = await getAuthenticatedClient()
    const { data, error } = await client
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },
}

// ── Dashboard Summary (composite) ──

export const dashboardApi = {
  /** Get a summary of lists + planner data for the dashboard */
  async getSummary(userId: string) {
    const client = await getAuthenticatedClient()

    // Fetch list items and planner tasks in parallel
    const [listItemsResult, plannerResult, activityResult] = await Promise.all([
      client.from('list_items').select('*').eq('user_id', userId),
      client.from('planner_tasks').select('*').eq('user_id', userId).eq('status', 'pending'),
      client.from('activity_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    ])

    const items = listItemsResult.data || []
    const tasks = plannerResult.data || []
    const activity = activityResult.data || []

    const totalItems = items.length
    const completedItems = items.filter((i: any) => i.completed).length
    const totalCost = items
      .filter((i: any) => !i.completed)
      .reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 1), 0)

    // Category breakdown
    const categoryMap = new Map<string, { total: number; completed: number; cost: number }>()
    for (const item of (items as any[])) {
      const entry = categoryMap.get(item.category) || { total: 0, completed: 0, cost: 0 }
      entry.total++
      if (item.completed) entry.completed++
      else entry.cost += (item.price || 0) * (item.quantity || 1)
      categoryMap.set(item.category, entry)
    }

    const categories = Array.from(categoryMap.entries()).map(([name, stats]) => ({
      name,
      ...stats,
      pct: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }))

    return {
      completion: {
        total: totalItems,
        completed: completedItems,
        rate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      },
      budget: { spent: totalCost },
      categories,
      upcomingTasks: tasks.slice(0, 5),
      recentActivity: activity,
    }
  },
}
