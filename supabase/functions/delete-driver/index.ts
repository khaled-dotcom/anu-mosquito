// Admin only: delete a driver account. Their past orders keep working (driver is cleared).
import { corsHeaders, json, requireAdmin, SEVEN_DIGITS } from './utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const admin = await requireAdmin(req)
  if (admin instanceof Response) return admin

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const driverId = String(body.driver_id ?? '').trim()
  if (!SEVEN_DIGITS.test(driverId)) return json({ error: 'Driver ID must contain exactly 7 digits.' })

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('driver_id', driverId)
    .maybeSingle()

  if (!profile || profile.role !== 'driver') return json({ error: 'Driver not found.' })

  const { error } = await admin.auth.admin.deleteUser(profile.id)
  if (error) return json({ error: error.message })

  return json({ success: true })
})
