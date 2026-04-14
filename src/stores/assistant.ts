/**
 * Assistant Store — AI suggestions with accept/dismiss
 */
import { create } from 'zustand'
import { getAuthenticatedClient } from '../lib/supabase'

export interface AISuggestion {
  id: string
  type: 'item' | 'task' | 'budget' | 'efficiency'
  title: string
  body: string
  action_type: string | null
  action_data: Record<string, any> | null
  source: string
  status: 'pending' | 'accepted' | 'dismissed'
  confidence: number
  created_at: string
}

interface AssistantContext {
  lists: { total_items: number; completed: number; completion_rate: number; pending_cost: number; categories: string[]; recurring: any[]; priority_items: string[] }
  planner: { upcoming: any[]; overdue: any[]; free_days: string[] }
  insights: { budget_status: string; budget_pct: number; budget_remaining: number; completion_trend: number | null }
  settings: { currency: string; budget: number; ai_personalization: boolean }
  recent_activity: any[]
}

interface AssistantState {
  suggestions: AISuggestion[]
  context: AssistantContext | null
  loading: boolean
  generating: boolean
  error: string | null

  fetchSuggestions: () => Promise<void>
  generateSuggestions: () => Promise<void>
  acceptSuggestion: (id: string) => Promise<void>
  dismissSuggestion: (id: string) => Promise<void>
  fetchContext: () => Promise<void>
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  suggestions: [],
  context: null,
  loading: false,
  generating: false,
  error: null,

  fetchSuggestions: async () => {
    set({ loading: true })
    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client.functions.invoke('assistant-suggest')
      if (error) throw error
      set({ suggestions: data?.suggestions || [], loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  generateSuggestions: async () => {
    set({ generating: true })
    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client.functions.invoke('assistant-suggest', { method: 'POST', body: {} })
      if (error) throw error
      // Merge new suggestions with existing pending ones
      const existing = get().suggestions
      const newIds = new Set((data?.suggestions || []).map((s: any) => s.id))
      const merged = [...existing.filter(s => !newIds.has(s.id)), ...(data?.suggestions || [])]
      set({ suggestions: merged, generating: false })
    } catch (error: any) {
      console.error('Failed to generate suggestions:', error)
      set({ error: error?.message || 'Failed to connect to the AI service. Please try again later.', generating: false })
    }
  },

  acceptSuggestion: async (id: string) => {
    // Optimistic update
    set(s => ({ suggestions: s.suggestions.map(sg => sg.id === id ? { ...sg, status: 'accepted' as const } : sg) }))
    try {
      const client = await getAuthenticatedClient()
      const { error } = await client.functions.invoke('assistant-suggest/accept', { method: 'POST', body: { suggestion_id: id } })
      if (error) throw error
    } catch (err) {
      // Rollback
      set(s => ({ suggestions: s.suggestions.map(sg => sg.id === id ? { ...sg, status: 'pending' as const } : sg) }))
    }
  },

  dismissSuggestion: async (id: string) => {
    set(s => ({ suggestions: s.suggestions.map(sg => sg.id === id ? { ...sg, status: 'dismissed' as const } : sg) }))
    try {
      const client = await getAuthenticatedClient()
      const { error } = await client.functions.invoke('assistant-suggest/dismiss', { method: 'POST', body: { suggestion_id: id } })
      if (error) throw error
    } catch (err) {
      set(s => ({ suggestions: s.suggestions.map(sg => sg.id === id ? { ...sg, status: 'pending' as const } : sg) }))
    }
  },

  fetchContext: async () => {
    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client.functions.invoke('assistant-context')
      if (error) throw error
      set({ context: data })
    } catch (err) {
      console.error('[Assistant] Failed to fetch context:', err)
    }
  },
}))
