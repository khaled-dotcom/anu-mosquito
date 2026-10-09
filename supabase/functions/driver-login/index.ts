// Drivers log in with their 7-digit driver ID; this looks up their email and signs them in.
import { anonClient, corsHeaders, json, SEVEN_DIGITS, serviceClient } from './utils.ts'

const INVALID = 'Invalid ID or password.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const driverId = String(body.driver_id ?? '').trim()
  const password = String(body.password ?? '')

  if (!SEVEN_DIGITS.test(driverId) || !password) return json({ error: INVALID })

  const admin = serviceClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('driver_id', driverId)
    .maybeSingle()

  if (!profile || profile.role !== 'driver') return json({ error: INVALID })

  const { data: driver } = await admin
    .from('driver_profiles')
    .select('is_active')
    .eq('id', profile.id)
    .maybeSingle()

  if (!driver?.is_active) return json({ error: 'Your driver account is not active. Please contact the admin.' })

  const { data: userData } = await admin.auth.admin.getUserById(profile.id)
  const email = userData?.user?.email
  if (!email) return json({ error: INVALID })

  const { data: signIn, error } = await anonClient().auth.signInWithPassword({ email, password })
  if (error || !signIn?.session) return json({ error: INVALID })

  return json({ session: signIn.session })
})
