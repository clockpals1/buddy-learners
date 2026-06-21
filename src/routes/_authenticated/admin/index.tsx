import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Users, Video, ClipboardList, TrendingUp, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { generateAdminAI } from "@/lib/ai-client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard · Leafva Academy" }] }),
  component: AdminDashboard,
});

function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [children, sessions, submissions, enrollments] = await Promise.all([
        supabase.from("children").select("id", { count: "exact", head: true }),
        supabase.from("live_sessions").select("id", { count: "exact", head: true }).gte("scheduled_at", new Date().toISOString()),
        supabase.from("submissions").select("id", { count: "exact", head: true }).is("grade", null),
        supabase.from("enrollments").select("id, created_at, payment_status", { count: "exact" }).eq("payment_status", "active"),
      ]);
      return {
        totalStudents: children.count ?? 0,
        upcomingSessions: sessions.count ?? 0,
        pendingGrades: submissions.count ?? 0,
        activeEnrollments: enrollments.count ?? 0,
        recentEnrollments: (enrollments.data ?? []).slice(-5),
      };
    },
    refetchInterval: 60_000,
  });
}

function StatCard({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(226,232,240,0.5)" }}>{label}</span>
        <span className="grid place-items-center h-8 w-8 rounded-xl" style={{ background: color + "20" }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </span>
      </div>
      <p className="text-3xl font-700 font-display" style={{ color: "#f1f5f9" }}>{value}</p>
    </div>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  async function generateWeeklySummary() {
    setAiLoading(true);
    const prompt = `Generate a concise weekly summary for a kids' coding camp admin dashboard. Stats: ${stats?.totalStudents} active students, ${stats?.activeEnrollments} active enrollments, ${stats?.upcomingSessions} upcoming live sessions, ${stats?.pendingGrades} assignments pending grading. Write 2-3 sentences with actionable insights. Be specific and helpful for the instructor.`;
    const result = await generateAdminAI(prompt);
    setAiSummary(result);
    setAiLoading(false);
  }

  return (
    <div className="space-y-7 max-w-6xl">
      <div>
        <h1 className="text-2xl font-700 font-display" style={{ color: "#f1f5f9" }}>Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>Welcome back. Here's what's happening at Leafva Academy.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading stats…
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Active Students" value={stats?.totalStudents ?? 0} color="#6366f1" />
          <StatCard icon={TrendingUp} label="Active Enrollments" value={stats?.activeEnrollments ?? 0} color="#10b981" />
          <StatCard icon={Video} label="Upcoming Sessions" value={stats?.upcomingSessions ?? 0} color="#f59e0b" />
          <StatCard icon={ClipboardList} label="Pending Grades" value={stats?.pendingGrades ?? 0} color="#f43f5e" />
        </div>
      )}

      {/* AI Weekly Summary */}
      <div className="rounded-2xl p-5" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "#6366f1" }} />
            <h2 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>AI Weekly Summary</h2>
          </div>
          <button
            onClick={generateWeeklySummary}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
          >
            {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {aiSummary ? "Regenerate" : "Generate"}
          </button>
        </div>
        {aiSummary ? (
          <p className="text-sm leading-relaxed" style={{ color: "rgba(226,232,240,0.8)" }}>{aiSummary}</p>
        ) : (
          <p className="text-sm italic" style={{ color: "rgba(226,232,240,0.35)" }}>
            Click "Generate" to get an AI-powered weekly insight based on current stats.
          </p>
        )}
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Manage Users", desc: "View, search, and manage parent and child accounts", to: "/admin/users", color: "#6366f1" },
          { label: "Schedule a Session", desc: "Create live session with auto-generated Zoom/Teams link", to: "/admin/sessions", color: "#10b981" },
          { label: "Integration Settings", desc: "Configure Stripe, PayPal, Groq, Zoom, email — no hardcoded keys", to: "/admin/settings", color: "#f59e0b" },
        ].map(item => (
          <a
            key={item.to}
            href={item.to}
            className="rounded-2xl p-5 transition-all hover:scale-[1.01]"
            style={{ background: "oklch(0.18 0.03 270)", border: `1px solid ${item.color}30`, cursor: "pointer", textDecoration: "none", display: "block" }}
          >
            <div className="h-1.5 w-8 rounded-full mb-3" style={{ background: item.color }} />
            <h3 className="text-sm font-semibold mb-1" style={{ color: "#f1f5f9" }}>{item.label}</h3>
            <p className="text-xs" style={{ color: "rgba(226,232,240,0.5)" }}>{item.desc}</p>
          </a>
        ))}
      </div>

      {/* Track overview */}
      <div className="rounded-2xl p-5" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#f1f5f9" }}>Age Tracks</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { name: "Spark Cubs", ages: "6–9", emoji: "🦊", color: "oklch(0.78 0.16 50)" },
            { name: "Code Rangers", ages: "10–12", emoji: "🛡️", color: "oklch(0.72 0.16 145)" },
            { name: "Cyber Pioneers", ages: "13–15", emoji: "⚡", color: "oklch(0.55 0.18 275)" },
          ].map(t => (
            <div key={t.name} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${t.color}30` }}>
              <span className="text-2xl">{t.emoji}</span>
              <p className="mt-2 text-sm font-semibold" style={{ color: "#f1f5f9" }}>{t.name}</p>
              <p className="text-xs" style={{ color: "rgba(226,232,240,0.5)" }}>Ages {t.ages}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
