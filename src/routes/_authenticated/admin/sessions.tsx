import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Video, Trash2, Edit2, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateAdminAI } from "@/lib/ai-client";

export const Route = createFileRoute("/_authenticated/admin/sessions")({
  head: () => ({ meta: [{ title: "Live Sessions · Leafva Admin" }] }),
  component: SessionsPage,
});

type Provider = "zoom" | "teams" | "google_meet" | "custom";
type Track = "spark_cubs" | "code_rangers" | "cyber_pioneers";

const PROVIDER_LABELS: Record<Provider, string> = {
  zoom: "Zoom",
  teams: "Microsoft Teams",
  google_meet: "Google Meet",
  custom: "Custom URL",
};

const TRACK_LABELS: Record<Track, string> = {
  spark_cubs: "🦊 Spark Cubs",
  code_rangers: "🛡️ Code Rangers",
  cyber_pioneers: "⚡ Cyber Pioneers",
};

interface SessionForm {
  title: string;
  track: Track | "";
  provider: Provider;
  meeting_url: string;
  scheduled_at: string;
  duration_minutes: number;
  max_attendees: number | null;
  notes: string;
  is_published: boolean;
}

const DEFAULT_FORM: SessionForm = {
  title: "",
  track: "",
  provider: "zoom",
  meeting_url: "",
  scheduled_at: "",
  duration_minutes: 60,
  max_attendees: null,
  notes: "",
  is_published: false,
};

function SessionsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SessionForm>(DEFAULT_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: SessionForm) => {
      const payload = {
        title: f.title,
        track: f.track || null,
        provider: f.provider,
        meeting_url: f.meeting_url || null,
        scheduled_at: f.scheduled_at,
        duration_minutes: f.duration_minutes,
        max_attendees: f.max_attendees,
        notes: f.notes || null,
        is_published: f.is_published,
      };
      if (editId) {
        await supabase.from("live_sessions").update(payload).eq("id", editId);
      } else {
        await supabase.from("live_sessions").insert(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sessions"] });
      toast.success(editId ? "Session updated" : "Session created");
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setEditId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => supabase.from("live_sessions").delete().eq("id", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sessions"] });
      toast.success("Session deleted");
    },
  });

  async function generateAgenda() {
    if (!form.title || !form.track) { toast.error("Enter a title and track first"); return; }
    setAiLoading(true);
    const trackLabel = TRACK_LABELS[form.track as Track] ?? form.track;
    const prompt = `Generate a concise session agenda for a ${form.duration_minutes}-minute live coding class titled "${form.title}" for the ${trackLabel} track (ages ${form.track === "spark_cubs" ? "6–9" : form.track === "code_rangers" ? "10–12" : "13–15"}). Format as numbered points with time estimates. Keep it engaging and age-appropriate.`;
    const agenda = await generateAdminAI(prompt);
    setForm(prev => ({ ...prev, notes: agenda }));
    setAiLoading(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openEdit(s: any) {
    setForm({
      title: s.title,
      track: s.track ?? "",
      provider: s.provider,
      meeting_url: s.meeting_url ?? "",
      scheduled_at: s.scheduled_at?.slice(0, 16) ?? "",
      duration_minutes: s.duration_minutes,
      max_attendees: s.max_attendees,
      notes: s.notes ?? "",
      is_published: s.is_published,
    });
    setEditId(s.id);
    setShowForm(true);
  }

  const inp = "h-9 px-3 rounded-lg text-sm focus:outline-none w-full";
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" };

  const upcoming = (sessions ?? []).filter(s => new Date(s.scheduled_at) >= new Date());
  const past = (sessions ?? []).filter(s => new Date(s.scheduled_at) < new Date());

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-700 font-display" style={{ color: "#f1f5f9" }}>Live Sessions</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.5)" }}>Schedule Zoom, Teams, Google Meet, or custom link sessions</p>
        </div>
        <button
          onClick={() => { setForm(DEFAULT_FORM); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}
        >
          <Plus className="h-4 w-4" /> New session
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>{editId ? "Edit Session" : "New Session"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "rgba(226,232,240,0.5)" }}>Title *</label>
              <input className={inp} style={inputStyle} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Python Basics Live Q&A" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "rgba(226,232,240,0.5)" }}>Track</label>
              <select className={inp} style={inputStyle} value={form.track} onChange={e => setForm(p => ({ ...p, track: e.target.value as Track }))}>
                <option value="">All tracks</option>
                {Object.entries(TRACK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "rgba(226,232,240,0.5)" }}>Provider *</label>
              <select className={inp} style={inputStyle} value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value as Provider }))}>
                {Object.entries(PROVIDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "rgba(226,232,240,0.5)" }}>Meeting URL</label>
              <input className={inp} style={inputStyle} value={form.meeting_url} onChange={e => setForm(p => ({ ...p, meeting_url: e.target.value }))} placeholder="https://zoom.us/j/…" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "rgba(226,232,240,0.5)" }}>Date & Time *</label>
              <input type="datetime-local" className={inp} style={inputStyle} value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "rgba(226,232,240,0.5)" }}>Duration (minutes)</label>
              <input type="number" className={inp} style={inputStyle} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: +e.target.value }))} min={15} max={240} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: "rgba(226,232,240,0.5)" }}>Agenda / Notes</label>
              <button
                onClick={generateAgenda}
                disabled={aiLoading}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg disabled:opacity-50"
                style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Generate
              </button>
            </div>
            <textarea
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
              style={inputStyle}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Session notes or auto-generated agenda…"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "rgba(226,232,240,0.7)" }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} />
              Published (visible to parents)
            </label>
            <div className="flex-1" />
            <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl text-sm" style={{ color: "rgba(226,232,240,0.5)" }}>Cancel</button>
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.title || !form.scheduled_at}
              className="h-9 px-5 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.25)", color: "#818cf8" }}
            >
              {saveMutation.isPending ? "Saving…" : editId ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <>
          <SessionList title="Upcoming" sessions={upcoming} onEdit={openEdit} onDelete={id => deleteMutation.mutate(id)} />
          <SessionList title="Past" sessions={past} onEdit={openEdit} onDelete={id => deleteMutation.mutate(id)} faded />
        </>
      )}
    </div>
  );
}

