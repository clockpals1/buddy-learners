import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initiateCheckout } from "@/lib/ai-client";
import { useState } from "react";
import { CreditCard, ArrowLeft, Shield, CheckCircle2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (s: Record<string, string>) => ({
    planId: s.planId ?? "",
    childId: s.childId ?? "",
  }),
  head: () => ({ meta: [{ title: "Checkout · Leafva Academy" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { planId, childId } = Route.useSearch();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<"stripe" | "paypal">("stripe");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: plan } = useQuery({
    queryKey: ["plan", planId],
    queryFn: async () => {
      if (!planId) return null;
      const { data } = await supabase.from("plans").select("*").eq("id", planId).single();
      return data;
    },
    enabled: !!planId,
  });

  const { data: child } = useQuery({
    queryKey: ["child-checkout", childId],
    queryFn: async () => {
      if (!childId) return null;
      const { data } = await supabase.from("children").select("*").eq("id", childId).single();
      return data;
    },
    enabled: !!childId,
  });

  if (!planId || !childId) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-4">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold" style={{ color: "var(--color-brand-700)" }}>Invalid checkout link</p>
          <Link to="/portal" className="text-sm" style={{ color: "var(--color-brand-600)" }}>← Back to portal</Link>
        </div>
      </div>
    );
  }

  async function handleCheckout() {
    if (!plan || !child) return;
    setLoading(true);
    try {
      const result = await initiateCheckout({ planId, childId, provider, promoCode: promoCode || undefined });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  const price = plan ? `${plan.currency} ${(plan.price_cents / 100).toFixed(2)}` : "—";

  const PLAN_FEATURES: Record<string, string[]> = {
    one_time: [
      "Full 8-week summer program",
      "All tracks included for your child",
      "Live sessions (Zoom/Teams)",
      "Recorded replays — forever",
      "AI Teaching Assistant included",
      "Digital certificate on completion",
      "Demo Day participation",
    ],
    monthly: [
      "Month-to-month, cancel anytime",
      "Full curriculum access",
      "Live sessions",
      "AI Teaching Assistant",
      "Badge and progress tracking",
    ],
  };

  const features = plan ? (PLAN_FEATURES[plan.kind] ?? PLAN_FEATURES.monthly) : [];

  return (
    <div className="min-h-dvh px-4 py-10" style={{ background: "oklch(0.97 0.01 270)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/portal" className="flex items-center gap-1.5 text-sm" style={{ color: "oklch(0.5 0.01 270)" }}>
            <ArrowLeft className="h-4 w-4" /> Back to portal
          </Link>
          <h1 className="text-2xl font-700 mt-4 font-display" style={{ color: "oklch(0.15 0.02 270)" }}>Complete your enrollment</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 270)" }}>
            Enrolling <strong>{child?.display_name ?? "your child"}</strong> in <strong>{plan?.name ?? "Leafva Academy"}</strong>
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Payment form */}
          <div className="lg:col-span-3 space-y-5">
            {/* Provider selection */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "oklch(0.2 0.02 270)" }}>Payment method</p>
              <div className="grid grid-cols-2 gap-3">
                {(["stripe", "paypal"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      border: `2px solid ${provider === p ? "oklch(0.55 0.18 275)" : "oklch(0.9 0.01 270)"}`,
                      background: provider === p ? "oklch(0.96 0.03 275)" : "white",
                      color: provider === p ? "oklch(0.35 0.18 275)" : "oklch(0.4 0.01 270)",
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    {p === "stripe" ? "Credit / Debit Card" : "PayPal"}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: "oklch(0.6 0.01 270)" }}>
                <Shield className="h-3.5 w-3.5" />
                Payments processed securely by {provider === "stripe" ? "Stripe" : "PayPal"}. Leafva Academy never stores your card details.
              </p>
            </div>

            {/* Promo code */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "oklch(0.2 0.02 270)" }}>
                <Tag className="h-4 w-4" /> Promo / scholarship code
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="CAMP25"
                  className="flex-1 h-10 px-4 rounded-xl text-sm font-mono focus:outline-none"
                  style={{ background: "oklch(0.96 0.01 270)", color: "oklch(0.2 0.02 270)", border: "1px solid oklch(0.9 0.01 270)" }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: "oklch(0.65 0.01 270)" }}>
                Sibling discounts are applied automatically at checkout.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={handleCheckout}
              disabled={loading || !plan}
              className="w-full py-4 rounded-2xl text-base font-700 flex items-center justify-center gap-2 disabled:opacity-50 transition"
              style={{ background: "oklch(0.55 0.18 275)", color: "white" }}
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Redirecting to {provider}…</>
              ) : (
                <><CreditCard className="h-5 w-5" /> Pay {price} with {provider === "stripe" ? "Card" : "PayPal"}</>
              )}
            </button>

            <p className="text-xs text-center" style={{ color: "oklch(0.65 0.01 270)" }}>
              By completing payment you agree to our{" "}
              <a href="/terms" className="underline" style={{ color: "oklch(0.45 0.18 275)" }}>Terms of Service</a> and{" "}
              <a href="/privacy" className="underline" style={{ color: "oklch(0.45 0.18 275)" }}>Privacy Policy</a>.
            </p>
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-5 sticky top-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <p className="text-sm font-semibold mb-4" style={{ color: "oklch(0.2 0.02 270)" }}>Order summary</p>

              <div className="rounded-xl p-4 mb-4" style={{ background: "oklch(0.97 0.01 270)", border: "1px solid oklch(0.92 0.01 270)" }}>
                <p className="font-700 text-base" style={{ color: "oklch(0.2 0.02 270)" }}>{plan?.name ?? "Loading…"}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: "oklch(0.55 0.01 270)" }}>{plan?.kind?.replace("_", " ")} · {plan?.currency}</p>
                <p className="text-2xl font-700 mt-3" style={{ color: "oklch(0.35 0.18 275)" }}>{price}</p>
                {plan?.kind === "monthly" && <p className="text-xs" style={{ color: "oklch(0.6 0.01 270)" }}>per month, cancel anytime</p>}
              </div>

              <ul className="space-y-2">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.35 0.01 270)" }}>
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "oklch(0.55 0.15 145)" }} />
                    {f}
                  </li>
                ))}
              </ul>

              {plan?.description && (
                <p className="text-xs mt-4 pt-4" style={{ borderTop: "1px solid oklch(0.92 0.01 270)", color: "oklch(0.6 0.01 270)" }}>
                  {plan.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
