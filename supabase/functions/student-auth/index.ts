// Public sign-up for students: creates the auth user and the student profile.
import { corsHeaders, EGYPT_PHONE, json, SEVEN_DIGITS, serviceClient } from './utils.ts'

const RESERVED_IDS = new Set(['9000001', '5555555'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ success: false, error: 'Invalid request.' }, 400)
  }

  const universityId = String(body.university_id ?? '').trim()
  const password = String(body.password ?? '')
  const fullName = String(body.full_name ?? '').trim()
  const phone = String(body.phone ?? '').trim()

  if (!SEVEN_DIGITS.test(universityId)) return json({ success: false, error: 'ID must contain exactly 7 digits.' })
  if (RESERVED_IDS.has(universityId)) return json({ success: false, error: 'This ID is reserved.' })
  if (!fullName || fullName.length > 120) return json({ success: false, error: 'Please enter your full name.' })
  if (!EGYPT_PHONE.test(phone)) return json({ success: false, error: 'Please enter a valid Egyptian phone number.' })
  if (password.length < 6 || password.length > 72) return json({ success: false, error: 'Password must be at least 6 characters.' })

  const admin = serviceClient()

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .or(`university_id.eq.${universityId},driver_id.eq.${universityId}`)
    .maybeSingle()

  if (existing) return json({ success: false, error: 'An account with this University ID already exists. Please log in.' })

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: `${universityId}@anu-mosquito.com`,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, university_id: universityId },
  })

  if (createError || !created?.user) {
    const already = /already|registered|exists/i.test(createError?.message || '')
    return json({
      success: false,
      error: already
        ? 'An account with this University ID already exists. Please log in.'
        : 'Could not create your account. Please try again.',
    })
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    full_name: fullName,
    university_id: universityId,
    phone,
    role: 'student',
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ success: false, error: 'Could not create your account. Please try again.' })
  }

  return json({ success: true })
})
