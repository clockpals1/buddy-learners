import { supabase } from "@/integrations/supabase/client";

/**
 * Award a badge to a child — writes to child_badges table (syncs to Badges tab).
 * Safe to call multiple times — UNIQUE constraint prevents duplicates.
 */
export async function awardBadge(childId: string, badgeSlug: string): Promise<void> {
  if (!childId || !badgeSlug) return;
  await (supabase as any)
    .from("child_badges")
    .upsert({ child_id: childId, badge_slug: badgeSlug }, { onConflict: "child_id,badge_slug" });
}

/**
 * Award multiple badges at once.
 */
export async function awardBadges(childId: string, slugs: string[]): Promise<void> {
  if (!childId || slugs.length === 0) return;
  const rows = slugs.map(badge_slug => ({ child_id: childId, badge_slug }));
  await (supabase as any)
    .from("child_badges")
    .upsert(rows, { onConflict: "child_id,badge_slug" });
}

/**
 * Fetch all badge slugs a child has already earned (for local state init).
 */
export async function getEarnedBadges(childId: string): Promise<string[]> {
  if (!childId) return [];
  const { data } = await (supabase as any)
    .from("child_badges")
    .select("badge_slug")
    .eq("child_id", childId);
  return (data ?? []).map((b: any) => b.badge_slug as string);
}

/**
 * Award a "game_master" badge when a child has played N distinct games.
 * Call this after saving game progress.
 */
export async function checkGameMasterBadge(childId: string): Promise<void> {
  if (!childId) return;
  const { data } = await (supabase as any)
    .from("game_progress")
    .select("game_slug")
    .eq("child_id", childId);
  const distinctGames = new Set((data ?? []).map((r: any) => r.game_slug as string));
  if (distinctGames.size >= 3) {
    await awardBadge(childId, "game_master");
  }
}
