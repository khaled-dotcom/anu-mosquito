import { createClient } from '@supabase/supabase-js'

// Public connection details for the ANU Mosquito Supabase project.
// The anon key is designed to be shipped to browsers: what each user can read or
// change is enforced by Row Level Security in the database.
// Never put the service_role / secret key in frontend code.
// VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY override these when set.
const DEFAULT_SUPABASE_URL = 'https://rydsexghjokzsyrjuozc.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_tHuGUtT65vhPGakuj3UhwA_ehQ0NK9-'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
