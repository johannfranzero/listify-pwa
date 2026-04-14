import { useState, useMemo, useEffect } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, ArcElement, PointElement, LineElement, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { useNavigate } from 'react-router-dom'
import { useListStore, getCategoryProgress, getTotalCost } from '../stores/list'
import { useInsightsStore } from '../stores/insights'
import { useCurrency } from '../hooks/useCurrency'
import { useIsDesktop } from '../hooks/useMediaQuery'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, ArcElement, PointElement, LineElement, Filler)

const avatarColors = ['#0058bc', '#9e3d00', '#405e96', '#34c759']
const categoryColors: Record<string, string> = {
  Produce: '#34c759',
  Dairy: '#5ac8fa',
  Pantry: '#ff9500',
  Bakery: '#af52de',
  Health: '#ff2d55',
  Travel: '#007aff',
}

// Fallback data (used when no backend history is available yet)
const defaultWeeklyHistory = [
  { week: 'W1', budget: 75, actual: 62 },
  { week: 'W2', budget: 75, actual: 71 },
  { week: 'W3', budget: 75, actual: 88 },
  { week: 'W4', budget: 75, actual: 54 },
]

const defaultCompletionTrend = [
  { day: 'Mon', pct: 45 },
  { day: 'Tue', pct: 60 },
  { day: 'Wed', pct: 55 },
  { day: 'Thu', pct: 72 },
  { day: 'Fri', pct: 80 },
  { day: 'Sat', pct: 92 },
  { day: 'Sun', pct: 85 },
]

type TimeRange = 'weekly' | 'monthly'

