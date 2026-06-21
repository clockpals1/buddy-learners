import { supabase } from "@/integrations/supabase/client";

export type FeatureType = "lessons" | "games" | "live_sessions" | "ai_tutor" | "curriculum";
export type AccessLevel = "full" | "limited" | "free_only" | "none";

export interface PlanAccess {
  hasAccess: boolean;
  accessLevel: AccessLevel;
  requiresUpgrade: boolean;
  planName?: string;
}

/**
 * Check if a child has access to a specific feature based on their enrollment plan
 * Admins always have full access to all features
 */
export async function checkFeatureAccess(
  childId: string,
  featureType: FeatureType
): Promise<PlanAccess> {
  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (roleData?.role === "super_admin" || roleData?.role === "instructor") {
      return { hasAccess: true, accessLevel: "full", requiresUpgrade: false };
    }
  }

  // Check if child's parent is admin
  const { data: child } = await supabase
    .from("children")
    .select("parent_id")
    .eq("id", childId)
    .maybeSingle();
  
  if (child?.parent_id) {
    const { data: parentRoleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", child.parent_id)
      .maybeSingle();
    
    if (parentRoleData?.role === "super_admin" || parentRoleData?.role === "instructor") {
      return { hasAccess: true, accessLevel: "full", requiresUpgrade: false };
    }
  }

  // Check child's active enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(`
      payment_status,
      plan_id,
      plans (
        id,
        name,
        kind,
        plan_features (
          feature_type,
          access_level
        )
      )
    `)
    .eq("child_id", childId)
    .eq("payment_status", "active")
    .maybeSingle();

  if (!enrollment || !enrollment.plans) {
    return { hasAccess: false, accessLevel: "none", requiresUpgrade: true };
  }

  const planFeature = (enrollment.plans as any).plan_features?.find(
    (f: any) => f.feature_type === featureType
  );

  if (!planFeature) {
    // Default to no access if feature not defined
    return { hasAccess: false, accessLevel: "none", requiresUpgrade: true };
  }

  const hasAccess = planFeature.access_level !== "none";
  return {
    hasAccess,
    accessLevel: planFeature.access_level,
    requiresUpgrade: !hasAccess,
    planName: enrollment.plans.name,
  };
}

/**
 * Check if a specific game is free or requires a plan
 */
export async function checkGameAccess(gameSlug: string, childId: string): Promise<PlanAccess> {
  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (roleData?.role === "super_admin" || roleData?.role === "instructor") {
      return { hasAccess: true, accessLevel: "full", requiresUpgrade: false };
    }
  }

  // Check if child's parent is admin
  const { data: child } = await supabase
    .from("children")
    .select("parent_id")
    .eq("id", childId)
    .maybeSingle();
  
  if (child?.parent_id) {
    const { data: parentRoleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", child.parent_id)
      .maybeSingle();
    
    if (parentRoleData?.role === "super_admin" || parentRoleData?.role === "instructor") {
      return { hasAccess: true, accessLevel: "full", requiresUpgrade: false };
    }
  }

  // Get game config
  const { data: gameConfig } = await (supabase as any)
    .from("game_config")
    .select("*")
    .eq("slug", gameSlug)
    .maybeSingle();

  if (!gameConfig) {
    return { hasAccess: false, accessLevel: "none", requiresUpgrade: true };
  }

  // Free games are always accessible
  if (gameConfig.is_free) {
    return { hasAccess: true, accessLevel: "full", requiresUpgrade: false };
  }

  // Check child's enrollment for plan-based access
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(`
      payment_status,
      plans (
        id,
        name,
        kind
      )
    `)
    .eq("child_id", childId)
    .eq("payment_status", "active")
    .maybeSingle();

  if (!enrollment || !enrollment.plans) {
    return { hasAccess: false, accessLevel: "none", requiresUpgrade: true };
  }

  // Check if plan meets minimum requirement
  const planHierarchy = { free: 0, family: 1, school: 2 };
  const minLevel = gameConfig.min_plan_kind ? planHierarchy[gameConfig.min_plan_kind as keyof typeof planHierarchy] || 0 : 0;
  const currentLevel = planHierarchy[(enrollment.plans as any).kind as keyof typeof planHierarchy] || 0;

  const hasAccess = currentLevel >= minLevel;
  return {
    hasAccess,
    accessLevel: hasAccess ? "full" : "none",
    requiresUpgrade: !hasAccess,
    planName: enrollment.plans.name,
  };
}

/**
 * Get child's current enrollment info
 */
export async function getChildEnrollment(childId: string) {
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(`
      *,
      plans (*)
    `)
    .eq("child_id", childId)
    .eq("payment_status", "active")
    .maybeSingle();

  return enrollment;
}
