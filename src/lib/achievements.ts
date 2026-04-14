/**
 * Achievement Engine — checks milestones and triggers achievement notifications
 */
import { useListStore, getTotalCost } from '../stores/list'
import { useNotificationStore } from '../stores/notifications'
import { SUPABASE_URL, SUPABASE_ANON_KEY, getAuthenticatedClient } from '../lib/supabase'

interface AchievementDef {
  id: string
  icon: string
  title: string
  body: string
  check: (stats: AchievementStats) => boolean
}

interface AchievementStats {
  totalItems: number
  completedItems: number
  totalSpent: number
  weeklyBudget: number
  completionRate: number
  listsCreated: number
  streakDays: number
}

// Achievement definitions
const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_item',
    icon: '🎯',
    title: 'First Steps!',
    body: 'You added your first item to LISTIFY. Welcome aboard!',
    check: (s) => s.totalItems >= 1,
  },
  {
    id: 'ten_items',
    icon: '📋',
    title: 'Getting Organized',
    body: 'You\'ve tracked 10 items. You\'re on a roll!',
    check: (s) => s.totalItems >= 10,
  },
  {
    id: 'fifty_items',
    icon: '🏆',
    title: 'List Master',
    body: '50 items tracked! You\'re a productivity powerhouse.',
    check: (s) => s.totalItems >= 50,
  },
  {
    id: 'first_complete',
    icon: '✅',
    title: 'Task Slayer',
    body: 'You completed your first item. Keep the momentum!',
    check: (s) => s.completedItems >= 1,
  },
  {
    id: 'ten_complete',
    icon: '⚡',
    title: 'On Fire!',
    body: '10 items completed. Nothing can stop you!',
    check: (s) => s.completedItems >= 10,
  },
  {
    id: 'perfect_week',
    icon: '💯',
    title: 'Perfect Week',
    body: '100% completion rate! Everything on your list is done.',
    check: (s) => s.completionRate === 100 && s.totalItems >= 5,
  },
  {
    id: 'budget_master',
    icon: '💰',
    title: 'Budget Master',
    body: 'You stayed under your weekly budget. Smart shopping!',
    check: (s) => s.weeklyBudget > 0 && s.totalSpent <= s.weeklyBudget && s.totalSpent > 0,
  },
  {
    id: 'big_saver',
    icon: '🏦',
    title: 'Big Saver',
    body: 'Spent less than 50% of your budget. Impressive discipline!',
    check: (s) => s.weeklyBudget > 0 && s.totalSpent <= s.weeklyBudget * 0.5 && s.totalSpent > 0,
  },
  {
    id: 'centurion',
    icon: '💎',
    title: 'Centurion',
    body: '100 items completed total! You\'re a LISTIFY legend.',
    check: (s) => s.completedItems >= 100,
  },
]

// Storage key for tracking which achievements have been unlocked
const ACHIEVEMENTS_KEY = 'listify_achievements'

function getUnlockedAchievements(): Set<string> {
  try {
    const stored = localStorage.getItem(ACHIEVEMENTS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function saveUnlockedAchievements(set: Set<string>) {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...set]))
}

/**
 * Check and trigger new achievements
 * Call this after item toggles, additions, budget changes
 */
export async function checkAchievements(): Promise<string[]> {
  const { items, weeklyBudget } = useListStore.getState()
  const completedItems = items.filter(i => i.completed).length
  const totalItems = items.length
  const totalSpent = getTotalCost(items, true)
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  const stats: AchievementStats = {
    totalItems,
    completedItems,
    totalSpent,
    weeklyBudget,
    completionRate,
    listsCreated: 1, // default for now
    streakDays: 0,   // future enhancement
  }

  const unlocked = getUnlockedAchievements()
  const newlyUnlocked: string[] = []

  for (const achievement of ACHIEVEMENTS) {
    if (!unlocked.has(achievement.id) && achievement.check(stats)) {
      unlocked.add(achievement.id)
      newlyUnlocked.push(achievement.id)

      // Push notification
      try {
        const client = await getAuthenticatedClient()
        const token = (client as any).rest?.headers?.Authorization
        await fetch(`${SUPABASE_URL}/functions/v1/notifications-push`, {
          method: 'POST',
          headers: {
            'Authorization': token || `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            type: 'achievement',
            title: `${achievement.icon} ${achievement.title}`,
            body: achievement.body,
          }),
        })
      } catch {
        // Silently fail — achievement is still tracked locally
      }

      // Refresh notification panel
      useNotificationStore.getState().fetchNotifications()
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedAchievements(unlocked)
  }

  return newlyUnlocked
}

/**
 * Get all achievement definitions with their unlock status
 */
export function getAllAchievements() {
  const unlocked = getUnlockedAchievements()
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlocked.has(a.id),
  }))
}

/**
 * Get count of unlocked achievements
 */
export function getUnlockedCount(): number {
  return getUnlockedAchievements().size
}

export { ACHIEVEMENTS }
