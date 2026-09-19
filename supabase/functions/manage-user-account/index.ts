import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTemplateEmailLogged } from "../_shared/transactional-email-templates/send-and-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOREVER = "876000h"; // ~100 years

function makePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const caller = userData?.user;
    if (userErr || !caller) throw new Error("Unauthorized: please sign in again");

    const { data: callerProfile } = await admin.from("profiles").select("org_id").eq("id", caller.id).maybeSingle();
    const orgId = callerProfile?.org_id;
    if (!orgId) throw new Error("You do not belong to an organization");

    const { data: adminRoles } = await admin
      .from("user_roles").select("role")
      .eq("user_id", caller.id).eq("org_id", orgId)
      .in("role", ["super_admin", "owner_director"]).limit(1);
    if (!adminRoles || adminRoles.length === 0) throw new Error("Forbidden: organization admins only");

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    if (!action) throw new Error("Missing action");

    // Members of this organization — the only accounts this endpoint may touch.
    const { data: orgProfiles } = await admin.from("profiles").select("id, email, full_name").eq("org_id", orgId);
    const memberIds = new Set((orgProfiles || []).map((p) => p.id));

    if (action === "list") {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const statuses = (list?.users || [])
        .filter((u) => memberIds.has(u.id))
        .map((u) => ({
          id: u.id,
          suspended: !!(u as { banned_until?: string }).banned_until &&
            new Date((u as { banned_until?: string }).banned_until!).getTime() > Date.now(),
          last_sign_in_at: u.last_sign_in_at ?? null,
        }));
      return new Response(JSON.stringify({ success: true, statuses }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = body?.user_id as string;
    if (!userId) throw new Error("Missing user_id");
    if (!memberIds.has(userId)) throw new Error("Forbidden: user is not in your organization");
    if (userId === caller.id && action !== "reset_password") throw new Error("You cannot change your own access here");

    const target = (orgProfiles || []).find((p) => p.id === userId)!;

    if (action === "deactivate" || action === "reactivate") {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: action === "deactivate" ? FOREVER : "none",
      } as never);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, suspended: action === "deactivate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const password = makePassword();
      const { error } = await admin.auth.admin.updateUserById(userId, { password } as never);
      if (error) throw error;

      const redirectTo = (body?.redirect_to as string) || "";
      const loginUrl = redirectTo.replace(/\/dashboard.*$/, "/login") || null;
      const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).maybeSingle();

      let emailSent = false;
      try {
        const result = await sendTemplateEmailLogged("team-invite", target.email, {
          idempotencyKey: `password-reset-${userId}-${Date.now()}`,
          templateData: {
            fullName: target.full_name || target.email,
            orgName: org?.name || "your team",
            email: target.email,
            password,
            loginUrl,
            magicLink: null,
          },
        });
        emailSent = result.sent;
      } catch (_e) {
        emailSent = false;
      }

      return new Response(JSON.stringify({ success: true, temp_password: password, email_sent: emailSent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    console.error("manage-user-account error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
