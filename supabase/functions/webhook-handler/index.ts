import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature" };

async function getSetting(supabase: ReturnType<typeof createClient>, key: string): Promise<string | null> {
  const envVal = Deno.env.get(key);
  if (envVal) return envVal;
  const { data } = await supabase.from("integration_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "stripe";

  try {
    const rawBody = await req.text();

    if (provider === "stripe") {
      const stripeWebhookSecret = await getSetting(supabase, "STRIPE_WEBHOOK_SECRET");
      const signature = req.headers.get("stripe-signature");

      if (!stripeWebhookSecret || !signature) {
        return new Response(JSON.stringify({ error: "Stripe webhook secret not configured or signature missing" }), { status: 400 });
      }

      // Verify Stripe signature (manual HMAC-SHA256 verification)
      const parts = signature.split(",").reduce((acc: Record<string, string>, part) => {
        const [key, val] = part.split("=");
        acc[key] = val;
        return acc;
      }, {});

      const timestamp = parts["t"];
      const sigHex = parts["v1"];
      const signedPayload = `${timestamp}.${rawBody}`;

      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", enc.encode(stripeWebhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
      const computedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

      if (computedHex !== sigHex) {
        return new Response(JSON.stringify({ error: "Invalid Stripe signature" }), { status: 400 });
      }

      const event = JSON.parse(rawBody);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { plan_id, child_id, parent_id } = session.metadata ?? {};
        if (plan_id && child_id && parent_id) {
          await supabase
            .from("enrollments")
            .update({ payment_status: "active", external_subscription_id: session.subscription ?? session.id })
            .eq("external_subscription_id", session.id);
        }
      }

      if (event.type === "invoice.payment_failed" || event.type === "customer.subscription.deleted") {
        const obj = event.data.object;
        const subId = obj.subscription ?? obj.id;
        await supabase.from("enrollments").update({ payment_status: event.type === "customer.subscription.deleted" ? "canceled" : "past_due" })
          .eq("external_subscription_id", subId);
      }

      if (event.type === "charge.refunded") {
        const charge = event.data.object;
        await supabase.from("enrollments").update({ payment_status: "refunded" })
          .eq("external_subscription_id", charge.payment_intent);
      }
    }

    if (provider === "paypal") {
      // PayPal IPN / Webhook verification
      const ppClientId = await getSetting(supabase, "PAYPAL_CLIENT_ID");
      const ppSecret = await getSetting(supabase, "PAYPAL_CLIENT_SECRET");
      const sandboxMode = (await getSetting(supabase, "PAYPAL_SANDBOX")) !== "false";
      const ppBase = sandboxMode ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

      if (!ppClientId || !ppSecret) {
        return new Response(JSON.stringify({ error: "PayPal not configured" }), { status: 400 });
      }

      // Verify PayPal webhook signature
      const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${btoa(`${ppClientId}:${ppSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      });
      const { access_token } = await tokenRes.json();

      const webhookId = await getSetting(supabase, "PAYPAL_WEBHOOK_ID");
      const verifyRes = await fetch(`${ppBase}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_algo: req.headers.get("paypal-auth-algo"),
          cert_url: req.headers.get("paypal-cert-url"),
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        }),
      });
      const { verification_status } = await verifyRes.json();

      if (verification_status !== "SUCCESS") {
        return new Response(JSON.stringify({ error: "Invalid PayPal webhook signature" }), { status: 400 });
      }

      const event = JSON.parse(rawBody);

      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        const customId = event.resource?.purchase_units?.[0]?.custom_id;
        if (customId) {
          const { plan_id, child_id, parent_id } = JSON.parse(customId);
          await supabase.from("enrollments").update({ payment_status: "active" })
            .eq("parent_id", parent_id).eq("child_id", child_id).eq("plan_id", plan_id).eq("payment_status", "pending");
        }
      }

      if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED") {
        await supabase.from("enrollments").update({ payment_status: "canceled" })
          .eq("external_subscription_id", event.resource?.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: CORS });
  }
});
