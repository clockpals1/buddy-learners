import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function systemPromptForTrack(track: string | null, isGraded: boolean): string {
  const guardedPrefix = isGraded
    ? "IMPORTANT: This message relates to a graded assignment. Give HINTS and guiding questions ONLY — never reveal the full answer. Socratic method only. "
    : "";

  if (track === "spark_cubs") {
    return `${guardedPrefix}You are Sparky, a friendly AI tutor for children aged 6–9 learning to code. Use very simple words, short sentences, lots of encouragement, and fun analogies (pizza, animals, toys, superheroes). Never use jargon. Celebrate every small win. Keep responses under 3 sentences.`;
  }
  if (track === "code_rangers") {
    return `${guardedPrefix}You are Ranger, an AI coding coach for kids aged 10–12. Be friendly, slightly technical, and game-like in tone. Python and basic networking are fair game. Use analogies and keep explanations concise. Encourage curiosity and problem-solving.`;
  }
  if (track === "cyber_pioneers") {
    return `${guardedPrefix}You are Pioneer, an AI mentor for teens aged 13–15 learning Python, JavaScript, AI APIs, networking, and ethical hacking. Be direct, technical, and encouraging. Treat them as capable young engineers. Reference real-world applications. Never assist with anything outside sandboxed educational contexts.`;
  }
  return `${guardedPrefix}You are a helpful AI teaching assistant for Leafva Academy, a coding and cybersecurity camp for kids 6–15. Be encouraging, age-appropriate, and educational.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const { messages, childId, track, isGraded } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Rate limiting: max 20 AI calls per child per hour
    if (childId) {
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
      const { count } = await supabase
        .from("ai_request_log")
        .select("*", { count: "exact", head: true })
        .eq("child_id", childId)
        .gte("created_at", oneHourAgo);
      if ((count ?? 0) >= 20) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in an hour." }), { status: 429, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // Resolve Groq API key: env var first (set in Supabase dashboard), then integration_settings
    let groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      const { data: setting } = await supabase
        .from("integration_settings")
        .select("value")
        .eq("key", "GROQ_API_KEY")
        .maybeSingle();
      groqKey = setting?.value ?? null;
    }
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "AI service not configured. A super-admin must add GROQ_API_KEY in Admin → Settings → Integrations." }), { status: 503, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Resolve model: integration_settings override, default to llama-3.3-70b-versatile
    let model = "llama-3.3-70b-versatile";
    const { data: modelSetting } = await supabase
      .from("integration_settings")
      .select("value")
      .eq("key", "GROQ_MODEL")
      .maybeSingle();
    if (modelSetting?.value) model = modelSetting.value;

    const systemContent = systemPromptForTrack(track ?? null, isGraded ?? false);

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemContent }, ...messages],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return new Response(JSON.stringify({ error: `Groq error: ${errText}` }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const groqData = await groqRes.json();
    const replyText: string = groqData.choices?.[0]?.message?.content ?? "";

    // Basic content moderation (block anything that looks like credential phishing)
    const sensitivePatterns = [/your\s+password\s+is/i, /enter\s+your\s+ssn/i, /credit\s+card\s+number/i];
    const flagged = sensitivePatterns.some((re) => re.test(replyText));

    // Log the request (non-blocking — fire and forget)
    supabase.from("ai_request_log").insert({
      child_id: childId ?? null,
      user_id: user.id,
      model,
      tokens_used: groqData.usage?.total_tokens ?? null,
      flagged,
    }).then(() => {});

    if (flagged) {
      return new Response(JSON.stringify({ error: "Response flagged by content moderation. Please try a different question." }), { status: 422, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ content: replyText, model, usage: groqData.usage }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
