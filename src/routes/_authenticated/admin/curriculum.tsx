import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { BookOpen, Plus, Sparkles, ChevronDown, ChevronUp, Loader2, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateAdminAI } from "@/lib/ai-client";

export const Route = createFileRoute("/_authenticated/admin/curriculum")({
  head: () => ({ meta: [{ title: "Curriculum · Leafva Admin" }] }),
  component: CurriculumPage,
});

type Track = "spark_cubs" | "code_rangers" | "cyber_pioneers";

const TRACK_CONFIG = {
  spark_cubs: { label: "🦊 Spark Cubs", color: "#f97316", ages: "6–9" },
  code_rangers: { label: "🛡️ Code Rangers", color: "#10b981", ages: "10–12" },
  cyber_pioneers: { label: "⚡ Cyber Pioneers", color: "#6366f1", ages: "13–15" },
} as const;

function CurriculumPage() {
  const qc = useQueryClient();
  const [selectedTrack, setSelectedTrack] = useState<Track>("spark_cubs");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", week_number: 1 });
  const [lessonForm, setLessonForm] = useState({ title: "", type: "video", content_url: "", game_slug: "", duration_minutes: 15 });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", selectedTrack],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("track", selectedTrack)
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: lessonsMap } = useQuery({
    queryKey: ["lessons-map", selectedTrack],
    queryFn: async () => {
      const courseIds = courses?.map(c => c.id) ?? [];
      if (!courseIds.length) return {};
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .in("course_id", courseIds)
        .order("order_index");
      const map: Record<string, typeof data> = {};
      for (const l of data ?? []) {
        map[l.course_id] = [...(map[l.course_id] ?? []), l];
      }
      return map;
    },
    enabled: !!courses?.length,
  });

  const addCourseMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("courses").insert({
        ...courseForm,
        track: selectedTrack,
        order_index: (courses?.length ?? 0),
        is_published: false,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses", selectedTrack] });
      toast.success("Course created");
      setShowCourseForm(false);
      setCourseForm({ title: "", description: "", week_number: 1 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLessonMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const count = lessonsMap?.[courseId]?.length ?? 0;
      await supabase.from("lessons").insert({
        ...lessonForm,
        course_id: courseId,
        order_index: count,
        is_published: false,
        game_slug: lessonForm.game_slug || null,
        content_url: lessonForm.content_url || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons-map", selectedTrack] });
      toast.success("Lesson created");
      setShowLessonForm(null);
      setLessonForm({ title: "", type: "video", content_url: "", game_slug: "", duration_minutes: 15 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ table, id, value }: { table: "courses" | "lessons"; id: string; value: boolean }) => {
      await (supabase.from(table) as any).update({ is_published: value }).eq("id", id);
    },
    onSuccess: (_, { table }) => {
      qc.invalidateQueries({ queryKey: table === "courses" ? ["courses", selectedTrack] : ["lessons-map", selectedTrack] });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => supabase.from("courses").delete().eq("id", id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courses", selectedTrack] }); toast.success("Course deleted"); },
  });

  async function generateCourseDescription() {
    if (!courseForm.title) { toast.error("Enter a course title first"); return; }
    setAiLoading(true);
    const { ages } = TRACK_CONFIG[selectedTrack];
    const prompt = `Write a 2-sentence course description for a kids' coding camp course called "${courseForm.title}" targeting ages ${ages}. Be exciting, age-appropriate, and explain what students will learn and build. Do not use markdown.`;
    const desc = await generateAdminAI(prompt);
    setCourseForm(p => ({ ...p, description: desc }));
    setAiLoading(false);
  }

  const inp = "h-9 px-3 rounded-lg text-sm focus:outline-none w-full";
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f1f5f9" };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-700 font-display" style={{ color: "#f1f5f9" }}>Curriculum Builder</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(226,232,240,0.5)" }}>Create and manage courses and lessons by age track</p>
      </div>

      {/* Track tabs */}
      <div className="flex gap-2">
        {(Object.keys(TRACK_CONFIG) as Track[]).map(t => (
          <button
            key={t}
            onClick={() => setSelectedTrack(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition"
            style={{
              background: selectedTrack === t ? TRACK_CONFIG[t].color + "25" : "rgba(255,255,255,0.04)",
              color: selectedTrack === t ? TRACK_CONFIG[t].color : "rgba(226,232,240,0.5)",
              border: `1px solid ${selectedTrack === t ? TRACK_CONFIG[t].color + "50" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            {TRACK_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* Add course */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: "rgba(226,232,240,0.7)" }}>
          {courses?.length ?? 0} courses in {TRACK_CONFIG[selectedTrack].label}
        </p>
        <button
          onClick={() => setShowCourseForm(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
        >
          <Plus className="h-3.5 w-3.5" /> Add course
        </button>
      </div>

      {showCourseForm && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "rgba(226,232,240,0.45)" }}>Title *</label>
              <input className={inp} style={inputStyle} value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} placeholder="Intro to Python" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "rgba(226,232,240,0.45)" }}>Week number</label>
              <input type="number" className={inp} style={inputStyle} value={courseForm.week_number} onChange={e => setCourseForm(p => ({ ...p, week_number: +e.target.value }))} min={1} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: "rgba(226,232,240,0.45)" }}>Description</label>
              <button onClick={generateCourseDescription} disabled={aiLoading} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg disabled:opacity-50" style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI write
              </button>
            </div>
            <textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none" style={inputStyle} value={courseForm.description} onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} placeholder="Course description…" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCourseForm(false)} className="h-8 px-3 rounded-lg text-xs" style={{ color: "rgba(226,232,240,0.4)" }}>Cancel</button>
            <button onClick={() => addCourseMutation.mutate()} disabled={addCourseMutation.isPending || !courseForm.title} className="h-8 px-4 rounded-lg text-xs font-semibold disabled:opacity-40" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
              {addCourseMutation.isPending ? "Creating…" : "Create course"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(226,232,240,0.5)" }}><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-3">
          {(courses ?? []).map(course => {
            const lessons = lessonsMap?.[course.id] ?? [];
            const isOpen = expandedCourse === course.id;
            return (
              <div key={course.id} className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedCourse(isOpen ? null : course.id)}>
                  <BookOpen className="h-4 w-4 shrink-0" style={{ color: TRACK_CONFIG[selectedTrack].color }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>{course.title}</p>
                    <p className="text-xs" style={{ color: "rgba(226,232,240,0.4)" }}>Week {course.week_number} · {lessons.length} lessons</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); togglePublish.mutate({ table: "courses", id: course.id, value: !course.is_published }); }}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: course.is_published ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", color: course.is_published ? "#34d399" : "rgba(226,232,240,0.4)" }}
                  >
                    {course.is_published ? "Published" : "Draft"}
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteCourse.mutate(course.id); }} className="opacity-40 hover:opacity-100" style={{ color: "#f43f5e" }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {isOpen ? <ChevronUp className="h-4 w-4" style={{ color: "rgba(226,232,240,0.4)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "rgba(226,232,240,0.4)" }} />}
                </div>

                {isOpen && (
                  <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {course.description && (
                      <p className="text-xs mb-3" style={{ color: "rgba(226,232,240,0.5)" }}>{course.description}</p>
                    )}
                    {lessons.map((l: any) => (
                      <div key={l.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <span className="text-xs" style={{ color: "rgba(226,232,240,0.4)" }}>{l.order_index + 1}.</span>
                        <span className="flex-1 text-sm" style={{ color: "rgba(226,232,240,0.8)" }}>{l.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.4)" }}>{l.type}</span>
                        <span className="text-xs" style={{ color: "rgba(226,232,240,0.35)" }}>{l.duration_minutes}min</span>
                        <button
                          onClick={() => togglePublish.mutate({ table: "lessons", id: l.id, value: !l.is_published })}
                          className="text-xs"
                          style={{ color: l.is_published ? "#34d399" : "rgba(226,232,240,0.3)" }}
                        >
                          {l.is_published ? "✓" : "○"}
                        </button>
                      </div>
                    ))}

                    {showLessonForm === course.id ? (
                      <div className="mt-3 p-3 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <input className={inp} style={inputStyle} placeholder="Lesson title" value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} />
                          <select className={inp} style={inputStyle} value={lessonForm.type} onChange={e => setLessonForm(p => ({ ...p, type: e.target.value }))}>
                            <option value="video">Video</option>
                            <option value="game">Game</option>
                            <option value="quiz">Quiz</option>
                            <option value="reading">Reading</option>
                            <option value="project">Project</option>
                          </select>
                          <input className={inp} style={inputStyle} placeholder="Content URL (optional)" value={lessonForm.content_url} onChange={e => setLessonForm(p => ({ ...p, content_url: e.target.value }))} />
                          <input type="number" className={inp} style={inputStyle} placeholder="Duration (min)" value={lessonForm.duration_minutes} onChange={e => setLessonForm(p => ({ ...p, duration_minutes: +e.target.value }))} min={5} />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setShowLessonForm(null)} className="h-7 px-3 rounded-lg text-xs" style={{ color: "rgba(226,232,240,0.4)" }}>Cancel</button>
                          <button onClick={() => addLessonMutation.mutate(course.id)} disabled={addLessonMutation.isPending || !lessonForm.title} className="h-7 px-3 rounded-lg text-xs font-semibold disabled:opacity-40" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                            Add lesson
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowLessonForm(course.id)}
                        className="flex items-center gap-1.5 text-xs mt-1 px-3 py-1.5 rounded-lg"
                        style={{ color: "rgba(226,232,240,0.4)", background: "rgba(255,255,255,0.03)" }}
                      >
                        <Plus className="h-3 w-3" /> Add lesson
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {courses?.length === 0 && (
            <div className="py-10 text-center text-sm" style={{ color: "rgba(226,232,240,0.35)" }}>No courses yet for this track. Click "Add course" to start.</div>
          )}
        </div>
      )}
    </div>
  );
}
