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
import { Chrome, Loader2, Send, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <Chrome className="h-4 w-4" />
          </motion.div>
          <span className="truncate">Google Workspace</span>
        </CardTitle>
        <p className="break-words text-xs text-slate-400 mt-1">
          Your company Google account, connected once for the whole workspace. Emails are sent from
          that mailbox — clients see your business address, not a system sender.
        </p>
      </CardHeader>
      <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg border border-teal-400/20 bg-teal-500/10 p-2 shrink-0">
              <Mail className="h-4 w-4 text-teal-400" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <p className="font-semibold text-white truncate text-xs sm:text-sm">Gmail</p>
                <Badge
                  variant="outline"
                  className={status?.connected ? "border-teal-500/30 bg-teal-500/10 text-teal-400" : "border-slate-700 bg-slate-800 text-slate-400"}
                >
                  {checking ? "Checking…" : status?.connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
              <p className="break-words text-xs text-slate-400">
                {status?.connected
                  ? `Sending as ${status.emailAddress}`
                  : "Connect your company Google account to send mail from the app."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void check()}
              disabled={checking}
              className="h-8 border-white/10 bg-[#030d12] text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
            >
              {checking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3 w-3 text-slate-400" /> Refresh
                </>
              )}
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                onClick={() => setOpen(true)}
                disabled={!status?.connected}
                className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40 disabled:hover:bg-teal-500"
              >
                <Send className="mr-1.5 h-3 w-3" /> Send email
              </Button>
            </motion.div>
          </div>
        </div>

        <p className="break-words text-[11px] text-slate-400">
          Drive and Calendar are not linked yet — connect them from workspace connector settings when
          you want job documents and site visits synced.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#05131a] text-white shadow-2xl backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Send email</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Sent from <span className="font-medium text-teal-400">{status?.emailAddress ?? "your company Gmail account"}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="gw-to" className="text-xs font-medium text-slate-300">To</Label>
              <Input
                id="gw-to"
                type="email"
                placeholder="client@example.com"
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                className="h-9 border-white/10 bg-[#02080b] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gw-subject" className="text-xs font-medium text-slate-300">Subject</Label>
              <Input
                id="gw-subject"
                placeholder="Quote QT-1042 for your review"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="h-9 border-white/10 bg-[#02080b] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gw-body" className="text-xs font-medium text-slate-300">Message</Label>
              <Textarea
                id="gw-body"
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="border-white/10 bg-[#02080b] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-8 border-white/10 bg-transparent text-xs text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void send()}
              disabled={sending || !form.to || !form.subject}
              className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
            >
              {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}