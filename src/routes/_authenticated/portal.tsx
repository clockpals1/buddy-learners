import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Plus, Sparkles, Trophy, Gamepad2, Calendar, CreditCard, LayoutDashboard, ShieldCheck } from "lucide-react";

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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", userData.user.id)
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
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-700 font-display">Welcome to your family dashboard</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Manage your children's learning journey here. Each child has their own personalized learning track.
          </p>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-700">Your Children</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add your kids to get them started with coding lessons
              </p>
            </div>
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
              className="rounded-2xl border border-border bg-card p-6 shadow-soft mb-6"
            >
              <h3 className="text-lg font-700 mb-4">Add a new child</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Child's name</label>
                  <input
                    required
                    placeholder="e.g., Emma, Alex, Jordan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Age (6-15 years)</label>
                  <input
                    required
                    type="number"
                    min={6}
                    max={15}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-4">
                <span className="text-2xl">{TRACK_META[trackForAge(age)].emoji}</span>
                <div>
                  <p className="font-semibold text-sm">{TRACK_META[trackForAge(age)].name}</p>
                  <p className="text-xs text-muted-foreground">
                    {age <= 9 ? "Perfect for beginners ages 6-9" : age <= 12 ? "Great for ages 10-12" : "Advanced learning for ages 13-15"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="flex-1 h-11 px-5 rounded-xl border border-border font-semibold hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 px-5 rounded-xl bg-ink text-cream font-semibold hover:bg-ink/90 transition"
                >
                  Add Child
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading your children's profiles…</p>
            </div>
          ) : children.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-xl font-700 mb-2">No children added yet</h3>
              <p className="text-muted-foreground mb-6">
                Add your first child to start their coding adventure!
              </p>
              <button
                onClick={() => setAdding(true)}
                className="inline-flex h-10 items-center gap-2 px-6 rounded-full bg-gradient-cta text-coral-foreground font-semibold shadow-pop hover:scale-[1.03] transition"
              >
                <Plus className="h-4 w-4" /> Add your first child
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((c) => {
                const meta = TRACK_META[c.track];
                return (
                  <ChildCard key={c.id} child={c} meta={meta} />
                );
              })}
            </div>
          )}
        </section>

        <AdminSection />
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/60 py-3">
      <div className="flex justify-center text-muted-foreground">{icon}</div>
      <p className="mt-1 font-700 text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function ChildCard({ child, meta }: { child: Child; meta: typeof TRACK_META[keyof typeof TRACK_META] }) {
  const { data: badges } = useQuery({
    queryKey: ["child-badges", child.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("child_badges")
        .select("id")
        .eq("child_id", child.id);
      return data?.length ?? 0;
    },
  });

  const { data: games } = useQuery({
    queryKey: ["child-games", child.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("game_progress")
        .select("id")
        .eq("child_id", child.id);
      return data?.length ?? 0;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["child-sessions", child.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_attendance")
        .select("id")
        .eq("child_id", child.id);
      return data?.length ?? 0;
    },
  });

  return (
    <article className="relative rounded-2xl bg-card p-5 shadow-soft border border-border/60 overflow-hidden hover:shadow-md transition">
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: `var(--${meta.color})` }}
      />
      <div className="flex items-center gap-3">
        <span className="text-4xl">{meta.emoji}</span>
        <div>
          <h3 className="font-700 text-lg">{child.display_name}</h3>
          <p className="text-xs text-muted-foreground">
            Age {child.age} · {meta.name}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat icon={<Trophy className="h-4 w-4" />} label="Badges" value={badges ?? 0} />
        <Stat icon={<Gamepad2 className="h-4 w-4" />} label="Games" value={games ?? 0} />
        <Stat icon={<Calendar className="h-4 w-4" />} label="Sessions" value={sessions ?? 0} />
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          to="/child/$childId"
          params={{ childId: child.id }}
          className="flex-1 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition hover:opacity-90"
          style={{ background: `var(--${meta.color})`, color: "white" }}
        >
          Start Learning
        </Link>
        <EnrollButton childId={child.id} />
      </div>
    </article>
  );
}

function EnrollButton({ childId }: { childId: string }) {
  const { data: enrollment } = useQuery({
    queryKey: ["child-enrollment", childId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select(`
          payment_status,
          plans (
            id,
            name,
            kind
          )
        `)
        .eq("child_id", childId)
        .maybeSingle();
      return data;
    },
  });

  if (enrollment?.payment_status === "active" && enrollment.plans) {
    const plan = enrollment.plans as any;
    const planEmoji = plan.kind === "family" ? "👨‍👩‍👧‍👦" : plan.kind === "school" ? "🏫" : "🆓";
    return (
      <div
        className="h-9 px-3 flex items-center rounded-xl text-sm font-medium border border-border bg-muted/50"
        title={`Enrolled in ${plan.name}`}
      >
        <span className="mr-1">{planEmoji}</span>
        <span className="hidden sm:inline">{plan.name}</span>
      </div>
    );
  }

  return (
    <Link
      to="/checkout"
      search={{ childId }}
      className="h-9 px-3 flex items-center rounded-xl text-sm font-medium border border-border hover:bg-muted transition"
      title="Enroll in a plan"
    >
      <CreditCard className="h-4 w-4" />
    </Link>
  );
}

function AdminSection() {
  const { data: role } = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      return data?.role ?? null;
    },
  });

  const isAdmin = role === "super_admin" || role === "instructor";
  if (!isAdmin) return null;

  return (
    <section className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-3 mb-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-700">Staff access</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">You have {role === "super_admin" ? "super admin" : "instructor"} access to the admin dashboard.</p>
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-sm"
        style={{ background: "oklch(0.2 0.02 270)", color: "white" }}
      >
        <LayoutDashboard className="h-4 w-4" /> Open Admin Dashboard
      </Link>
    </section>
  );
}
