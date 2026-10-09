import { createClient } from '@supabase/supabase-js'

// Public connection details for the ANU Mosquito Supabase project.
// The anon key is designed to be shipped to browsers: what each user can read or
// change is enforced by Row Level Security in the database (see supabase/migrations).
// Never put the service_role / secret key in frontend code.
// VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY override these when set.
const DEFAULT_SUPABASE_URL = 'https://inxuefqatpvnjlzpwohr.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlueHVlZnFhdHB2bmpsenB3b2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1Njk0OTQsImV4cCI6MjA3NDE0NTQ5NH0.RFA9dcP3Ewjya4rzufuDUWGe9uKcpQrBrCOCmSY-GPw'

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
