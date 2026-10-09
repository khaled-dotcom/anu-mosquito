import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export function anonClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Returns the service client when the caller is a signed-in admin, otherwise a Response to send back.
export async function requireAdmin(req: Request): Promise<SupabaseClient | Response> {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Please log in again.' }, 401)

  const admin = serviceClient()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData?.user) return json({ error: 'Please log in again.' }, 401)

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return json({ error: 'Only admins can do this.' }, 403)

  return admin
}

export const SEVEN_DIGITS = /^\d{7}$/
export const EGYPT_PHONE = /^01[0125]\d{8}$/
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
