import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { CreditCard, Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({ meta: [{ title: "Payments · Leafva Admin" }] }),
  component: PaymentsPage,
});

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  pending: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  past_due: { bg: "rgba(239,68,68,0.12)", color: "#f87171" },
  canceled: { bg: "rgba(255,255,255,0.05)", color: "rgba(226,232,240,0.4)" },
  refunded: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
};

function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, parent_id, child_id, plan_id, payment_status, payment_provider, external_subscription_id, created_at, updated_at")
        .order("created_at", { ascending: false });

      const { data: plans } = await supabase.from("plans").select("id, name, price_cents, currency, kind");
      const { data: profiles } = await supabase.from("profiles").select("id, full_name");
      const { data: children } = await supabase.from("children").select("id, display_name");

      const planMap = new Map((plans ?? []).map(p => [p.id, p]));
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      const childMap = new Map((children ?? []).map(c => [c.id, c]));

      return (enrollments ?? []).map(e => ({
        ...e,
        plan: planMap.get(e.plan_id),
        parent: profileMap.get(e.parent_id),
        child: childMap.get(e.child_id),
      }));
    },
  });

  const filtered = (data ?? []).filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (e.parent?.full_name?.toLowerCase().includes(q) ?? false) ||
      (e.child?.display_name?.toLowerCase().includes(q) ?? false) ||
      (e.plan?.name?.toLowerCase().includes(q) ?? false) ||
      (e.external_subscription_id?.includes(q) ?? false);
    const matchStatus = filterStatus === "all" || e.payment_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = (data ?? [])
    .filter(e => e.payment_status === "active")
    .reduce((sum, e) => sum + (e.plan?.price_cents ?? 0), 0);

  const cell = "px-4 py-3 text-sm";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-700 font-display" style={{ color: "#f1f5f9" }}>Payments</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.5)" }}>Enrollment and payment status across all families</p>
        </div>
        <div className="rounded-2xl p-4 text-right" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "rgba(226,232,240,0.4)" }}>Active Revenue</p>
          <p className="text-2xl font-700 font-display" style={{ color: "#34d399" }}>
            ${(totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.keys(STATUS_STYLES).map(status => {
          const count = (data ?? []).filter(e => e.payment_status === status).length;
          const s = STATUS_STYLES[status];
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: filterStatus === status ? s.bg : "oklch(0.18 0.03 270)",
                border: `1px solid ${filterStatus === status ? s.color + "50" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <p className="text-xl font-700 font-display" style={{ color: s.color }}>{count}</p>
              <p className="text-xs capitalize mt-0.5" style={{ color: "rgba(226,232,240,0.5)" }}>{status.replace("_", " ")}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(226,232,240,0.35)" }} />
          <input
            type="text"
            placeholder="Search parent, child, plan…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg text-sm focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }}
          />
        </div>
        {filterStatus !== "all" && (
          <button onClick={() => setFilterStatus("all")} className="h-9 px-3 rounded-lg text-xs" style={{ color: "rgba(226,232,240,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Clear filter
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Parent", "Child", "Plan", "Provider", "Status", "External ID", "Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(226,232,240,0.45)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const s = STATUS_STYLES[e.payment_status] ?? STATUS_STYLES.canceled;
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <td className={cell} style={{ color: "#f1f5f9" }}>{e.parent?.full_name ?? "—"}</td>
                    <td className={cell} style={{ color: "rgba(226,232,240,0.7)" }}>{e.child?.display_name ?? "—"}</td>
                    <td className={cell}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: "#f1f5f9" }}>{e.plan?.name ?? "—"}</p>
                        {e.plan && (
                          <p className="text-xs" style={{ color: "rgba(226,232,240,0.4)" }}>
                            {e.plan.currency} {(e.plan.price_cents / 100).toFixed(2)} · {e.plan.kind}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className={cell}>
                      <span className="flex items-center gap-1.5" style={{ color: "rgba(226,232,240,0.6)" }}>
                        <CreditCard className="h-3.5 w-3.5" />
                        <span className="text-xs capitalize">{e.payment_provider ?? "—"}</span>
                      </span>
                    </td>
                    <td className={cell}>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={{ background: s.bg, color: s.color }}>
                        {e.payment_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className={cell}>
                      <span className="text-xs font-mono" style={{ color: "rgba(226,232,240,0.35)" }}>
                        {e.external_subscription_id ? `${e.external_subscription_id.slice(0, 12)}…` : "—"}
                      </span>
                    </td>
                    <td className={cell} style={{ color: "rgba(226,232,240,0.4)", whiteSpace: "nowrap" }}>
                      {new Date(e.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: "rgba(226,232,240,0.4)" }}>No payments found</div>
          )}
        </div>
      )}
    </div>
  );
}
