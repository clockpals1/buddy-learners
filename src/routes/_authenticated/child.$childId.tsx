import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import { generateAIResponse, type AIMessage, type Track } from "@/lib/ai-client";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen, Gamepad2, Trophy, MessageCircle,
  Send, Loader2, ArrowLeft, Video, ExternalLink, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/child/$childId")({
  head: () => ({ meta: [{ title: "Learning Portal · Leafva Academy" }] }),
  component: ChildPortal,
});

const TRACK_META: Record<string, { label: string; color: string; emoji: string; bgColor: string }> = {
  spark_cubs: { label: "Spark Cubs", color: "oklch(0.78 0.16 50)", bgColor: "oklch(0.92 0.08 50)", emoji: "🦊" },
  code_rangers: { label: "Code Rangers", color: "oklch(0.72 0.16 145)", bgColor: "oklch(0.92 0.08 145)", emoji: "🛡️" },
  cyber_pioneers: { label: "Cyber Pioneers", color: "oklch(0.55 0.18 275)", bgColor: "oklch(0.88 0.06 275)", emoji: "⚡" },
};

const GAMES = [
  { slug: "pixel-pet-coder", name: "Pixel Pet Coder", desc: "Block-code your pet through mazes", emoji: "🐾", tracks: ["spark_cubs"], soon: false },
  { slug: "typing-ninjas", name: "Typing Ninjas", desc: "Build speed and accuracy with fun exercises", emoji: "⌨️", tracks: ["spark_cubs", "code_rangers"], soon: false },
  { slug: "packet-race", name: "Packet Race", desc: "Race your data packet through the internet!", emoji: "📦", tracks: ["spark_cubs", "code_rangers"], soon: false },
  { slug: "bug-hunt-squad", name: "Bug Hunt Squad", desc: "Find and squash code bugs before the timer runs out", emoji: "🐛", tracks: ["code_rangers"], soon: false },
  { slug: "scam-spotter", name: "Scam Spotter", desc: "Learn to identify phishing, scams, and fake news", emoji: "🔍", tracks: ["code_rangers", "cyber_pioneers"], soon: true },
  { slug: "cipher-quest", name: "Cipher Quest", desc: "Decode secret messages and learn cryptography", emoji: "🔐", tracks: ["cyber_pioneers"], soon: true },
  { slug: "ai-buddy-builder", name: "AI Buddy Builder", desc: "Use the Groq API to build your own chatbot", emoji: "🤖", tracks: ["cyber_pioneers"], soon: true },
  { slug: "ctf-jr", name: "Capture the Flag Jr.", desc: "Sandboxed ethical hacking challenges", emoji: "🚩", tracks: ["cyber_pioneers"], soon: true },
];

type Tab = "lessons" | "games" | "badges" | "sessions" | "ai-tutor";

function ChildPortal() {
  const { childId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("lessons");

  const { data: child } = useQuery({
    queryKey: ["child", childId],
    queryFn: async () => {
      const { data } = await supabase.from("children").select("*").eq("id", childId).single();
      return data;
    },
  });

  if (!child) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-brand-600)" }} />
      </div>
    );
  }

  const meta = TRACK_META[child.track] ?? TRACK_META.spark_cubs;

  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "lessons", label: "Lessons", icon: BookOpen },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "sessions", label: "Live Sessions", icon: Video },
    { id: "badges", label: "My Badges", icon: Trophy },
    { id: "ai-tutor", label: "AI Tutor", icon: MessageCircle },
  ];

  return (
    <div className="min-h-dvh" style={{ background: "oklch(0.97 0.01 270)" }}>
      {/* Header */}
      <header className="sticky top-0 z-30" style={{ background: "white", borderBottom: "1px solid oklch(0.92 0.01 270)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/portal" className="text-sm font-medium flex items-center gap-1.5" style={{ color: "oklch(0.5 0.01 270)" }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-2xl">{meta.emoji}</span>
            <div>
              <p className="text-sm font-700 leading-none" style={{ color: "oklch(0.2 0.02 270)" }}>{child.display_name}</p>
              <p className="text-xs" style={{ color: "oklch(0.55 0.01 270)" }}>{meta.label} · age {child.age}</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: tab === t.id ? meta.color + "18" : "transparent",
                  color: tab === t.id ? meta.color : "oklch(0.55 0.01 270)",
                }}
              >
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "lessons" && <LessonsTab childId={childId} track={child.track as Track} meta={meta} />}
        {tab === "games" && <GamesTab track={child.track} meta={meta} />}
        {tab === "sessions" && <SessionsTab track={child.track} meta={meta} />}
        {tab === "badges" && <BadgesTab childId={childId} track={child.track} meta={meta} />}
        {tab === "ai-tutor" && <AITutorTab childId={childId} track={child.track as Track} name={child.display_name} meta={meta} />}
      </main>
    </div>
  );
}

