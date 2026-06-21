import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Plus, Sparkles, Trophy, Gamepad2, Calendar } from "lucide-react";

type Child = {
  id: string;
  display_name: string;
  age: number;
  track: "spark_cubs" | "code_rangers" | "cyber_pioneers";
  avatar_key: string;
};

const TRACK_META = {
  spark_cubs: { name: "Spark Cubs", color: "track-cubs", emoji: "🦊" },
  code_rangers: { name: "Code Rangers", color: "track-rangers", emoji: "🛡️" },
  cyber_pioneers: { name: "Cyber Pioneers", color: "track-pioneers", emoji: "⚡" },
};

function trackForAge(age: number): Child["track"] {
  if (age <= 9) return "spark_cubs";
  if (age <= 12) return "code_rangers";
  return "cyber_pioneers";
}

export const Route = createFileRoute("/_authenticated/portal")({
  component: Portal,
});

function Portal() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(8);

  async function load() {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    else setChildren((data ?? []) as Child[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("children").insert({
      parent_id: userData.user.id,
      display_name: name.trim(),
      age,
      track: trackForAge(age),
    });
    if (error) return toast.error(error.message);
    toast.success(`${name} is enrolled!`);
    setName("");
    setAge(8);
    setAdding(false);
    load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <main className="min-h-dvh">
      <header className="border-b border-border/60 bg-cream/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-700">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-sunrise text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            Leafva Academy
          </Link>
          <button
            onClick={signOut}
            className="inline-flex h-10 items-center gap-2 px-4 rounded-full text-sm hover:bg-muted transition"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-700 font-display">Your family dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Add a child, pick their track, and we'll handle the rest.
        </p>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-700">Children</h2>
            <button
              onClick={() => setAdding((v) => !v)}
              className="inline-flex h-10 items-center gap-2 px-4 rounded-full bg-gradient-cta text-coral-foreground font-semibold shadow-pop hover:scale-[1.03] transition"
            >
              <Plus className="h-4 w-4" /> Add a child
            </button>
          </div>

          {adding && (
            <form
              onSubmit={addChild}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft grid sm:grid-cols-[1fr_120px_auto] gap-3 mb-6"
            >
              <input
                required
                placeholder="Child's name or nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                required
                type="number"
                min={6}
                max={15}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-ink text-cream font-semibold hover:bg-ink/90 transition"
              >
                Save · {TRACK_META[trackForAge(age)].name}
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : children.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No children yet. Click <strong>Add a child</strong> to get started.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((c) => {
                const meta = TRACK_META[c.track];
                return (
                  <article
                    key={c.id}
                    className="relative rounded-2xl bg-card p-5 shadow-soft border border-border/60 overflow-hidden"
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-1.5"
                      style={{ background: `var(--${meta.color})` }}
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{meta.emoji}</span>
                      <div>
                        <h3 className="font-700 text-lg">{c.display_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          Age {c.age} · {meta.name}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                      <Stat icon={<Trophy className="h-4 w-4" />} label="Badges" value="0" />
                      <Stat icon={<Gamepad2 className="h-4 w-4" />} label="Games" value="0" />
                      <Stat icon={<Calendar className="h-4 w-4" />} label="Sessions" value="0" />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-14 rounded-3xl border border-border bg-card p-8 shadow-soft">
          <h2 className="text-2xl font-700">Coming next in your portal</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><span>🎮</span> Game catalogue (Pixel Pet Coder, Packet Race, Bug Hunt Squad…)</li>
            <li className="flex gap-2"><span>🤖</span> AI Teaching Assistant (hints, not answers)</li>
            <li className="flex gap-2"><span>📅</span> Live session calendar with auto Zoom/Teams links</li>
            <li className="flex gap-2"><span>🏆</span> Badges, certificates, and Demo Day gallery</li>
            <li className="flex gap-2"><span>💳</span> Stripe + PayPal checkout for the Camp Pass</li>
            <li className="flex gap-2"><span>⚙️</span> Admin dashboard for staff</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 py-3">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <p className="mt-1 font-700 text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
