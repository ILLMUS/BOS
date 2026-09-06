import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return setState("invalid");
        if (data?.used_at || data?.alreadyUnsubscribed) return setState("already");
        setState("valid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    setState(error ? "error" : "done");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>Manage the emails you receive from us.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
            </p>
          )}
          {state === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Click below to stop receiving emails at this address.
              </p>
              <Button onClick={confirm} disabled={busy} className="w-full">
                {busy ? "Processing…" : "Confirm unsubscribe"}
              </Button>
            </>
          )}
          {state === "already" && (
            <p className="text-sm text-muted-foreground">You are already unsubscribed.</p>
          )}
          {state === "done" && (
            <p className="text-sm text-muted-foreground">
              You've been unsubscribed. You may still receive essential account emails.
            </p>
          )}
          {state === "invalid" && (
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or expired.</p>
          )}
          {state === "error" && (
            <p className="text-sm text-destructive">Something went wrong. Please try again later.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
