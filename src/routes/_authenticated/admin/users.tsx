import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Search, Users, Shield, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users · Leafva Admin" }] }),
  component: UsersPage,
});

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "#f43f5e" },
  instructor: { label: "Instructor", color: "#f59e0b" },
  support: { label: "Support", color: "#6366f1" },
  parent: { label: "Parent", color: "#10b981" },
};

function UsersPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, created_at");
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");
      const { data: children } = await supabase
        .from("children")
        .select("id, display_name, age, track, parent_id");
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("parent_id, payment_status, plan_id");

      const roleMap = new Map<string, string>();
      for (const r of roles ?? []) roleMap.set(r.user_id, r.role);

      const childrenMap = new Map<string, typeof children>();
      for (const c of children ?? []) {
        const arr = childrenMap.get(c.parent_id) ?? [];
        arr.push(c);
        childrenMap.set(c.parent_id, arr);
      }

      const enrollMap = new Map<string, typeof enrollments>();
      for (const e of enrollments ?? []) {
        const arr = enrollMap.get(e.parent_id) ?? [];
        arr.push(e);
        enrollMap.set(e.parent_id, arr);
      }

      return (profs ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) ?? "parent",
        children: childrenMap.get(p.id) ?? [],
        enrollments: enrollMap.get(p.id) ?? [],
      }));
    },
  });

  const filtered = (profiles ?? []).filter((p) => {
    const q = search.toLowerCase();
    return !q || (p.full_name?.toLowerCase().includes(q) ?? false) || p.id.includes(q);
  });

  const cell = "px-4 py-3 text-sm";

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-700 font-display" style={{ color: "#f1f5f9" }}>Users</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.5)" }}>
            {profiles?.length ?? 0} registered accounts
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(226,232,240,0.35)" }} />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-4 rounded-lg text-sm focus:outline-none w-56"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Name / ID", "Role", "Children", "Enrollments", "Joined", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(226,232,240,0.45)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS.parent;
                const isOpen = expandedId === u.id;
                return (
                  <>
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedId(isOpen ? null : u.id)}
                    >
                      <td className={cell}>
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full grid place-items-center text-xs font-bold" style={{ background: roleInfo.color + "25", color: roleInfo.color }}>
                            {(u.full_name ?? "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: "#f1f5f9" }}>{u.full_name ?? "—"}</p>
                            <p className="text-xs font-mono" style={{ color: "rgba(226,232,240,0.35)" }}>{u.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className={cell}>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: roleInfo.color + "20", color: roleInfo.color }}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className={`${cell} font-mono`} style={{ color: "rgba(226,232,240,0.7)" }}>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {u.children.length}
                        </span>
                      </td>
                      <td className={cell} style={{ color: "rgba(226,232,240,0.7)" }}>
                        {u.enrollments.filter(e => e.payment_status === "active").length} active
                      </td>
                      <td className={cell} style={{ color: "rgba(226,232,240,0.45)" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className={cell}>
                        {isOpen ? <ChevronUp className="h-4 w-4" style={{ color: "rgba(226,232,240,0.4)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "rgba(226,232,240,0.4)" }} />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${u.id}-expand`} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td colSpan={6} className="px-6 py-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(226,232,240,0.4)" }}>Children</p>
                              {u.children.length === 0 ? (
                                <p className="text-sm" style={{ color: "rgba(226,232,240,0.4)" }}>No children added</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {u.children.map(c => (
                                    <div key={c.id} className="flex items-center gap-2 text-sm">
                                      <span>{c.display_name}</span>
                                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.5)" }}>
                                        {c.track.replace(/_/g, " ")} · age {c.age}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(226,232,240,0.4)" }}>Role Management</p>
                              <RoleSelector userId={u.id} currentRole={u.role} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: "rgba(226,232,240,0.4)" }}>
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoleSelector({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);
  const roles = Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[];

  async function updateRole(newRole: string) {
    setSaving(true);
    await supabase.from("user_roles").upsert({ user_id: userId, role: newRole as any }, { onConflict: "user_id" });
    setRole(newRole);
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={e => updateRole(e.target.value)}
        disabled={saving}
        className="h-8 px-3 rounded-lg text-sm focus:outline-none"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" }}
      >
        {roles.map(r => (
          <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
        ))}
      </select>
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "rgba(226,232,240,0.5)" }} />}
      {!saving && <Shield className="h-3.5 w-3.5" style={{ color: ROLE_LABELS[role]?.color }} />}
    </div>
  );
}
