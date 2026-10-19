import { createClient } from "npm:@supabase/supabase-js@2"
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }) }
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405)
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized." }, 401)
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice("Bearer ".length))
    if (authError || !authData.user) return jsonResponse({ error: "Unauthorized." }, 401)
    const { data: adminProfile, error: adminError } = await supabaseAdmin.from("profiles").select("role,is_active").eq("id", authData.user.id).maybeSingle()
    if (adminError || adminProfile?.role !== "admin" || adminProfile?.is_active !== true) return jsonResponse({ error: "Only active administrators can manage TokTok store accounts." }, 403)
    const body = await req.json()
    const action = String(body.action || "")
    const storeId = String(body.store_id || "")
    const password = String(body.password || "")
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)) return jsonResponse({ error: "A valid TokTok store is required." }, 400)
    if (password.length < 6 || password.length > 128) return jsonResponse({ error: "Password must contain between 6 and 128 characters." }, 400)
    const { data: store, error: storeError } = await supabaseAdmin.from("toktok_stores").select("id,name").eq("id", storeId).maybeSingle()
    if (storeError || !store) return jsonResponse({ error: "TokTok store was not found." }, 404)
    const { data: existingAccount, error: accountLookupError } = await supabaseAdmin.from("profiles").select("id,phone").eq("role", "toktok_restaurant").eq("toktok_store_id", storeId).maybeSingle()
    if (accountLookupError) return jsonResponse({ error: "Could not verify the store account." }, 500)
    if (action === "reset_password") {
      if (!existingAccount) return jsonResponse({ error: "This store does not have a login account yet." }, 404)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAccount.id, { password })
      if (updateError) return jsonResponse({ error: updateError.message }, 400)
      return jsonResponse({ success: true, message: "Restaurant password updated." })
    }
    if (action !== "create") return jsonResponse({ error: "Unsupported account action." }, 400)
    if (existingAccount) return jsonResponse({ error: "This store already has a login account. Use password reset instead." }, 409)
    const phone = String(body.phone || "").replace(/\D/g, "")
    if (!/^01[0125]\d{8}$/.test(phone)) return jsonResponse({ error: "Enter a valid Egyptian mobile number." }, 400)
    const { data: phoneMatch, error: phoneLookupError } = await supabaseAdmin.from("profiles").select("id").eq("role", "toktok_restaurant").eq("phone", phone).maybeSingle()
    if (phoneLookupError) return jsonResponse({ error: "Could not verify the mobile number." }, 500)
    if (phoneMatch) return jsonResponse({ error: "This mobile number is already assigned to another TokTok store." }, 409)
    const email = "toktok-" + phone + "@login.anumosquito.com"
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: store.name, phone, account_type: "toktok_restaurant" } })
    if (createError || !created.user) return jsonResponse({ error: createError?.message || "Could not create the restaurant login." }, 400)
    const { error: profileUpdateError } = await supabaseAdmin.from("profiles").update({ role: "toktok_restaurant", full_name: store.name, phone, username: phone, university_id: null, driver_id: null, toktok_store_id: storeId }).eq("id", created.user.id)
    if (profileUpdateError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id)
      return jsonResponse({ error: profileUpdateError.message }, 500)
    }
    return jsonResponse({ success: true, message: "TokTok restaurant account created." })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500)
  }
})
