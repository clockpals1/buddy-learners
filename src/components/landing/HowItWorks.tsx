import { UserPlus, Compass, Rocket, Trophy } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Sign up", body: "Create a parent account in 60 seconds." },
  { icon: Compass, title: "Pick a track", body: "Age sets the track. Mascot, color, curve — all tuned." },
  { icon: Rocket, title: "Learn & build", body: "Live mentor sessions + self-paced games & projects." },
  { icon: Trophy, title: "Demo Day", body: "Your kid ships a real project. We celebrate it publicly." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 px-6 bg-muted/40">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-indigo uppercase tracking-wider">How it works</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-700">From signup to demo day.</h2>
        </div>
        <ol className="grid md:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl bg-card p-6 shadow-soft border border-border/60">
              <div className="absolute -top-4 -left-4 grid place-items-center h-10 w-10 rounded-2xl bg-gradient-cta text-white font-display font-700 shadow-pop">
                {i + 1}
              </div>
              <s.icon className="h-7 w-7 text-coral" />
              <h3 className="mt-4 text-lg font-700">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