function LessonsTab({ childId, track, meta }: { childId: string; track: Track; meta: typeof TRACK_META[string] }) {
  const qc = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ["courses-portal", track],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*, lessons(*)").eq("track", track).eq("is_published", true).order("order_index");
      return data ?? [];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", childId],
    queryFn: async () => {
      const { data } = await supabase.from("lesson_progress").select("lesson_id, completed").eq("child_id", childId);
      const map: Record<string, boolean> = {};
      for (const p of data ?? []) map[p.lesson_id] = p.completed;
      return map;
    },
  });

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      await supabase.from("lesson_progress").upsert({ child_id: childId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() }, { onConflict: "child_id,lesson_id" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress", childId] }),
  });

  if (!courses?.length) {
    return <div className="py-20 text-center text-sm" style={{ color: "oklch(0.55 0.01 270)" }}>No lessons published yet. Check back soon!</div>;
  }

  return (
    <div className="space-y-6">
      {courses.map((course: any) => {
        const lessons = course.lessons?.filter((l: any) => l.is_published) ?? [];
        const completedCount = lessons.filter((l: any) => progress?.[l.id]).length;
        const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

        return (
          <div key={course.id} className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="px-5 py-4" style={{ background: meta.color + "12", borderBottom: "1px solid " + meta.color + "20" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-700 text-base" style={{ color: "oklch(0.2 0.02 270)" }}>Week {course.week_number}: {course.title}</p>
                  {course.description && <p className="text-sm mt-0.5" style={{ color: "oklch(0.5 0.01 270)" }}>{course.description}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-700" style={{ color: meta.color }}>{pct}%</p>
                  <p className="text-xs" style={{ color: "oklch(0.55 0.01 270)" }}>{completedCount}/{lessons.length} done</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: meta.color + "20" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: meta.color }} />
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: "oklch(0.94 0.01 270)" }}>
              {lessons.map((l: any, i: number) => {
                const done = !!progress?.[l.id];
                return (
                  <div key={l.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="h-7 w-7 rounded-full grid place-items-center text-sm font-700 shrink-0" style={{ background: done ? meta.color : "oklch(0.94 0.01 270)", color: done ? "white" : "oklch(0.6 0.01 270)" }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: done ? "oklch(0.55 0.01 270)" : "oklch(0.2 0.02 270)", textDecoration: done ? "line-through" : "none" }}>{l.title}</p>
                      <p className="text-xs" style={{ color: "oklch(0.6 0.01 270)" }}>{l.type} · {l.duration_minutes} min</p>
                    </div>
                    {l.content_url && (
                      <a href={l.content_url} target="_blank" rel="noreferrer" className="h-7 w-7 grid place-items-center rounded-lg" style={{ background: meta.color + "15" }}>
                        <ExternalLink className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      </a>
                    )}
                    {!done && (
                      <button
                        onClick={() => markComplete.mutate(l.id)}
                        disabled={markComplete.isPending}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
                        style={{ background: meta.color + "15", color: meta.color }}
                      >
                        Mark done
                      </button>
                    )}
                    {done && <CheckCircle2 className="h-5 w-5" style={{ color: meta.color }} />}
                  </div>
                );
              })}
              {lessons.length === 0 && (
                <div className="py-6 text-center text-sm" style={{ color: "oklch(0.6 0.01 270)" }}>No lessons in this course yet</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GamesTab({ track, meta }: { track: string; meta: typeof TRACK_META[string] }) {
  const myGames = GAMES.filter(g => g.tracks.includes(track));

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold" style={{ color: "oklch(0.4 0.02 270)" }}>Games for {meta.label}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {myGames.map(g => (
          <div key={g.slug} className="rounded-2xl p-5 bg-white relative overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            {g.soon && (
              <div className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: meta.color + "20", color: meta.color }}>
                Coming soon
              </div>
            )}
            <div className="text-4xl mb-3">{g.emoji}</div>
            <p className="font-700 text-base mb-1" style={{ color: "oklch(0.2 0.02 270)" }}>{g.name}</p>
            <p className="text-sm" style={{ color: "oklch(0.55 0.01 270)" }}>{g.desc}</p>
            {!g.soon && (
              <button className="mt-4 w-full py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80" style={{ background: meta.color, color: "white" }}>
                Play now
              </button>
            )}
          </div>
        ))}
        {myGames.length === 0 && (
          <div className="col-span-3 py-12 text-center text-sm" style={{ color: "oklch(0.6 0.01 270)" }}>No games yet for your track.</div>
        )}
      </div>
    </div>
  );
}

