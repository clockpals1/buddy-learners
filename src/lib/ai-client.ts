import { supabase } from "@/integrations/supabase/client";

export type Track = "spark_cubs" | "code_rangers" | "cyber_pioneers";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIGenerateOptions {
  messages: AIMessage[];
  childId?: string;
  track?: Track | null;
  isGraded?: boolean;
}

export interface AIGenerateResult {
  content: string;
  model: string;
  error?: string;
}

/**
 * Call the AI teaching assistant via the Supabase Edge Function.
 * The edge function resolves the Groq API key from env vars or integration_settings.
 * No API key is ever hardcoded here.
 */
export async function generateAIResponse(opts: AIGenerateOptions): Promise<AIGenerateResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { content: "", model: "", error: "Not authenticated" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("ai-generate", {
      body: opts,
    });

    if (error) return { content: "", model: "", error: error.message };
    if (data?.error) return { content: "", model: "", error: data.error };

    return {
      content: data.content ?? "",
      model: data.model ?? "unknown",
    };
  } catch (err) {
    return { content: "", model: "", error: err instanceof Error ? err.message : "Request failed" };
  }
}

/**
 * Generate AI content for admin tools (lesson plans, emails, etc.)
 * Uses a different system prompt suitable for instructors.
 */
export async function generateAdminAI(prompt: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return "Not authenticated";

  try {
    const { data, error } = await supabase.functions.invoke("ai-generate", {
      body: {
        messages: [{ role: "user", content: prompt }],
        track: null,
        isGraded: false,
      },
    });

    if (error || data?.error) return `Error: ${error?.message ?? data?.error}`;
    return data.content ?? "";
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "Request failed"}`;
  }
}

/**
 * Initiate a Stripe or PayPal checkout via the Supabase Edge Function.
 * The edge function resolves payment keys from env vars / integration_settings.
 */
export async function initiateCheckout(opts: {
  planId: string;
  childId: string;
  provider: "stripe" | "paypal";
  promoCode?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: opts,
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data as {
    url: string;
    publishableKey?: string;
    clientId?: string;
    orderId?: string;
    discountPct: number;
  };
}
