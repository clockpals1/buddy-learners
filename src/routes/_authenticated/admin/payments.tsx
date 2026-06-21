import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { CreditCard, Search, Loader2, Plus, Edit2, Trash2, Check, X, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

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

type PlanKind = "free" | "family" | "school";
type PlanRow = { id: string; slug: string; name: string; kind: PlanKind; price_cents: number; currency: string; description: string | null; sibling_discount_pct: number; stripe_price_id: string | null; paypal_plan_id: string | null; is_active: boolean; created_at: string };
const KIND_COLORS: Record<PlanKind, string> = { free: "#94a3b8", family: "#818cf8", school: "#f97316" };
const BLANK_PLAN: Omit<PlanRow, "id" | "created_at"> = { slug: "", name: "", kind: "family", price_cents: 0, currency: "usd", description: "", sibling_discount_pct: 0, stripe_price_id: "", paypal_plan_id: "", is_active: true };

function PlansManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof BLANK_PLAN>(BLANK_PLAN);
  const [showNew, setShowNew] = useState(false);

  const { data: plans, isLoading } = useQuery<PlanRow[]>({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("price_cents");
      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
        stripe_price_id: form.stripe_price_id || null,
        paypal_plan_id: form.paypal_plan_id || null,
      };
      if (editing === "new") {
        const { error } = await supabase.from("plans").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").update(payload).eq("id", editing!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success(editing === "new" ? "Plan created" : "Plan updated");
      setEditing(null); setShowNew(false); setForm(BLANK_PLAN);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("plans").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-plans"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-plans"] }); toast.success("Plan deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(p: PlanRow) {
    setForm({ slug: p.slug, name: p.name, kind: p.kind, price_cents: p.price_cents, currency: p.currency, description: p.description ?? "", sibling_discount_pct: p.sibling_discount_pct, stripe_price_id: p.stripe_price_id ?? "", paypal_plan_id: p.paypal_plan_id ?? "", is_active: p.is_active });
    setEditing(p.id);
    setShowNew(false);
  }

  function startNew() { setForm(BLANK_PLAN); setEditing("new"); setShowNew(true); }

  const inp = "h-9 px-3 rounded-lg text-sm focus:outline-none w-full";
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" };
  const labelStyle = { color: "rgba(226,232,240,0.45)" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>{plans?.length ?? 0} pricing plans</p>
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
          <Plus className="h-3.5 w-3.5" /> New plan
        </button>
      </div>

      {(editing === "new" || showNew) && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(99,102,241,0.3)" }}>
          <p className="text-sm font-semibold" style={{ color: "#818cf8" }}>New Plan</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><label className="text-xs mb-1 block" style={labelStyle}>Plan name *</label><input className={inp} style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Family Pro" /></div>
            <div><label className="text-xs mb-1 block" style={labelStyle}>Kind</label>
              <select className={inp} style={inputStyle} value={form.kind} onChange={e => setForm(p => ({ ...p, kind: e.target.value as PlanKind }))}>
                <option value="free">Free</option><option value="family">Family</option><option value="school">School</option>
              </select>
            </div>
            <div><label className="text-xs mb-1 block" style={labelStyle}>Price (cents) — e.g. 1999 = $19.99</label><input type="number" className={inp} style={inputStyle} value={form.price_cents} onChange={e => setForm(p => ({ ...p, price_cents: +e.target.value }))} min={0} /></div>
            <div><label className="text-xs mb-1 block" style={labelStyle}>Currency</label><input className={inp} style={inputStyle} value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} placeholder="usd" /></div>
            <div><label className="text-xs mb-1 block" style={labelStyle}>Sibling discount %</label><input type="number" className={inp} style={inputStyle} value={form.sibling_discount_pct} onChange={e => setForm(p => ({ ...p, sibling_discount_pct: +e.target.value }))} min={0} max={100} /></div>
            <div><label className="text-xs mb-1 block" style={labelStyle}>Slug (auto-generated if blank)</label><input className={inp} style={inputStyle} value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="family-pro" /></div>
          </div>
          <div><label className="text-xs mb-1 block" style={labelStyle}>Description</label><textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none" style={inputStyle} value={form.description ?? ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What's included in this plan…" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs mb-1 block" style={labelStyle}>Stripe Price ID</label><input className={inp} style={inputStyle} value={form.stripe_price_id ?? ""} onChange={e => setForm(p => ({ ...p, stripe_price_id: e.target.value }))} placeholder="price_..." /></div>
            <div><label className="text-xs mb-1 block" style={labelStyle}>PayPal Plan ID</label><input className={inp} style={inputStyle} value={form.paypal_plan_id ?? ""} onChange={e => setForm(p => ({ ...p, paypal_plan_id: e.target.value }))} placeholder="P-..." /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditing(null); setShowNew(false); }} className="h-8 px-3 rounded-lg text-xs" style={{ color: "rgba(226,232,240,0.4)" }}>Cancel</button>
            <button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending || !form.name} className="h-8 px-4 rounded-lg text-xs font-semibold disabled:opacity-40" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
              {upsertMutation.isPending ? "Saving…" : "Create plan"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}><Loader2 className="h-4 w-4 animate-spin" /> Loading plans…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(plans ?? []).map(p => (
            <div key={p.id} className="rounded-2xl p-4 space-y-3 relative" style={{ background: "oklch(0.18 0.03 270)", border: `1px solid ${KIND_COLORS[p.kind]}30`, opacity: p.is_active ? 1 : 0.5 }}>
              {editing === p.id ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold" style={{ color: KIND_COLORS[p.kind] }}>Editing {p.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs mb-1 block" style={labelStyle}>Name</label><input className={inp} style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div><label className="text-xs mb-1 block" style={labelStyle}>Kind</label>
                      <select className={inp} style={inputStyle} value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as PlanKind }))}>
                        <option value="free">Free</option><option value="family">Family</option><option value="school">School</option>
                      </select>
                    </div>
                    <div><label className="text-xs mb-1 block" style={labelStyle}>Price (cents)</label><input type="number" className={inp} style={inputStyle} value={form.price_cents} onChange={e => setForm(f => ({ ...f, price_cents: +e.target.value }))} /></div>
                    <div><label className="text-xs mb-1 block" style={labelStyle}>Sibling % off</label><input type="number" className={inp} style={inputStyle} value={form.sibling_discount_pct} onChange={e => setForm(f => ({ ...f, sibling_discount_pct: +e.target.value }))} /></div>
                  </div>
                  <textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none" style={inputStyle} value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description…" />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inp} style={inputStyle} value={form.stripe_price_id ?? ""} onChange={e => setForm(f => ({ ...f, stripe_price_id: e.target.value }))} placeholder="Stripe price_..." />
                    <input className={inp} style={inputStyle} value={form.paypal_plan_id ?? ""} onChange={e => setForm(f => ({ ...f, paypal_plan_id: e.target.value }))} placeholder="PayPal P-..." />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditing(null)} className="h-7 px-3 rounded-lg text-xs" style={{ color: "rgba(226,232,240,0.4)" }}><X className="h-3 w-3" /></button>
                    <button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending} className="h-7 px-3 rounded-lg text-xs font-semibold disabled:opacity-40" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: KIND_COLORS[p.kind] + "20", color: KIND_COLORS[p.kind] }}>{p.kind}</span>
                      <h3 className="text-base font-700 font-display mt-1.5" style={{ color: "#f1f5f9" }}>{p.name}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(p)} className="h-7 w-7 rounded-lg grid place-items-center opacity-50 hover:opacity-100" style={{ background: "rgba(255,255,255,0.05)" }}><Edit2 className="h-3 w-3" /></button>
                      <button onClick={() => deleteMutation.mutate(p.id)} className="h-7 w-7 rounded-lg grid place-items-center opacity-50 hover:opacity-100" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <p className="text-2xl font-700 font-display" style={{ color: KIND_COLORS[p.kind] }}>
                    {p.price_cents === 0 ? "Free" : `$${(p.price_cents / 100).toFixed(2)}`}
                    {p.price_cents > 0 && <span className="text-xs font-normal ml-1" style={{ color: "rgba(226,232,240,0.4)" }}>/{p.currency}/mo</span>}
                  </p>
                  {p.description && <p className="text-xs" style={{ color: "rgba(226,232,240,0.5)" }}>{p.description}</p>}
                  {p.sibling_discount_pct > 0 && <p className="text-xs" style={{ color: "#34d399" }}>🎉 {p.sibling_discount_pct}% sibling discount</p>}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs space-y-0.5">
                      {p.stripe_price_id && <p style={{ color: "rgba(226,232,240,0.35)" }}>Stripe: {p.stripe_price_id}</p>}
                      {p.paypal_plan_id && <p style={{ color: "rgba(226,232,240,0.35)" }}>PayPal: {p.paypal_plan_id}</p>}
                    </div>
                    <button onClick={() => toggleMutation.mutate({ id: p.id, is_active: !p.is_active })} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: p.is_active ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)", color: p.is_active ? "#34d399" : "rgba(226,232,240,0.35)" }}>
                      {p.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />} {p.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentsPage() {
  const [tab, setTab] = useState<"plans" | "enrollments">("plans");
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
          <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.5)" }}>{tab === "plans" ? "Manage pricing plans" : "Enrollment and payment status"}</p>
        </div>
        {tab === "enrollments" && (
          <div className="rounded-2xl p-4 text-right" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "rgba(226,232,240,0.4)" }}>Active Revenue</p>
            <p className="text-2xl font-700 font-display" style={{ color: "#34d399" }}>
              ${(totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("plans")}
          className="px-4 py-2 rounded-xl text-sm font-medium transition"
          style={{
            background: tab === "plans" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
            color: tab === "plans" ? "#818cf8" : "rgba(226,232,240,0.5)",
            border: `1px solid ${tab === "plans" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
          }}
        >
          <DollarSign className="h-4 w-4 inline mr-1.5" /> Plans
        </button>
        <button
          onClick={() => setTab("enrollments")}
          className="px-4 py-2 rounded-xl text-sm font-medium transition"
          style={{
            background: tab === "enrollments" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
            color: tab === "enrollments" ? "#818cf8" : "rgba(226,232,240,0.5)",
            border: `1px solid ${tab === "enrollments" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
          }}
        >
          <CreditCard className="h-4 w-4 inline mr-1.5" /> Enrollments
        </button>
      </div>

      {tab === "plans" ? <PlansManager /> : (
        <>
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
      </>
    )}
    </div>
  );
}
