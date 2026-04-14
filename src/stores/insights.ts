/**
 * Insights Store — persisted analytics with historical snapshots
 */
import { create } from 'zustand'
import { getAuthenticatedClient, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'
import { useListStore } from './list'
import { useSettingsStore } from './settings'

interface InsightsSnapshot {
  period: { start: string; end: string; type: string }
  budget: { limit: number; actual: number; completed_spend: number; remaining: number; pct: number }
  completion: { total: number; completed: number; rate: number }
  categories: { name: string; spent: number; items: number; completed: number; rate: number }[]
  recurring: { count: number; monthly_cost: number }
  planner: { pending: number; done: number; overdue: number }
  trends: { completion_delta: number | null; budget_delta: number | null }
}

interface InsightsState {
  snapshot: InsightsSnapshot | null
  history: { period_start: string; data: InsightsSnapshot }[]
  loading: boolean
  error: string | null

  fetchInsights: (range?: 'weekly' | 'monthly') => Promise<void>
  saveSnapshot: (range?: 'weekly' | 'monthly') => Promise<void>
  fetchHistory: (range?: 'weekly' | 'monthly', limit?: number) => Promise<void>
  exportReport: (format: 'csv' | 'pdf', sections?: string[]) => Promise<Blob | null>
}

export const useInsightsStore = create<InsightsState>((set, get) => ({
  snapshot: null,
  history: [],
  loading: false,
  error: null,

  fetchInsights: async (range = 'weekly') => {
    set({ loading: true, error: null })
    try {
      const client = await getAuthenticatedClient()
      const token = (client as any).rest?.headers?.Authorization
      const res = await fetch(`${SUPABASE_URL}/functions/v1/insights-aggregate?range=${range}`, {
        headers: {
          'Authorization': token || `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
      })
      if (!res.ok) throw new Error(`Failed to fetch insights: ${res.statusText}`)
      const data = await res.json()
      set({ snapshot: data, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  saveSnapshot: async (range = 'weekly') => {
    try {
      const client = await getAuthenticatedClient()
      const token = (client as any).rest?.headers?.Authorization
      await fetch(`${SUPABASE_URL}/functions/v1/insights-aggregate?range=${range}`, {
        method: 'POST',
        headers: {
          'Authorization': token || `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
      })
    } catch (err) {
      console.error('[Insights] Failed to save snapshot:', err)
    }
  },

  fetchHistory: async (range = 'weekly', limit = 8) => {
    try {
      const client = await getAuthenticatedClient()
      const { data } = await client
        .from('insights_snapshots')
        .select('period_start,data')
        .eq('snapshot_type', range)
        .order('period_start', { ascending: false })
        .limit(limit)
      set({ history: (data || []).reverse() as any })
    } catch (err) {
      console.error('[Insights] Failed to fetch history:', err)
    }
  },

  exportReport: async (format, sections = ['items', 'budget', 'categories', 'tasks']) => {
    try {
      const { items, weeklyBudget } = useListStore.getState()
      const currency = useSettingsStore.getState().settings?.currency || 'PHP'
      
      const formatCurr = (val: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(val)

      if (format === 'csv') {
        const rows = [
          ['Name', 'Category', 'Quantity', 'Unit Price', 'Total', 'Status', 'Due Date']
        ]
        
        items.forEach(i => {
          const total = i.price ? i.price * i.quantity : 0
          rows.push([
            `"${i.name.replace(/"/g, '""')}"`,
            `"${i.category}"`,
            i.quantity.toString(),
            i.price ? `${i.price}` : '0',
            `${total}`,
            i.completed ? 'Completed' : 'Pending',
            i.dueDate ? `"${new Date(i.dueDate).toLocaleDateString()}"` : 'None'
          ])
        })
        
        const csvContent = rows.map(r => r.join(',')).join('\n')
        return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      }

      // PDF: open HTML in new window for printing
      const html = `
        <!DOCTYPE html>
        <html><head><title>LISTIFY Report</title><style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
          h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 0.5rem; letter-spacing: -0.02em; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.875rem; }
          th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #eaeaea; }
          th { background: #f9f9f9; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }
          .summary { display: flex; gap: 3rem; margin: 1.5rem 0; padding: 1.5rem; background: #f4f5f7; border-radius: 0.75rem; }
          .stat { display: flex; flex-direction: column; }
          .stat .val { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; color: #0058bc; }
          .stat .lbl { font-size: 0.75rem; color: #666; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
        </style></head><body>
          <h1>LISTIFY Export Report</h1>
          <div class="summary">
            <div class="stat"><span class="lbl">Total Items</span><span class="val">${items.length}</span></div>
            <div class="stat"><span class="lbl">Completed</span><span class="val">${items.filter(i=>i.completed).length}</span></div>
            <div class="stat"><span class="lbl">Weekly Budget</span><span class="val">${formatCurr(weeklyBudget)}</span></div>
          </div>
          <table>
            <tr><th>Name</th><th>Category</th><th>Qty</th><th>Status</th><th>Total Price</th></tr>
            ${items.map(i => `
              <tr>
                <td style="font-weight: 600;">${i.name}</td>
                <td>${i.category}</td>
                <td>${i.quantity}</td>
                <td>${i.completed ? '✅ Done' : '⏳ Pending'}</td>
                <td style="font-weight: 700;">${i.price ? formatCurr(i.price * i.quantity) : '-'}</td>
              </tr>
            `).join('')}
          </table>
          <p style="margin-top: 2rem; font-size: 0.75rem; color: #888; text-align: center;">Generated on ${new Date().toLocaleString()}</p>
        </body></html>
      `
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        setTimeout(() => win.print(), 250)
      }
      return null
    } catch (err) {
      console.error('[Insights] Export failed:', err)
      return null
    }
  },
}))
