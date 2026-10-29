import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Read the auth info Supabase puts in the URL after an email link, BEFORE the
// client is created: supabase-js strips the hash and may emit PASSWORD_RECOVERY
// before React has subscribed, so we can't rely on catching the event alone.
const readAuthUrlState = () => {
  if (typeof window === 'undefined') return { isRecovery: false, errorCode: null };
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  return {
    isRecovery: hash.get('type') === 'recovery' || query.get('type') === 'recovery',
    errorCode: hash.get('error_code') || query.get('error_code') || hash.get('error') || query.get('error') || null
  };
};
export const authUrlState = readAuthUrlState();

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
