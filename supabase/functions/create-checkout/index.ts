import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.39.0/src/util/cors.ts";

async function getSetting(supabase: ReturnType<typeof createClient>, key: string, envFallback?: string): Promise<string | null> {
  const envVal = envFallback ? Deno.env.get(envFallback) : null;
  if (envVal) return envVal;
  const { data } = await supabase.from("integration_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { planId, childId, promoCode, provider = "stripe", successUrl, cancelUrl } = await req.json();

    if (!planId || !childId) return json({ error: "planId and childId required" }, 400);

    // Fetch plan
    const { data: plan, error: planErr } = await supabase.from("plans").select("*").eq("id", planId).single();
    if (planErr || !plan) return json({ error: "Plan not found" }, 404);

    // Resolve promo discount
    let discountPct = 0;
    if (promoCode) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("discount_pct, max_uses, uses, expires_at, is_active")
        .eq("code", promoCode.toUpperCase())
        .maybeSingle();
      if (promo?.is_active && (!promo.max_uses || promo.uses < promo.max_uses) && (!promo.expires_at || new Date(promo.expires_at) > new Date())) {
        discountPct = promo.discount_pct;
      }
    }

    // Check sibling discount (2nd+ child enrolled under same parent)
    const { count: siblingCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .in("payment_status", ["active", "pending"]);
    if ((siblingCount ?? 0) > 0) {
      const siblingDiscount = plan.sibling_discount_pct ?? 15;
      discountPct = Math.max(discountPct, siblingDiscount);
    }

    const finalCents = Math.round(plan.price_cents * (1 - discountPct / 100));

    if (provider === "stripe") {
      const stripeKey = await getSetting(supabase, "STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY");
      const stripePublishableKey = await getSetting(supabase, "STRIPE_PUBLISHABLE_KEY", "STRIPE_PUBLISHABLE_KEY");
      if (!stripeKey) return json({ error: "Stripe not configured. Add STRIPE_SECRET_KEY in Admin → Settings → Integrations." }, 503);

      const mode = plan.kind === "monthly" ? "subscription" : "payment";
      const lineItems = [{
        price_data: {
          currency: plan.currency.toLowerCase(),
          unit_amount: finalCents,
          product_data: { name: plan.name, description: plan.description ?? undefined },
          ...(mode === "subscription" ? { recurring: { interval: "month" } } : {}),
        },
        quantity: 1,
      }];

      const params = new URLSearchParams({
        mode,
        "line_items[0][price_data][currency]": plan.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(finalCents),
        "line_items[0][price_data][product_data][name]": plan.name,
        "line_items[0][quantity]": "1",
        "success_url": successUrl ?? `${req.headers.get("origin") ?? ""}/portal?checkout=success`,
        "cancel_url": cancelUrl ?? `${req.headers.get("origin") ?? ""}/checkout?canceled=1`,
        "metadata[plan_id]": planId,
        "metadata[child_id]": childId,
        "metadata[parent_id]": user.id,
        "metadata[promo_code]": promoCode ?? "",
        "metadata[discount_pct]": String(discountPct),
      });

      if (mode === "subscription") {
        params.set("line_items[0][price_data][recurring][interval]", "month");
      }

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const stripeData = await stripeRes.json();
      if (!stripeRes.ok) return json({ error: stripeData.error?.message ?? "Stripe error" }, 502);

      // Create pending enrollment
      await supabase.from("enrollments").insert({
        parent_id: user.id,
        child_id: childId,
        plan_id: planId,
        payment_status: "pending",
        payment_provider: "stripe",
        external_subscription_id: stripeData.id,
      });

      return json({ url: stripeData.url, publishableKey: stripePublishableKey, discountPct });
    }

    if (provider === "paypal") {
      const ppClientId = await getSetting(supabase, "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_ID");
      const ppSecret = await getSetting(supabase, "PAYPAL_CLIENT_SECRET", "PAYPAL_CLIENT_SECRET");
      if (!ppClientId || !ppSecret) return json({ error: "PayPal not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Admin → Settings → Integrations." }, 503);

      const sandboxMode = (await getSetting(supabase, "PAYPAL_SANDBOX", "PAYPAL_SANDBOX")) !== "false";
      const ppBase = sandboxMode ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

      // Get PayPal access token
      const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${ppClientId}:${ppSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) return json({ error: "PayPal auth failed" }, 502);

      const ppToken = tokenData.access_token;
      const amountStr = (finalCents / 100).toFixed(2);

      const orderRes = await fetch(`${ppBase}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ppToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: plan.currency, value: amountStr },
            description: plan.name,
            custom_id: JSON.stringify({ plan_id: planId, child_id: childId, parent_id: user.id }),
          }],
          application_context: {
            return_url: successUrl ?? `${req.headers.get("origin") ?? ""}/portal?checkout=success`,
            cancel_url: cancelUrl ?? `${req.headers.get("origin") ?? ""}/checkout?canceled=1`,
          },
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) return json({ error: "PayPal order creation failed" }, 502);

      const approveLink = orderData.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;

      // Create pending enrollment
      await supabase.from("enrollments").insert({
        parent_id: user.id,
        child_id: childId,
        plan_id: planId,
        payment_status: "pending",
        payment_provider: "paypal",
        external_subscription_id: orderData.id,
      });

      return json({ url: approveLink, clientId: ppClientId, orderId: orderData.id, discountPct });
    }

    return json({ error: "Invalid provider. Use stripe or paypal." }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
