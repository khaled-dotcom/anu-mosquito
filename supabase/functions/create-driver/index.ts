// Admin only: create a driver login (auth user + profile + driver profile).
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
  if (!EMAIL.test(email)) return json({ error: 'Please enter a valid email.' })
  if (phone && !EGYPT_PHONE.test(phone)) return json({ error: 'Please enter a valid Egyptian phone number.' })
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' })

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .or(`driver_id.eq.${driverId},university_id.eq.${driverId}`)
    .maybeSingle()

  if (existing) return json({ error: 'This ID is already used by another account.' })

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, driver_id: driverId },
  })

  if (createError || !created?.user) {
    return json({ error: createError?.message || 'Could not create the driver.' })
  }

  const userId = created.user.id

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    full_name: fullName,
    driver_id: driverId,
    phone: phone || null,
    role: 'driver',
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return json({ error: profileError.message })
  }

  const { error: driverError } = await admin.from('driver_profiles').insert({ id: userId, is_active: true })

  if (driverError) {
    await admin.auth.admin.deleteUser(userId)
    return json({ error: driverError.message })
  }

  return json({ success: true, id: userId })
})
