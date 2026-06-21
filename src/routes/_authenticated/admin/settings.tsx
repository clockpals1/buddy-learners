import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Save, CheckCircle2, XCircle, Info, Loader2, UserPlus, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings · Leafva Admin" }] }),
  component: IntegrationSettings,
});

interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  isSecret: boolean;
  description: string;
  docsUrl?: string;
}

const INTEGRATION_GROUPS: { group: string; color: string; fields: IntegrationField[] }[] = [
  {
    group: "Groq AI",
    color: "#f97316",
    fields: [
      { key: "GROQ_API_KEY", label: "Groq API Key", placeholder: "gsk_...", isSecret: true, description: "Obtain from console.groq.com. Powers the AI Teaching Assistant and lesson-plan generator.", docsUrl: "https://console.groq.com" },
      { key: "GROQ_MODEL", label: "Model (optional)", placeholder: "llama-3.3-70b-versatile", isSecret: false, description: "Groq model slug. Leave blank to use llama-3.3-70b-versatile (default). Other options: mixtral-8x7b-32768, llama-3.1-8b-instant." },
    ],
  },
  {
    group: "Stripe Payments",
    color: "#635bff",
    fields: [
      { key: "STRIPE_SECRET_KEY", label: "Secret Key", placeholder: "sk_live_...", isSecret: true, description: "Secret API key from Stripe Dashboard. Never exposed to the browser.", docsUrl: "https://dashboard.stripe.com/apikeys" },
      { key: "STRIPE_PUBLISHABLE_KEY", label: "Publishable Key", placeholder: "pk_live_...", isSecret: false, description: "Publishable key returned to the checkout UI for Stripe Elements.", docsUrl: "https://dashboard.stripe.com/apikeys" },
      { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Signing Secret", placeholder: "whsec_...", isSecret: true, description: "From Stripe Dashboard → Webhooks. Used to verify incoming webhook events." },
    ],
  },
  {
    group: "PayPal Payments",
    color: "#003087",
    fields: [
      { key: "PAYPAL_CLIENT_ID", label: "Client ID", placeholder: "AY...", isSecret: false, description: "PayPal app Client ID. Set PAYPAL_SANDBOX to false for live mode.", docsUrl: "https://developer.paypal.com/dashboard" },
      { key: "PAYPAL_CLIENT_SECRET", label: "Client Secret", placeholder: "EP...", isSecret: true, description: "PayPal app Client Secret. Stored securely and never exposed to the browser." },
      { key: "PAYPAL_WEBHOOK_ID", label: "Webhook ID", placeholder: "5HL...", isSecret: false, description: "PayPal webhook ID from Developer Dashboard. Used to verify incoming events." },
      { key: "PAYPAL_SANDBOX", label: "Sandbox Mode", placeholder: "true", isSecret: false, description: 'Set to "true" for sandbox/testing, "false" for live PayPal transactions.' },
    ],
  },
  {
    group: "Zoom (Live Sessions)",
    color: "#2d8cff",
    fields: [
      { key: "ZOOM_ACCOUNT_ID", label: "Account ID", placeholder: "abc123...", isSecret: false, description: "From Zoom Marketplace → Server-to-Server OAuth app.", docsUrl: "https://marketplace.zoom.us" },
      { key: "ZOOM_CLIENT_ID", label: "Client ID", placeholder: "xyz...", isSecret: false, description: "Client ID of your Zoom Server-to-Server OAuth app." },
      { key: "ZOOM_CLIENT_SECRET", label: "Client Secret", placeholder: "...", isSecret: true, description: "Client Secret of your Zoom Server-to-Server OAuth app." },
    ],
  },
  {
    group: "Microsoft Teams (Live Sessions)",
    color: "#6264a7",
    fields: [
      { key: "TEAMS_TENANT_ID", label: "Tenant ID", placeholder: "...", isSecret: false, description: "Azure AD tenant ID for your Microsoft 365 organization.", docsUrl: "https://portal.azure.com" },
      { key: "TEAMS_CLIENT_ID", label: "App Client ID", placeholder: "...", isSecret: false, description: "Azure app registration Client ID with Calendars.ReadWrite permission." },
      { key: "TEAMS_CLIENT_SECRET", label: "App Client Secret", placeholder: "...", isSecret: true, description: "Azure app registration Client Secret." },
    ],
  },
  {
    group: "Email (Transactional)",
    color: "#0ea5e9",
    fields: [
      { key: "EMAIL_PROVIDER", label: "Provider", placeholder: "resend", isSecret: false, description: 'Email provider slug: "resend", "sendgrid", or "postmark".' },
      { key: "RESEND_API_KEY", label: "Resend API Key", placeholder: "re_xxx", isSecret: true, description: "Resend API key from resend.com. Powers transactional emails and AI-generated templates.", docsUrl: "https://resend.com/api-keys" },
      { key: "EMAIL_FROM_ADDRESS", label: "From Address", placeholder: "support@leafva.ca", isSecret: false, description: "Verified sender email address. Default: support@leafva.ca" },
    ],
  },
  {
    group: "S3-Compatible Storage",
    color: "#f59e0b",
    fields: [
      { key: "S3_ENDPOINT", label: "Endpoint URL", placeholder: "https://s3.amazonaws.com", isSecret: false, description: "S3-compatible storage endpoint (AWS, Backblaze B2, Cloudflare R2, etc.)" },
      { key: "S3_BUCKET", label: "Bucket Name", placeholder: "leafva-files", isSecret: false, description: "Storage bucket for assignments, materials, and certificates." },
      { key: "S3_ACCESS_KEY_ID", label: "Access Key ID", placeholder: "AKIA...", isSecret: false, description: "S3 access key ID." },
      { key: "S3_SECRET_ACCESS_KEY", label: "Secret Access Key", placeholder: "...", isSecret: true, description: "S3 secret access key. Stored securely server-side." },
      { key: "S3_REGION", label: "Region", placeholder: "us-east-1", isSecret: false, description: "S3 region or 'auto' for providers like Cloudflare R2." },
    ],
  },
];

function FieldRow({ field, saved, onSave }: { field: IntegrationField; saved: boolean; onSave: (key: string, value: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(field.key, value.trim());
    setSaving(false);
    setValue("");
  }

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" style={{ color: "#f1f5f9" }}>{field.label}</label>
            {saved ? (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                <CheckCircle2 className="h-3 w-3" /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(244,63,94,0.1)", color: "#fb7185" }}>
                <XCircle className="h-3 w-3" /> Not set
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "rgba(226,232,240,0.45)" }}>{field.description}</p>
        </div>
        {field.docsUrl && (
          <a href={field.docsUrl} target="_blank" rel="noreferrer" className="text-xs shrink-0" style={{ color: "rgba(226,232,240,0.4)" }}>
            Docs ↗
          </a>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <div className="relative flex-1">
          <input
            type={field.isSecret && !show ? "password" : "text"}
            placeholder={saved ? "••••••••  (enter new value to update)" : field.placeholder}
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full h-9 px-3 rounded-lg text-sm font-mono focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f1f5f9",
            }}
          />
          {field.isSecret && (
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: "rgba(226,232,240,0.4)" }}
            >
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition"
          style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>
      </div>
    </div>
  );
}

function ManualUpgrade() {
  const qc = useQueryClient();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const { data: children } = useQuery({
    queryKey: ["all-children"],
    queryFn: async () => {
      const { data } = await supabase.from("children").select("id, display_name, parent_id").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChild || !selectedPlan) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if child already has an active enrollment
      const { data: existing } = await supabase
        .from("enrollments")
        .select("*")
        .eq("child_id", selectedChild)
        .eq("payment_status", "active")
        .maybeSingle();

      if (existing) {
        // Update existing enrollment
        const { error } = await supabase
          .from("enrollments")
          .update({
            plan_id: selectedPlan,
            is_manual: true as any,
            upgraded_by: user.id as any,
            upgraded_at: new Date().toISOString() as any,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Create new enrollment
        const { data: child } = await supabase.from("children").select("parent_id").eq("id", selectedChild).single();
        if (!child) throw new Error("Child not found");

        const { error } = await supabase.from("enrollments").insert({
          child_id: selectedChild,
          parent_id: child.parent_id,
          plan_id: selectedPlan,
          payment_status: "active",
          is_manual: true as any,
          upgraded_by: user.id as any,
          upgraded_at: new Date().toISOString() as any,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Child upgraded successfully");
      setSelectedChild("");
      setSelectedPlan("");
      qc.invalidateQueries({ queryKey: ["all-children"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4" style={{ color: "#818cf8" }} />
        <h2 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>Manual User Upgrade</h2>
      </div>
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-xs mb-4" style={{ color: "rgba(226,232,240,0.5)" }}>
          Manually upgrade a child to a paid plan without payment processing. This creates a manual enrollment record.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "#f1f5f9" }}>Select Child</label>
            <select
              value={selectedChild}
              onChange={e => setSelectedChild(e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f1f5f9",
              }}
            >
              <option value="">Choose a child...</option>
              {children?.map(c => (
                <option key={c.id} value={c.id}>{c.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "#f1f5f9" }}>Select Plan</label>
            <select
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#f1f5f9",
              }}
            >
              <option value="">Choose a plan...</option>
              {plans?.map(p => (
                <option key={p.id} value={p.id}>{p.name} (${p.price_cents / 100})</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => upgradeMutation.mutate()}
          disabled={!selectedChild || !selectedPlan || upgradeMutation.isPending}
          className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition"
          style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}
        >
          {upgradeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpRight className="h-3 w-3" />}
          Upgrade Child
        </button>
      </div>
    </section>
  );
}

function IntegrationSettings() {
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [auditLog, setAuditLog] = useState<{ action: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("integration_settings")
        .select("key");
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) map[row.key] = true;
      setConfigured(map);

      const { data: logs } = await supabase
        .from("audit_log")
        .select("action, created_at")
        .eq("resource", "integration_settings")
        .order("created_at", { ascending: false })
        .limit(10);
      setAuditLog(logs ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function saveKey(key: string, value: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("integration_settings").upsert(
      { key, value, label: key, is_secret: true, updated_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) { toast.error(error.message); return; }

    setConfigured(prev => ({ ...prev, [key]: true }));
    toast.success(`${key} saved successfully`);

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: `Updated integration setting: ${key}`,
      resource: "integration_settings",
      resource_id: key,
    });

    const { data: logs } = await supabase.from("audit_log").select("action, created_at").eq("resource", "integration_settings").order("created_at", { ascending: false }).limit(10);
    setAuditLog(logs ?? []);
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}><Loader2 className="h-4 w-4 animate-spin" /> Loading settings…</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-700 font-display" style={{ color: "#f1f5f9" }}>Settings → Integrations</h1>
        <p className="mt-1 text-sm flex items-center gap-1.5" style={{ color: "rgba(226,232,240,0.5)" }}>
          <Info className="h-4 w-4" />
          All values are stored in the database (accessible only to super-admins). Keys take priority from Supabase env vars when set there.
        </p>
      </div>

      <ManualUpgrade />

      {INTEGRATION_GROUPS.map(group => (
        <section key={group.group}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-3 w-3 rounded-full" style={{ background: group.color }} />
            <h2 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>{group.group}</h2>
          </div>
          <div className="space-y-3">
            {group.fields.map(field => (
              <FieldRow key={field.key} field={field} saved={!!configured[field.key]} onSave={saveKey} />
            ))}
          </div>
        </section>
      ))}

      {/* Audit log */}
      {auditLog.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>Recent changes</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {auditLog.map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 text-xs"
                style={{
                  borderBottom: i < auditLog.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  color: "rgba(226,232,240,0.6)",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                }}
              >
                <span>{log.action}</span>
                <span style={{ color: "rgba(226,232,240,0.35)" }}>{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