export default function InsightsPage() {
  const navigate = useNavigate()
  const { items, weeklyBudget, collaborators } = useListStore()
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly')
  const { snapshot, history, fetchInsights, fetchHistory, exportReport } = useInsightsStore()
  const { formatCurrency, formatCurrencyCompact } = useCurrency()
  const isDesktop = useIsDesktop()
  const [exporting, setExporting] = useState(false)

  // Fetch insights data from backend
  useEffect(() => {
    fetchInsights(timeRange)
    fetchHistory(timeRange)
  }, [timeRange])

  // Build chart data from backend history or fallback
  const weeklyHistory = useMemo(() => {
    if (history.length >= 2) {
      return history.slice(-4).map((h, i) => ({
        week: `W${i + 1}`,
        budget: (h.data as any)?.budget?.limit || weeklyBudget,
        actual: (h.data as any)?.budget?.actual || 0,
      }))
    }
    return defaultWeeklyHistory
  }, [history, weeklyBudget])

  const completionTrend = useMemo(() => {
    if (snapshot?.completion) {
      // Generate trend from current data
      const rate = snapshot.completion.rate
      return defaultCompletionTrend.map((d, i) => ({
        ...d,
        pct: Math.max(0, Math.min(100, rate + (i - 3) * 5 + Math.round(Math.random() * 10 - 5))),
      }))
    }
    return defaultCompletionTrend
  }, [snapshot])

  const totalCost = getTotalCost(items, false) // all items
  const pendingCost = getTotalCost(items, true)
  const completedCost = totalCost - pendingCost
  const catProgress = getCategoryProgress(items)
  const totalItems = items.length
  const completedItems = items.filter(i => i.completed).length
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Recurring analysis
  const recurringItems = useMemo(() => {
    const recItems = items.filter(i => i.recurring)
    const freq = new Map<string, number>()
    for (const i of recItems) {
      freq.set(i.name, (freq.get(i.name) || 0) + 1)
    }
    return recItems.map(i => ({
      name: i.name,
      interval: i.recurring!.interval,
      cost: (i.price || 0) * i.quantity,
      monthlyCost: (i.price || 0) * i.quantity * (i.recurring!.interval === 'daily' ? 30 : i.recurring!.interval === 'weekly' ? 4 : i.recurring!.interval === 'biweekly' ? 2 : 1),
    })).filter((v, i, a) => a.findIndex(x => x.name === v.name) === i)
  }, [items])

  // Collaborator contributions
  const collabMetrics = useMemo(() => {
    const map = new Map<string, { added: number; completed: number }>()
    for (const c of collaborators) map.set(c.id, { added: 0, completed: 0 })
    for (const item of items) {
      if (item.addedBy && map.has(item.addedBy)) {
        map.get(item.addedBy)!.added++
        if (item.completed) map.get(item.addedBy)!.completed++
      }
    }
    return collaborators.map(c => ({ ...c, ...map.get(c.id)! }))
  }, [items, collaborators])

  // Category spending for doughnut
  const catSpending = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      const cost = (item.price || 0) * item.quantity
      map.set(item.category, (map.get(item.category) || 0) + cost)
    }
    return Array.from(map.entries()).map(([cat, amount]) => ({ cat, amount: parseFloat(amount.toFixed(2)) }))
  }, [items])

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights: { icon: string; title: string; body: string; type: 'info' | 'warning' | 'success' }[] = []
    const budgetPct = (pendingCost / weeklyBudget) * 100
    if (budgetPct > 80) {
      insights.push({ icon: 'warning', title: 'Budget Alert', body: `You've used ${budgetPct.toFixed(0)}% of your weekly budget. Consider deferring non-essential items.`, type: 'warning' })
    } else {
      insights.push({ icon: 'savings', title: 'Budget on Track', body: `You're at ${budgetPct.toFixed(0)}% of your weekly budget with ${formatCurrency(weeklyBudget - pendingCost)} remaining.`, type: 'success' })
    }
    if (recurringItems.length > 0) {
      const totalMonthly = recurringItems.reduce((s, i) => s + i.monthlyCost, 0)
      insights.push({ icon: 'repeat', title: 'Recurring Spend', body: `Your ${recurringItems.length} recurring items cost ~${formatCurrency(totalMonthly)}/month. Buying in bulk could save 15-20%.`, type: 'info' })
    }
    const topCat = catSpending.sort((a, b) => b.amount - a.amount)[0]
    if (topCat) {
      insights.push({ icon: 'category', title: 'Top Category', body: `${topCat.cat} accounts for ${formatCurrency(topCat.amount)} of your spending. Compare prices across stores to save.`, type: 'info' })
    }
    if (completionRate >= 80) {
      insights.push({ icon: 'emoji_events', title: 'Great Progress!', body: `You've completed ${completionRate}% of your items. Keep up the momentum!`, type: 'success' })
    }
    return insights
  }, [pendingCost, weeklyBudget, recurringItems, catSpending, completionRate])

  // Goal tracking
  const goals = [
    { name: 'Weekly Grocery Budget', current: pendingCost, target: weeklyBudget, icon: 'shopping_cart', color: 'var(--primary)' },
    { name: 'Items Completed', current: completedItems, target: totalItems, icon: 'task_alt', color: 'var(--success)' },
    { name: 'Health Items', current: items.filter(i => i.category === 'Health' && i.completed).length || 2, target: items.filter(i => i.category === 'Health').length || 5, icon: 'favorite', color: '#ff2d55' },
  ]

  // ── Charts ──

  const budgetChartData = {
    labels: weeklyHistory.map(w => w.week),
    datasets: [
      {
        label: 'Budget',
        data: weeklyHistory.map(w => w.budget),
        backgroundColor: 'rgba(0, 88, 188, 0.15)',
        borderRadius: 6,
        borderWidth: 0,
        barPercentage: 0.5,
        categoryPercentage: 0.7,
      },
      {
        label: 'Actual',
        data: weeklyHistory.map(w => w.actual),
        backgroundColor: (ctx: any) => weeklyHistory[ctx.dataIndex]?.actual > weeklyHistory[ctx.dataIndex]?.budget ? '#ff3b30' : '#0058bc',
        borderRadius: 6,
        borderWidth: 0,
        barPercentage: 0.5,
        categoryPercentage: 0.7,
      },
    ],
  }

  const budgetChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#1a1c1f', padding: 8, cornerRadius: 8,
      callbacks: { label: (ctx: any) => formatCurrency(ctx.raw) },
    }},
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#717786' }, border: { display: false } },
      y: { display: false },
    },
  }

  const doughnutData = {
    labels: catSpending.map(c => c.cat),
    datasets: [{
      data: catSpending.map(c => c.amount),
      backgroundColor: catSpending.map(c => categoryColors[c.cat] || '#717786'),
      borderWidth: 2,
      borderColor: 'var(--surface-container-lowest)',
    }],
  }

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#1a1c1f', padding: 8, cornerRadius: 8,
      callbacks: { label: (ctx: any) => formatCurrency(ctx.raw) },
    }},
  }

  const trendData = {
    labels: completionTrend.map(d => d.day),
    datasets: [{
      data: completionTrend.map(d => d.pct),
      borderColor: '#0058bc',
      backgroundColor: 'rgba(0, 88, 188, 0.08)',
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.4,
      fill: true,
    }],
  }

  const trendOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#1a1c1f', padding: 8, cornerRadius: 8,
      callbacks: { label: (ctx: any) => `${ctx.raw}%` },
    }},
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#717786' }, border: { display: false } },
      y: { display: false, min: 0, max: 100 },
    },
  }

  const sectionLabel = (text: string) => (
    <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>{text}</p>
  )

  const handleExport = async (format: 'pdf' | 'csv') => {
    setExporting(true)
    try {
      const blob = await exportReport(format)
      if (blob && format === 'csv') {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `listify-report-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={isDesktop ? 'desktop-page-padding' : ''} style={{ padding: isDesktop ? undefined : '1rem 1rem 1.5rem', minHeight: isDesktop ? '100dvh' : undefined }}>
      {/* ── Header ── */}
      <div className={isDesktop ? 'desktop-header' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDesktop ? 0 : '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffb595, #ff9500)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: 'white' }}>insights</span>
          </div>
          <h1 style={{ fontSize: isDesktop ? '1.5rem' : '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Insights</h1>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface-variant)', cursor: 'pointer' }}
          onClick={() => navigate('/settings')}>settings</span>
      </div>

      {/* ── Time Range Toggle ── */}
      <div className="filter-pills" style={{ marginBottom: '1.25rem' }}>
        {(['weekly', 'monthly'] as TimeRange[]).map(t => (
          <button key={t} className={`filter-pill ${timeRange === t ? 'active' : ''}`} onClick={() => setTimeRange(t)}>
            {t === 'weekly' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {/* ── Charts (side-by-side on desktop) ── */}
      <div className="desktop-charts-grid">
      {/* ── Budget vs Actual ── */}
      <div className="card animate-slide-up" style={{ marginBottom: '1rem', opacity: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Budget vs Actual</h3>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.6875rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(0,88,188,0.15)', display: 'inline-block' }} /> Budget
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0058bc', display: 'inline-block' }} /> Actual
            </span>
          </div>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
          {timeRange === 'weekly' ? 'Last 4 weeks' : 'Last 4 months'}
        </p>
        <div style={{ height: 180 }}>
          <Bar data={budgetChartData} options={budgetChartOpts} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.75rem' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrencyCompact(pendingCost)}</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Pending</p>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.75rem' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{formatCurrencyCompact(completedCost)}</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Completed</p>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', background: pendingCost > weeklyBudget ? 'color-mix(in srgb, var(--error) 8%, var(--surface-container-low))' : 'var(--surface-container-low)', borderRadius: '0.75rem' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: pendingCost > weeklyBudget ? 'var(--error)' : 'var(--on-surface)' }}>
              {formatCurrencyCompact(weeklyBudget - pendingCost)}
            </p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>
              {pendingCost > weeklyBudget ? 'Over Budget' : 'Remaining'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Category Breakdown (Doughnut) ── */}
      <div className="card animate-slide-up stagger-1" style={{ marginBottom: '1rem', opacity: 0 }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '1rem' }}>Category Breakdown</h3>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ width: 140, height: 140, flexShrink: 0 }}>
            <Doughnut data={doughnutData} options={doughnutOpts} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {catSpending.map(c => (
              <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: categoryColors[c.cat] || '#717786', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600 }}>{c.cat}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>{formatCurrencyCompact(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>{/* end desktop-charts-grid */}

      {/* ── Completion Trend ── */}
      <div className="card animate-slide-up stagger-2" style={{ marginBottom: '1rem', opacity: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Completion Trend</h3>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--success)' }}>{completionRate}%</span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>Task completion rate this week</p>
        <div style={{ height: 140 }}>
          <Line data={trendData} options={trendOpts} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.75rem' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>{completionRate}%</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Completed</p>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.75rem' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>{totalItems}</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>Total Items</p>
          </div>
        </div>
      </div>

      {/* ── AI Smart Insights ── */}
      <div className="animate-slide-up stagger-3" style={{ marginBottom: '1rem', opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: 'var(--primary)' }}>auto_awesome</span>
          {sectionLabel('AI Smart Insights')}
        </div>
        {aiInsights.map((insight, i) => (
          <div key={i} className="card" style={{
            marginBottom: '0.625rem',
            background: insight.type === 'warning'
              ? 'color-mix(in srgb, var(--warning) 6%, var(--surface-container-lowest))'
              : insight.type === 'success'
              ? 'color-mix(in srgb, var(--success) 6%, var(--surface-container-lowest))'
              : undefined,
            borderLeft: `3px solid ${insight.type === 'warning' ? 'var(--warning)' : insight.type === 'success' ? 'var(--success)' : 'var(--primary)'}`,
            borderRadius: '0 1.25rem 1.25rem 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <span className="material-symbols-outlined filled" style={{
                fontSize: 18,
                color: insight.type === 'warning' ? 'var(--warning)' : insight.type === 'success' ? 'var(--success)' : 'var(--primary)',
              }}>{insight.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{insight.title}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{insight.body}</p>
          </div>
        ))}
      </div>

      {/* ── Recurring Item Analysis ── */}
      {recurringItems.length > 0 && (
        <div className="card animate-slide-up stagger-4" style={{ marginBottom: '1rem', opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>repeat</span>
            <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Recurring Items</h3>
          </div>
          {recurringItems.map(ri => (
            <div key={ri.name} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 0',
              borderBottom: '1px solid var(--surface-container-high)',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{ri.name}</p>
                <span className="badge badge-recurring" style={{ marginTop: '0.25rem' }}>{ri.interval}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{formatCurrency(ri.cost)}</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>~{formatCurrency(ri.monthlyCost)}/mo</p>
              </div>
            </div>
          ))}
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.75rem', fontStyle: 'italic' }}>
            💡 Tip: Buy recurring items in bulk during sales to save up to 20%.
          </p>
        </div>
      )}

      {/* ── Collaboration Metrics ── */}
      <div className="card animate-slide-up stagger-5" style={{ marginBottom: '1rem', opacity: 0 }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '1rem' }}>Team Contributions</h3>
        {collabMetrics.map((c, ci) => {
          const pct = c.added > 0 ? Math.round((c.completed / c.added) * 100) : 0
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: avatarColors[ci % avatarColors.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800, color: 'white', flexShrink: 0,
              }}>{c.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{c.name}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>{c.added} items</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
            </div>
          )
        })}
      </div>

      {/* ── Goal Tracking ── */}
      <div className="card animate-slide-up" style={{ marginBottom: '1rem', opacity: 0, animationDelay: '0.3s' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '1rem' }}>Goals</h3>
        {goals.map(g => {
          const pct = g.target > 0 ? Math.min(Math.round((g.current / g.target) * 100), 100) : 0
          return (
            <div key={g.name} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <span className="material-symbols-outlined filled" style={{ fontSize: 18, color: g.color }}>{g.icon}</span>
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{g.name}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                  {typeof g.current === 'number' && g.name.includes('Budget') ? formatCurrencyCompact(g.current) : g.current} / {typeof g.target === 'number' && g.name.includes('Budget') ? formatCurrencyCompact(g.target) : g.target}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Category Progress (from List) ── */}
      <div className="card animate-slide-up" style={{ marginBottom: '1rem', opacity: 0, animationDelay: '0.35s' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.75rem' }}>Category Completion</h3>
        {catProgress.map(cp => (
          <div key={cp.category} className="category-progress-row">
            <span className="category-progress-label">{cp.category}</span>
            <div style={{ flex: 1 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${cp.pct}%`, background: categoryColors[cp.category] || 'var(--primary)' }} />
              </div>
            </div>
            <span className="category-progress-pct">{cp.completed}/{cp.total}</span>
          </div>
        ))}
      </div>

      {/* ── Export ── */}
      <div className="animate-slide-up" style={{ opacity: 0, animationDelay: '0.4s', marginBottom: '1rem' }}>
        {sectionLabel('Export Report')}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => handleExport('pdf')} className="btn-secondary" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.875rem', borderRadius: '1rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>picture_as_pdf</span>
            Export PDF
          </button>
          <button onClick={() => handleExport('csv')} className="btn-secondary" style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.875rem', borderRadius: '1rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>table_chart</span>
            Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}
