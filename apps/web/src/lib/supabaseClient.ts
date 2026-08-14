import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[chez-sanji] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy apps/web/.env.example to apps/web/.env and fill in your Supabase project credentials.',
  )
}

// Hand-rolled domain types (src/types/domain.ts) are used at the call sites
// instead of a generated Database type, since most of this app's writes go
// through SECURITY DEFINER RPCs rather than raw table access.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')
