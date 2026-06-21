import { useState, useCallback } from "react";
import { generateAIResponse, generateAdminAI, type AIMessage, type Track } from "@/lib/ai-client";

interface UseAIOptions {
  childId?: string;
  track?: Track | null;
  isGraded?: boolean;
}

interface UseAIState {
  messages: AIMessage[];
  loading: boolean;
  error: string | null;
  lastModel: string | null;
}

/**
 * useAI — composable hook for the AI teaching assistant.
 * Manages conversation state, sends messages via the Supabase Edge Function,
 * and exposes helpers to reset or set initial context.
 */
export function useAI(opts: UseAIOptions = {}) {
  const [state, setState] = useState<UseAIState>({
    messages: [],
    loading: false,
    error: null,
    lastModel: null,
  });

  const send = useCallback(async (userContent: string) => {
    if (!userContent.trim()) return;

    const userMsg: AIMessage = { role: "user", content: userContent.trim() };
    const next = [...state.messages, userMsg];

    setState(prev => ({ ...prev, messages: next, loading: true, error: null }));

    const result = await generateAIResponse({
      messages: next,
      childId: opts.childId,
      track: opts.track,
      isGraded: opts.isGraded,
    });

    if (result.error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: result.error ?? "Unknown error",
        messages: [...prev.messages.slice(0, -1)],
      }));
    } else {
      const assistantMsg: AIMessage = { role: "assistant", content: result.content };
      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        messages: [...prev.messages, assistantMsg],
        lastModel: result.model,
      }));
    }
  }, [state.messages, opts.childId, opts.track, opts.isGraded]);

  const reset = useCallback(() => {
    setState({ messages: [], loading: false, error: null, lastModel: null });
  }, []);

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    lastModel: state.lastModel,
    send,
    reset,
  };
}

/**
 * useAdminAI — simplified hook for single-turn admin AI tasks
 * (lesson plan generation, email drafting, weekly summaries, etc.)
 */
export function useAdminAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string): Promise<string> => {
    setLoading(true);
    setError(null);
    const result = await generateAdminAI(prompt);
    if (result.startsWith("Error:")) {
      setError(result);
      setLoading(false);
      return "";
    }
    setLoading(false);
    return result;
  }, []);

  return { generate, loading, error };
}
