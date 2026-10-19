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
    const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("role,is_active,toktok_store_id").eq("id", authData.user.id).maybeSingle()
    if (profileError || profile?.role !== "toktok_restaurant" || profile?.is_active !== true || !profile?.toktok_store_id) return jsonResponse({ error: "Only an active TokTok restaurant account can update order status." }, 403)
    const body = await req.json()
    const orderId = String(body.order_id || "")
    const nextStatus = String(body.status || "")
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) return jsonResponse({ error: "A valid order is required." }, 400)
    if (!["preparing", "ready", "out_for_delivery"].includes(nextStatus)) return jsonResponse({ error: "Unsupported order status." }, 400)
    const { data: order, error: orderError } = await supabaseAdmin.from("toktok_orders").select("id,store_id,status,payment_status").eq("id", orderId).eq("store_id", profile.toktok_store_id).maybeSingle()
    if (orderError || !order) return jsonResponse({ error: "Order not found for this restaurant." }, 404)
    if (order.payment_status !== "confirmed") return jsonResponse({ error: "The order payment has not been confirmed." }, 409)
    const allowedNext = { confirmed: "preparing", preparing: "ready", ready: "out_for_delivery" } as Record<string, string>
    if (allowedNext[order.status] !== nextStatus) return jsonResponse({ error: "This order status transition is not allowed." }, 409)
    const { data: updated, error: updateError } = await supabaseAdmin.from("toktok_orders").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", order.id).eq("store_id", profile.toktok_store_id).eq("status", order.status).select("id,status").maybeSingle()
    if (updateError || !updated) return jsonResponse({ error: updateError?.message || "The order status changed before it could be saved." }, 409)
    return jsonResponse({ success: true, order_id: updated.id, status: updated.status })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500)
  }
})
