import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export default function Pricing() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_cents");
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <section id="pricing" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center text-muted-foreground">Loading plans...</div>
        </div>
      </section>
    );
  }

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getPlanFeatures = (kind: string) => {
    switch (kind) {
      case "free":
        return ["1 child profile", "Basic lessons", "Community access", "Limited AI tutor"];
      case "family":
        return ["Up to 3 children", "All lessons & games", "Live mentor sessions", "Full AI tutor", "Digital certificates"];
      case "school":
        return ["Up to 10 children", "All features included", "Admin dashboard", "Bulk enrollment", "Priority support"];
      default:
        return [];
    }
  };

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-coral uppercase tracking-wider">Pricing</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-700">Choose your learning plan.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sibling discount auto-applies at checkout. Need a scholarship? Email us — we
            keep a real fund for that.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl">
          {plans?.map((p) => {
            const isHighlighted = p.kind === "family";
            const features = getPlanFeatures(p.kind);
            return (
              <div
                key={p.id}
                className={
                  "relative rounded-3xl p-8 border " +
                  (isHighlighted
                    ? "bg-gradient-sunrise text-white border-transparent shadow-pop"
                    : "bg-card border-border/60 shadow-soft")
                }
              >
                {isHighlighted && (
                  <span className="absolute -top-3 left-8 text-xs font-semibold uppercase tracking-wider bg-ink text-cream px-3 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <h3 className="text-2xl font-700">{p.name}</h3>
                <p className={"mt-1 text-sm " + (isHighlighted ? "text-white/80" : "text-muted-foreground")}>
                  {p.description || "Flexible learning for your child"}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-700 font-display">{formatPrice(p.price_cents, p.currency)}</span>
                  {p.kind === "free" && <span className={"text-sm " + (isHighlighted ? "text-white/80" : "text-muted-foreground")}>forever</span>}
                </div>
                {p.sibling_discount_pct > 0 && (
                  <p className={"mt-2 text-xs " + (isHighlighted ? "text-white/70" : "text-muted-foreground")}>
                    {p.sibling_discount_pct}% sibling discount
                  </p>
                )}
                <ul className="mt-6 space-y-3 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={"h-5 w-5 shrink-0 " + (isHighlighted ? "text-white" : "text-coral")} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  search={{ plan: p.slug }}
                  className={
                    "mt-8 inline-flex h-12 w-full items-center justify-center rounded-full font-semibold transition " +
                    (isHighlighted
                      ? "bg-white text-coral hover:scale-[1.02]"
                      : "bg-ink text-cream hover:bg-ink/90")
                  }
                >
                  {p.kind === "free" ? "Start free" : "Get started"}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
