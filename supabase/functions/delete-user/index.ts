import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Check if user is super_admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    if (roleData?.role !== "super_admin") {
      return json({ error: "Forbidden: Only super_admin can delete users" }, 403);
    }

    const { userId } = await req.json();
    if (!userId) return json({ error: "userId required" }, 400);

    // Delete user's children
    await supabase.from("children").delete().eq("parent_id", userId);
    
    // Delete user's enrollments
    await supabase.from("enrollments").delete().eq("parent_id", userId);
    
    // Delete user's roles
    await supabase.from("user_roles").delete().eq("user_id", userId);
    
    // Delete user's profile
    await supabase.from("profiles").delete().eq("id", userId);
    
    // Delete user's consent records
    await supabase.from("consent_records").delete().eq("parent_id", userId);
    
    // Delete auth user
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) return json({ error: deleteErr.message }, 500);

    return json({ success: true });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
