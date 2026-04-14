import { ListItem } from '../stores/list'
import { Tables } from '../types/database'

type PlannerTask = Tables<'planner_tasks'>

export function generateListsCSV(items: ListItem[]): Blob {
  const headers = ['Name', 'Category', 'Quantity', 'Status', 'Priority', 'Price', 'Due Date']
  const rows = items.map(i => [
    `"${i.name.replace(/"/g, '""')}"`,
    `"${i.category}"`,
    i.quantity,
    i.completed ? 'Completed' : 'Pending',
    i.priority ? 'Yes' : 'No',
    i.price || '',
    i.dueDate || ''
  ])

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}

export function generatePlannerCSV(tasks: PlannerTask[]): Blob {
  const headers = ['Title', 'Category', 'Status', 'Priority', 'Scheduled Date']
  const rows = tasks.map(t => [
    `"${t.title.replace(/"/g, '""')}"`,
    `"${t.category}"`,
    t.status,
    t.priority || 'medium',
    t.scheduled_date || ''
  ])

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
