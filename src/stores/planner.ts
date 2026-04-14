/**
 * Planner store backed by Supabase planner_tasks table
 * 
 * Currently the PlannerPage adds items directly to the list store.
 * This store manages planner-specific tasks (scheduled tasks, priority,
 * status tracking) as a separate entity with linked list items.
 */
import { create } from 'zustand'
import { plannerApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert } from '../types/database'

type PlannerTask = Tables<'planner_tasks'>

export type PlannerFilter = 'all' | 'pending' | 'in_progress' | 'done'
export type PlannerSort = 'scheduled_date' | 'priority' | 'created_at'

interface PlannerStore {
  tasks: PlannerTask[]
  loading: boolean
  error: string | null
  filter: PlannerFilter
  sort: PlannerSort
  selectedCategory: string | null

  // Data operations
  loadTasks: (userId: string) => Promise<void>
  subscribeToRealtime: (userId: string) => () => void
  addTask: (task: TablesInsert<'planner_tasks'>) => Promise<void>
  updateTask: (id: string, updates: Partial<PlannerTask>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>

  // Filter/sort
  setFilter: (filter: PlannerFilter) => void
  setSort: (sort: PlannerSort) => void
  setSelectedCategory: (category: string | null) => void

  // Selectors
  getFilteredTasks: () => PlannerTask[]
  getUpcoming: (days?: number) => PlannerTask[]
}

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  filter: 'all',
  sort: 'scheduled_date',
  selectedCategory: null,

  loadTasks: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      const tasks = await plannerApi.getAll()
      set({ tasks, loading: false })
    } catch (err) {
      console.error('[PlannerStore] Failed to load tasks:', err)
      set({ error: 'Failed to load tasks', loading: false })
    }
  },

  subscribeToRealtime: (userId: string) => {
    const channel = supabase
      .channel(`planner_tasks:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planner_tasks', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const state = get()
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as PlannerTask
            if (!state.tasks.find(t => t.id === newTask.id)) {
              set({ tasks: [newTask, ...state.tasks] })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as PlannerTask
            set({ tasks: state.tasks.map(t => t.id === updated.id ? updated : t) })
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id
            set({ tasks: state.tasks.filter(t => t.id !== oldId) })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  addTask: async (task) => {
    try {
      const newTask = await plannerApi.create(task)
      set((s) => ({ tasks: [newTask, ...s.tasks] }))
    } catch (err) {
      console.error('[PlannerStore] Failed to add task:', err)
    }
  },

  updateTask: async (id, updates) => {
    const current = get().tasks
    // Optimistic update
    set({
      tasks: current.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })
    try {
      await plannerApi.update(id, updates)
    } catch (err) {
      console.error('[PlannerStore] Failed to update task:', err)
      set({ tasks: current }) // Revert
    }
  },

  deleteTask: async (id) => {
    const current = get().tasks
    set({ tasks: current.filter((t) => t.id !== id) })
    try {
      await plannerApi.delete(id)
    } catch (err) {
      console.error('[PlannerStore] Failed to delete task:', err)
      set({ tasks: current })
    }
  },

  completeTask: async (id) => {
    await get().updateTask(id, { status: 'done' })
  },

  setFilter: (filter) => set({ filter }),
  setSort: (sort) => set({ sort }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredTasks: () => {
    const { tasks, filter, sort, selectedCategory } = get()
    let result = [...tasks]

    // Filter by status
    if (filter !== 'all') {
      result = result.filter((t) => t.status === filter)
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory)
    }

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case 'scheduled_date':
          return (a.scheduled_date || '9999').localeCompare(b.scheduled_date || '9999')
        case 'priority':
          return (priorityOrder[a.priority || 'medium'] || 2) - (priorityOrder[b.priority || 'medium'] || 2)
        case 'created_at':
          return (b.created_at || '').localeCompare(a.created_at || '')
        default:
          return 0
      }
    })

    return result
  },

  getUpcoming: (days = 7) => {
    const { tasks } = get()
    const today = new Date()
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() + days)
    const todayStr = today.toISOString().split('T')[0]!
    const cutoffStr = cutoff.toISOString().split('T')[0]!

    return tasks
      .filter(
        (t) =>
          t.status === 'pending' &&
          t.scheduled_date &&
          t.scheduled_date >= todayStr &&
          t.scheduled_date <= cutoffStr
      )
      .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))
  },
}))
