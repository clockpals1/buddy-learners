import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Leafva Academy" },
      { name: "description", content: "Sign in or create a parent account for Leafva Academy." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/portal" });
    });
  }, [navigate]);

  async function recordConsents(userId: string) {
    await supabase.from("consent_records").insert([
      { parent_id: userId, document_type: "terms", document_version: "v1.0" },
      { parent_id: userId, document_type: "privacy", document_version: "v1.0" },
      { parent_id: userId, document_type: "parental_consent", document_version: "v1.0" },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !agreed) {
      toast.error("Please accept the Terms, Privacy Policy, and Parental Consent.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/portal`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (data.session) {
          // Email confirmation disabled — logged in immediately
          await recordConsents(data.session.user.id);
          toast.success("Account created — welcome!");
          navigate({ to: "/portal" });
        } else {
          // Email confirmation required
          setEmailSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/portal" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <span className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <Mail className="h-8 w-8 text-green-600" />
          </span>
          <h1 className="text-3xl font-700 font-display">Check your inbox</h1>
          <p className="text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>.<br />
            Click it to activate your account and get started.
          </p>
          <button
            onClick={() => setEmailSent(false)}
            className="text-sm text-coral hover:underline"
          >
            ← Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-sunrise text-white relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-700 relative z-10">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-white/20 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </span>
          Leafva Academy
        </Link>
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-indigo/40 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-700 leading-tight">
            One parent account, every kid's adventure.
          </h2>
          <p className="mt-4 text-white/85">
            Add your children, pick their tracks, watch the progress roll in. We handle
            the games, the mentors, and the magic.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/70">© {new Date().getFullYear()} Leafva Academy</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <h1 className="text-3xl md:text-4xl font-700 font-display">
            {mode === "signup" ? "Create your parent account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "signup"
              ? "Two minutes. No card needed yet."
              : "Sign in to manage your kids' progress."}
          </p>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> Sign in with email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                required
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              required
              minLength={8}
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {mode === "signup" && (
              <label className="flex items-start gap-3 text-sm text-muted-foreground py-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border accent-coral"
                />
                <span>
                  I am the parent or legal guardian of the child being enrolled, and I
                  agree to the{" "}
                  <a href="/terms" className="text-coral hover:underline">Terms</a> and{" "}
                  <a href="/privacy" className="text-coral hover:underline">Privacy Policy</a>{" "}
                  (COPPA-compliant).
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-gradient-cta text-coral-foreground font-semibold shadow-pop hover:scale-[1.02] transition disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-coral font-semibold hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.12A6.6 6.6 0 0 1 5.49 12c0-.74.13-1.46.35-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