function SessionsTab({ track, meta }: { track: string; meta: typeof TRACK_META[string] }) {
  const { data: sessions } = useQuery({
    queryKey: ["sessions-portal", track],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("is_published", true)
        .or(`track.eq.${track},track.is.null`)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(10);
      return data ?? [];
    },
  });

  if (!sessions?.length) {
    return <div className="py-20 text-center text-sm" style={{ color: "oklch(0.55 0.01 270)" }}>No upcoming sessions yet. Check back soon!</div>;
  }

  return (
    <div className="space-y-4">
      {sessions.map(s => (
        <div key={s.id} className="rounded-2xl p-5 bg-white flex items-start gap-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="h-12 w-12 rounded-xl grid place-items-center text-2xl shrink-0" style={{ background: meta.color + "18" }}>
            <Video className="h-5 w-5" style={{ color: meta.color }} />
          </div>
          <div className="flex-1">
            <p className="font-700 text-base" style={{ color: "oklch(0.2 0.02 270)" }}>{s.title}</p>
            <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.01 270)" }}>
              {new Date(s.scheduled_at).toLocaleString()} · {s.duration_minutes} minutes · {s.provider}
            </p>
            {s.notes && <p className="text-sm mt-2" style={{ color: "oklch(0.5 0.01 270)" }}>{s.notes}</p>}
          </div>
          {s.meeting_url && (
            <a
              href={s.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: meta.color, color: "white" }}
            >
              Join <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function BadgesTab({ childId, track, meta }: { childId: string; track: string; meta: typeof TRACK_META[string] }) {
  const { data: allBadges } = useQuery({
    queryKey: ["badge-defs"],
    queryFn: async () => {
      const { data } = await supabase.from("badge_defs").select("*");
      return data ?? [];
    },
  });

  const { data: earned } = useQuery({
    queryKey: ["child-badges", childId],
    queryFn: async () => {
      const { data } = await supabase.from("child_badges").select("badge_slug, earned_at").eq("child_id", childId);
      const map: Record<string, string> = {};
      for (const b of data ?? []) map[b.badge_slug] = b.earned_at;
      return map;
    },
  });

  const relevant = (allBadges ?? []).filter(b => !b.track || b.track === track);
  const earnedCount = relevant.filter(b => earned?.[b.slug]).length;

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold" style={{ color: "oklch(0.4 0.02 270)" }}>
        {earnedCount} of {relevant.length} badges earned
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {relevant.map(b => {
          const hasEarned = !!earned?.[b.slug];
          return (
            <div key={b.slug} className="flex flex-col items-center gap-2 text-center">
              <div
                className="h-16 w-16 rounded-2xl grid place-items-center text-3xl transition-all"
                style={{
                  background: hasEarned ? meta.color + "20" : "oklch(0.94 0.01 270)",
                  border: `2px solid ${hasEarned ? meta.color + "50" : "transparent"}`,
                  filter: hasEarned ? "none" : "grayscale(1) opacity(0.35)",
                }}
              >
                {b.icon_emoji}
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight" style={{ color: hasEarned ? "oklch(0.2 0.02 270)" : "oklch(0.7 0.01 270)" }}>{b.name}</p>
                {hasEarned && earned?.[b.slug] && (
                  <p className="text-xs" style={{ color: meta.color }}>{new Date(earned[b.slug]).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AITutorTab({ childId, track, name, meta }: { childId: string; track: Track; name: string; meta: typeof TRACK_META[string] }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const greeting = {
    spark_cubs: `Hi ${name}! I'm Sparky, your AI buddy! 🦊 What do you want to learn today?`,
    code_rangers: `Hey ${name}! I'm Ranger, your coding guide 🛡️ Ready to level up? Ask me anything!`,
    cyber_pioneers: `What's up ${name}? I'm Pioneer ⚡ — your AI mentor for all things code, AI, and cyber. What do you need?`,
  }[track] ?? `Hi ${name}! I'm your AI tutor. What do you want to learn?`;

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: AIMessage = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    const result = await generateAIResponse({ messages: next, childId, track, isGraded: false });
    if (result.error) {
      setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I had trouble: ${result.error}` }]);
    } else {
      setMessages(prev => [...prev, { role: "assistant", content: result.content }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col rounded-2xl bg-white overflow-hidden" style={{ height: "60vh", minHeight: 400, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3" style={{ background: meta.color + "12", borderBottom: "1px solid " + meta.color + "20" }}>
        <div className="h-8 w-8 rounded-full grid place-items-center text-lg" style={{ background: meta.color + "25" }}>
          {meta.emoji}
        </div>
        <div>
          <p className="text-sm font-700" style={{ color: "oklch(0.2 0.02 270)" }}>AI Tutor</p>
          <p className="text-xs" style={{ color: "oklch(0.55 0.01 270)" }}>Powered by Groq · age-appropriate responses</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Greeting */}
        <div className="flex items-start gap-3">
          <div className="h-7 w-7 rounded-full grid place-items-center text-base shrink-0" style={{ background: meta.color + "20" }}>{meta.emoji}</div>
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-sm" style={{ background: meta.color + "12", color: "oklch(0.2 0.02 270)" }}>
            {greeting}
          </div>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className="h-7 w-7 rounded-full grid place-items-center text-sm font-700 shrink-0"
              style={{ background: m.role === "user" ? meta.color : meta.color + "20", color: m.role === "user" ? "white" : meta.color }}
            >
              {m.role === "user" ? name[0].toUpperCase() : meta.emoji}
            </div>
            <div
              className="rounded-2xl px-4 py-3 text-sm max-w-sm whitespace-pre-wrap"
              style={{
                background: m.role === "user" ? meta.color : "oklch(0.96 0.01 270)",
                color: m.role === "user" ? "white" : "oklch(0.2 0.02 270)",
                borderRadius: m.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-full grid place-items-center text-base shrink-0" style={{ background: meta.color + "20" }}>{meta.emoji}</div>
            <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.96 0.01 270)" }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: meta.color }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex gap-3" style={{ borderTop: "1px solid oklch(0.94 0.01 270)" }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask a question…"
          className="flex-1 h-10 px-4 rounded-xl text-sm focus:outline-none"
          style={{ background: "oklch(0.95 0.01 270)", color: "oklch(0.2 0.02 270)" }}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="h-10 w-10 grid place-items-center rounded-xl disabled:opacity-40"
          style={{ background: meta.color, color: "white" }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
