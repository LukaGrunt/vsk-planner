import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable persistent sessions (users stay logged in)
    persistSession: true,
    // Store session in localStorage (survives browser restarts)
    storage: window.localStorage,
    // Automatically refresh tokens before expiry
    autoRefreshToken: true,
    // Detect session changes in other tabs
    detectSessionInUrl: true
  }
})