function SessionList({ title, sessions, onEdit, onDelete, faded }: {
  title: string;
  sessions: any[];
  onEdit: (s: any) => void;
  onDelete: (id: string) => void;
  faded?: boolean;
}) {
  if (sessions.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3" style={{ color: "rgba(226,232,240,0.5)" }}>{title} ({sessions.length})</h2>
      <div className="space-y-2">
        {sessions.map(s => (
          <div
            key={s.id}
            className="flex items-center gap-4 rounded-xl px-4 py-3"
            style={{
              background: "oklch(0.18 0.03 270)",
              border: "1px solid rgba(255,255,255,0.07)",
              opacity: faded ? 0.6 : 1,
            }}
          >
            <Video className="h-4 w-4 shrink-0" style={{ color: "#6366f1" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "#f1f5f9" }}>{s.title}</p>
              <p className="text-xs" style={{ color: "rgba(226,232,240,0.5)" }}>
                {new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes}min · {PROVIDER_LABELS[s.provider as Provider]}
                {s.track ? ` · ${TRACK_LABELS[s.track as Track]}` : ""}
              </p>
            </div>
            {s.is_published && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>Published</span>
            )}
            {s.meeting_url && (
              <a href={s.meeting_url} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100" style={{ color: "#818cf8" }}>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button onClick={() => onEdit(s)} className="opacity-60 hover:opacity-100" style={{ color: "rgba(226,232,240,0.7)" }}>
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(s.id)} className="opacity-60 hover:opacity-100" style={{ color: "#f43f5e" }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
