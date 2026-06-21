import { Check } from "lucide-react";

const plans = [
  {
    name: "Full Camp Pass",
    price: "$399",
    period: "one-time",
    desc: "Full summer program. Every track unlocked. Pay once, done.",
    features: [
      "All live mentor sessions",
      "Every game & project",
      "Digital certificates",
      "Demo Day showcase",
    ],
    cta: "Get the Camp Pass",
    highlight: true,
  },
  {
    name: "Monthly",
    price: "$49",
    period: "/month",
    desc: "Pay-as-you-go. Pause anytime — perfect for testing the waters.",
    features: [
      "Cancel or pause anytime",
      "Same live sessions",
      "Same games & projects",
      "Sibling discount: 15% off",
    ],
    cta: "Start monthly",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-coral uppercase tracking-wider">Pricing</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-700">Two simple ways to join.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sibling discount auto-applies at checkout. Need a scholarship? Email us — we
            keep a real fund for that.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          {plans.map((p) => (
            <div
              key={p.name}
              className={
                "relative rounded-3xl p-8 border " +
                (p.highlight
                  ? "bg-gradient-sunrise text-white border-transparent shadow-pop"
                  : "bg-card border-border/60 shadow-soft")
              }
            >
              {p.highlight && (
                <span className="absolute -top-3 left-8 text-xs font-semibold uppercase tracking-wider bg-ink text-cream px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <h3 className="text-2xl font-700">{p.name}</h3>
              <p className={"mt-1 text-sm " + (p.highlight ? "text-white/80" : "text-muted-foreground")}>
                {p.desc}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-700 font-display">{p.price}</span>
                <span className={"text-sm " + (p.highlight ? "text-white/80" : "text-muted-foreground")}>
                  {p.period}
                </span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={"h-5 w-5 shrink-0 " + (p.highlight ? "text-white" : "text-coral")} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#register"
                className={
                  "mt-8 inline-flex h-12 w-full items-center justify-center rounded-full font-semibold transition " +
                  (p.highlight
                    ? "bg-white text-coral hover:scale-[1.02]"
                    : "bg-ink text-cream hover:bg-ink/90")
                }
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
