/**
 * Hook to track online/offline network status
 */
import { useState, useEffect } from 'react'
import { isOnline, onNetworkChange } from '../lib/offlineSync'

export function useOfflineStatus() {
  const [online, setOnline] = useState(isOnline())

  useEffect(() => {
    const unsubscribe = onNetworkChange(setOnline)
    return unsubscribe
  }, [])

  return { isOnline: online, isOffline: !online }
}
