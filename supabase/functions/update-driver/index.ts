// Admin only: update a driver's name, phone, email and (optionally) password.
import { corsHeaders, EGYPT_PHONE, EMAIL, json, requireAdmin, SEVEN_DIGITS } from './utils.ts'

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
  const fullName = String(body.full_name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const phone = String(body.phone ?? '').trim()
  const password = String(body.password ?? '')

  if (!SEVEN_DIGITS.test(driverId)) return json({ error: 'Driver ID must contain exactly 7 digits.' })
  if (!fullName) return json({ error: 'Please enter the driver name.' })
  if (email && !EMAIL.test(email)) return json({ error: 'Please enter a valid email.' })
  if (phone && !EGYPT_PHONE.test(phone)) return json({ error: 'Please enter a valid Egyptian phone number.' })
  if (password && password.length < 6) return json({ error: 'Password must be at least 6 characters.' })

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('driver_id', driverId)
    .maybeSingle()

  if (!profile || profile.role !== 'driver') return json({ error: 'Driver not found.' })

  const authUpdate: Record<string, unknown> = {}
  if (email) {
    authUpdate.email = email
    authUpdate.email_confirm = true
  }
  if (password) authUpdate.password = password

  if (Object.keys(authUpdate).length > 0) {
    const { error: authError } = await admin.auth.admin.updateUserById(profile.id, authUpdate)
    if (authError) return json({ error: authError.message })
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: fullName, phone: phone || null })
    .eq('id', profile.id)

  if (profileError) return json({ error: profileError.message })

  return json({ success: true })
})
