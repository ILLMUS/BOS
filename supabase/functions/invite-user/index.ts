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

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const caller = userData?.user;
    if (userErr || !caller) {
      console.error("invite-user auth failed", userErr?.message);
      throw new Error("Unauthorized: please sign in again");
    }


    // Caller's active organization
    const { data: callerProfile } = await admin
      .from("profiles").select("org_id").eq("id", caller.id).maybeSingle();
    const orgId = callerProfile?.org_id;
    if (!orgId) throw new Error("You do not belong to an organization");

    const { data: adminRoles } = await admin
      .from("user_roles").select("role")
      .eq("user_id", caller.id).eq("org_id", orgId)
      .in("role", ["super_admin", "owner_director"]).limit(1);
    if (!adminRoles || adminRoles.length === 0) throw new Error("Forbidden: organization admins only");

    const { email, password, full_name, role, org_role_id, redirect_to } = await req.json();
    if (!email) throw new Error("Email is required");

    // Invited members can never be granted the highest access level from this screen.
    const requestedRole = role && role !== "super_admin" ? role : null;

    let newUserId: string | null = null;
    let mode: "created" | "invited" | "linked" = "created";
    let generatedPassword: string | null = null;

    // Is there already an account with this email?
    const { data: existingProfile } = await admin
      .from("profiles").select("id, org_id").ilike("email", email).maybeSingle();

    const makePassword = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      return Array.from(bytes, (b) => chars[b % chars.length]).join("");
    };

    if (existingProfile) {
      newUserId = existingProfile.id;
      mode = "linked";
    } else {
      const finalPassword = password || makePassword();
      generatedPassword = password ? null : finalPassword;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });
      if (createErr) throw createErr;
      newUserId = created.user!.id;
      mode = password ? "created" : "invited";
    }


    // Only set the primary org when the user doesn't have one yet (multi-org members keep theirs)
    const keepsOtherOrg = !!(existingProfile?.org_id && existingProfile.org_id !== orgId);
    // Invited users have no profile row yet (the row is created on first sign-in), so upsert.
    await admin.from("profiles").upsert(
      {
        id: newUserId,
        email,
        full_name: full_name || email,
        ...(keepsOtherOrg ? {} : { org_id: orgId }),
      },
      { onConflict: "id" },
    );

    await admin.from("organization_members")
      .upsert({ org_id: orgId, user_id: newUserId }, { onConflict: "org_id,user_id" });

    if (requestedRole) {
      await admin.from("user_roles")
        .upsert({ user_id: newUserId, org_id: orgId, role: requestedRole }, { onConflict: "user_id,org_id,role" });
    }

    if (org_role_id) {
      // Ensure the role belongs to the caller's organization
      const { data: orgRole } = await admin
        .from("org_roles").select("id").eq("id", org_role_id).eq("org_id", orgId).maybeSingle();
      if (!orgRole) throw new Error("Invalid role for this organization");

      const { data: already } = await admin.from("user_org_roles")
        .select("id").eq("user_id", newUserId).eq("org_role_id", org_role_id).maybeSingle();
      if (!already) {
        await admin.from("user_org_roles")
          .insert({ user_id: newUserId, org_id: orgId, org_role_id });
      }
    }

    // Shareable sign-in link the admin can send directly (email delivery can fail/land in spam)
    let inviteLink: string | null = null;
    try {
      const { data: link } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: redirect_to || undefined },
      } as any);
      inviteLink = (link as any)?.properties?.action_link ?? null;
    } catch (_e) {
      inviteLink = null;
    }

    // Organisation name for the email copy
    const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).maybeSingle();
    const loginUrl = (redirect_to || "").replace(/\/dashboard.*$/, "/login") || null;

    // Best-effort welcome email with the credentials. Requires email sending to be set up.
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const { error: mailErr } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "team-invite",
          recipientEmail: email,
          idempotencyKey: `team-invite-${newUserId}-${Date.now()}`,
          templateData: {
            fullName: full_name || email,
            orgName: org?.name || "your team",
            email,
            password: generatedPassword || password || null,
            loginUrl,
            magicLink: inviteLink,
          },
        },
      });
      if (mailErr) throw mailErr;
      emailSent = true;
    } catch (e: any) {
      emailError = e?.message ?? "Email sending is not set up yet";
    }

    // Track invite state so admins can see it on the users list
    await admin.from("profiles").update({
      invited_at: new Date().toISOString(),
      invite_email_status: emailSent ? "sent" : (inviteLink ? "link_only" : "failed"),
      ...(emailSent ? { invite_email_sent_at: new Date().toISOString() } : {}),
    }).eq("id", newUserId);


    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        mode,
        invite_link: inviteLink,
        temp_password: generatedPassword,
        email_sent: emailSent,
        email_error: emailError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    console.error("invite-user error:", err?.message);
    return new Response(JSON.stringify({ error: err.message }), {

      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});