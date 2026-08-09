import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surface a clear message during dev instead of a cryptic runtime crash.
  console.warn(
    'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in web/.env.local',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')

export const isSupabaseConfigured = Boolean(url && anonKey)
