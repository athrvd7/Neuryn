import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surface a clear message during dev instead of a cryptic runtime crash.
  console.warn(
    'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in web/.env.local',
  )
}

// Keep the public site renderable even before Supabase is configured in Vercel.
// Auth actions remain disabled by the login page until real variables exist.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
)

export const isSupabaseConfigured = Boolean(url && anonKey)
