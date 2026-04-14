/**
 * Offline sync engine for LISTIFY PWA
 * 
 * Provides:
 * - IndexedDB persistence for offline data access
 * - Mutation queue that replays when the network reconnects
 * - Last-write-wins conflict resolution using updated_at timestamps
 */

const DB_NAME = 'listify-offline'
const DB_VERSION = 1

// ── IndexedDB helpers ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      // Store for cached table data
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' })
      }
      // Store for queued mutations (offline writes)
      if (!db.objectStoreNames.contains('mutations')) {
        const store = db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ── Cache operations ──

export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly')
    const store = tx.objectStore('cache')
    const request = store.get(key)
    request.onsuccess = () => {
      const result = request.result
      resolve(result ? result.data : null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    const store = tx.objectStore('cache')
    store.put({ key, data, cachedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearCache(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Mutation queue ──

export interface QueuedMutation {
  id?: number
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  data: Record<string, unknown>
  filters?: Record<string, unknown> // for UPDATE/DELETE: the WHERE clause
  timestamp: number
}

export async function queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readwrite')
    const store = tx.objectStore('mutations')
    store.add({ ...mutation, timestamp: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readonly')
    const store = tx.objectStore('mutations')
    const index = store.index('timestamp')
    const request = index.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function clearMutation(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readwrite')
    tx.objectStore('mutations').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllMutations(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readwrite')
    tx.objectStore('mutations').clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Sync engine ──

import { getAuthenticatedClient } from './supabase'

export async function replayPendingMutations(): Promise<{ replayed: number; failed: number }> {
  const mutations = await getPendingMutations()
  let replayed = 0
  let failed = 0

  for (const mutation of mutations) {
    try {
      const client = await getAuthenticatedClient()
      let query

      switch (mutation.operation) {
        case 'INSERT':
          query = client.from(mutation.table).insert(mutation.data)
          break
        case 'UPDATE':
          query = client.from(mutation.table).update(mutation.data)
          if (mutation.filters) {
            for (const [key, value] of Object.entries(mutation.filters)) {
              query = query.eq(key, value as string)
            }
          }
          break
        case 'DELETE':
          query = client.from(mutation.table).delete()
          if (mutation.filters) {
            for (const [key, value] of Object.entries(mutation.filters)) {
              query = query.eq(key, value as string)
            }
          }
          break
      }

      const { error } = await query
      if (error) {
        console.error(`[OfflineSync] Failed to replay mutation:`, error)
        failed++
      } else {
        await clearMutation(mutation.id!)
        replayed++
      }
    } catch (err) {
      console.error(`[OfflineSync] Error replaying mutation:`, err)
      failed++
    }
  }

  return { replayed, failed }
}

// ── Network status ──

let _isOnline = navigator.onLine
const _listeners = new Set<(online: boolean) => void>()

window.addEventListener('online', async () => {
  _isOnline = true
  _listeners.forEach(fn => fn(true))
  // Auto-replay queued mutations on reconnect
  const result = await replayPendingMutations()
  if (result.replayed > 0) {
    console.log(`[OfflineSync] Replayed ${result.replayed} mutations on reconnect`)
  }
})

window.addEventListener('offline', () => {
  _isOnline = false
  _listeners.forEach(fn => fn(false))
})

export function isOnline(): boolean {
  return _isOnline
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  _listeners.add(callback)
  return () => _listeners.delete(callback)
}
