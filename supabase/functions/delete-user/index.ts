import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    const caller = userData?.user;
    if (userErr || !caller) {
      console.error("delete-user auth failed", userErr?.message);
      throw new Error("Unauthorized: please sign in again");
    }


    const { user_id } = await req.json();
    if (!user_id) throw new Error("Missing user_id");
    if (user_id === caller.id) throw new Error("Cannot delete yourself");

    // Caller must be an admin of their own organization
    const { data: callerProfile } = await adminClient
      .from("profiles").select("org_id").eq("id", caller.id).maybeSingle();
    const orgId = callerProfile?.org_id;
    if (!orgId) throw new Error("You do not belong to an organization");

    const { data: adminRoles } = await adminClient
      .from("user_roles").select("role")
      .eq("user_id", caller.id).eq("org_id", orgId)
      .in("role", ["super_admin", "owner_director"]).limit(1);
    if (!adminRoles || adminRoles.length === 0) throw new Error("Forbidden: organization admins only");


    // Target must belong to the same organization
    const { data: targetProfile } = await adminClient
      .from("profiles").select("org_id").eq("id", user_id).maybeSingle();
    if (!targetProfile || targetProfile.org_id !== orgId) {
      throw new Error("Forbidden: user is not in your organization");
    }

    // Delete user roles, profile will cascade, then delete auth user
    await adminClient.from("user_roles").delete().eq("user_id", user_id);
    await adminClient.from("organization_members").delete().eq("user_id", user_id).eq("org_id", orgId);
    await adminClient.from("notifications").delete().eq("user_id", user_id);

    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("delete-user error:", err?.message);
    return new Response(JSON.stringify({ error: err.message }), {

      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
