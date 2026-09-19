import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Chrome, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Status {
  connected: boolean;
  emailAddress?: string;
}

/** Google Workspace (company account) — Gmail sending via the connector gateway. */
export default function GoogleWorkspaceCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ to: "", subject: "", body: "" });

  const check = useCallback(async () => {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("google-workspace", {
      body: { action: "status" },
    });
    setStatus(error || !data?.connected ? { connected: false } : data);
    setChecking(false);
  }, []);

  useEffect(() => { void check(); }, [check]);

  const send = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("google-workspace", {
      body: { action: "send", ...form },
    });
    setSending(false);
    if (error || data?.error) {
      toast({ title: "Could not send", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Email sent", description: `Delivered to ${form.to} from your company account.` });
    setOpen(false);
    setForm({ to: "", subject: "", body: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Google Workspace</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your company Google account, connected once for the whole workspace. Emails are sent from
          that mailbox — clients see your business address, not a system sender.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-accent/10 p-2">
              <Chrome className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Gmail</p>
                <Badge variant={status?.connected ? "default" : "outline"}>
                  {checking ? "Checking…" : status?.connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {status?.connected
                  ? `Sending as ${status.emailAddress}`
                  : "Connect your company Google account to send mail from the app."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void check()} disabled={checking}>
              {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
            </Button>
            <Button size="sm" onClick={() => setOpen(true)} disabled={!status?.connected}>
              <Send className="mr-1 h-3 w-3" /> Send email
            </Button>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Drive and Calendar are not linked yet — connect them from workspace connector settings when
          you want job documents and site visits synced.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send email</DialogTitle>
            <DialogDescription>
              Sent from {status?.emailAddress ?? "your company Gmail account"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="gw-to">To</Label>
              <Input id="gw-to" type="email" placeholder="client@example.com"
                value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gw-subject">Subject</Label>
              <Input id="gw-subject" placeholder="Quote QT-1042 for your review"
                value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gw-body">Message</Label>
              <Textarea id="gw-body" rows={6}
                value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void send()} disabled={sending || !form.to || !form.subject}>
              {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
