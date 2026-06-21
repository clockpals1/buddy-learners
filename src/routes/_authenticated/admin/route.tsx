import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Video, BookOpen,
  CreditCard, Settings, LogOut, Sparkles, Menu, X, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { user } = context as { user: { id: string } };
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "instructor"])
      .maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
    return { adminRole: data.role as string };
  },
  component: AdminLayout,
});

const NAV_ITEMS = [
  { to: "/admin" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/users" as const, label: "Users", icon: Users },
  { to: "/admin/sessions" as const, label: "Live Sessions", icon: Video },
  { to: "/admin/curriculum" as const, label: "Curriculum", icon: BookOpen },
  { to: "/admin/payments" as const, label: "Payments", icon: CreditCard },
  { to: "/admin/settings" as const, label: "Settings", icon: Settings },
];

function AdminLayout() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh flex" style={{ background: "oklch(0.12 0.02 270)", color: "#e2e8f0" }}>
      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0"
        style={{
          background: "oklch(0.16 0.03 270)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          transform: open ? "translateX(0)" : undefined,
        }}
      >
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-white/8">
          <span className="grid place-items-center h-7 w-7 rounded-lg text-white" style={{ background: "var(--gradient-sunrise)" }}>
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="font-display font-700 text-sm" style={{ color: "#f1f5f9" }}>Leafva Admin</span>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={exact ? { exact: true } : undefined}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "rgba(226,232,240,0.6)" }}
              activeProps={{ style: { background: "rgba(255,255,255,0.1)", color: "#f1f5f9" } }}
              inactiveProps={{ className: "hover:bg-white/5 hover:text-white/90" }}
              onClick={() => setOpen(false)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-white/8 space-y-0.5">
          <Link
            to="/portal"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ color: "rgba(226,232,240,0.5)" }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Parent portal
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: "rgba(226,232,240,0.6)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "rgba(226,232,240,0.6)"; }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="h-14 flex items-center px-5 gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "oklch(0.14 0.02 270)" }}
        >
          <button onClick={() => setOpen(true)} className="lg:hidden opacity-60 hover:opacity-100 transition">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-xs font-medium" style={{ color: "rgba(226,232,240,0.4)" }}>
            Leafva Academy Control Center
          </span>
        </header>

        <main className="flex-1 overflow-auto p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
