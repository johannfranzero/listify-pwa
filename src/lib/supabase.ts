/**
 * Supabase client configuration for LISTIFY
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xxyydlrywxrnqiozffjw.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eXlkbHJ5d3hybnFpb3pmZmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDg2NjksImV4cCI6MjA4OTg4NDY2OX0.LNwSgv0V97dkqmBgTymGjNQIWzcapTEk9dMUOVTz6E4'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

/**
 * Get the Supabase client.
 */
export async function getAuthenticatedClient() {
  return supabase
}

export { SUPABASE_URL, SUPABASE_ANON_KEY }
