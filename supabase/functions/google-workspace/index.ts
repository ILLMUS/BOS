import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function encodeEmail(to: string, subject: string, body: string, cc?: string) {
  const lines = [
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");
  const bytes = new TextEncoder().encode(lines);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      return json({ error: "Google Workspace is not connected for this project." }, 400);
    }

    // Require a signed-in app user.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Not authenticated" }, 401);

    const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(payload.action ?? "status");

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      "Content-Type": "application/json",
    };

    if (action === "status") {
      const res = await fetch(`${GATEWAY_URL}/users/me/profile`, { headers });
      const text = await res.text();
      if (!res.ok) {
        console.error(`Gmail profile failed [${res.status}]: ${text}`);
        return json({ error: "Google request failed", status: res.status, details: text }, res.status);
      }
      const profile = JSON.parse(text);
      return json({ connected: true, emailAddress: profile.emailAddress, messagesTotal: profile.messagesTotal });
    }

    if (action === "send") {
      const to = String(payload.to ?? "").trim();
      const subject = String(payload.subject ?? "").trim();
      const body = String(payload.body ?? "");
      const cc = payload.cc ? String(payload.cc).trim() : undefined;
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "A valid recipient email is required" }, 400);
      if (!subject) return json({ error: "Subject is required" }, 400);
      if (subject.length > 300 || body.length > 20000) return json({ error: "Message is too long" }, 400);

      const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({ raw: encodeEmail(to, subject, body, cc) }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`Gmail send failed [${res.status}]: ${text}`);
        return json({ error: "Google request failed", status: res.status, details: text }, res.status);
      }
      return json({ sent: true, id: JSON.parse(text).id });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("google-workspace error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
