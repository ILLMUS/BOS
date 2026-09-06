import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { formatDate } from "@/lib/crm";
import { FEEDBACK_TYPES, label, loadClientAccounts, loadJobsLite, type Feedback } from "@/lib/clientSuccess";
import { Loader2, Plus, Star } from "lucide-react";

export default function ClientFeedback() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Feedback[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [jobs, setJobs] = useState<{ id: string; job_number: string; client_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ account_id: "", job_id: "", feedback_type: "survey", rating: "5", comment: "" });

  const reload = async () => {
    const { data } = await supabase.from("client_feedback").select("*").order("received_at", { ascending: false });
    setRows(data || []);
  };

  useEffect(() => {
    (async () => {
      const [a, j] = await Promise.all([loadClientAccounts(), loadJobsLite()]);
      setAccounts(a);
      setJobs(j);
      await reload();
      setLoading(false);
    })();
  }, [orgId]);

  const stats = useMemo(() => {
    const rated = rows.filter((r) => r.rating);
    const avg = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0;
    const promoters = rated.filter((r) => (r.rating || 0) >= 4).length;
    return {
      avg: avg ? avg.toFixed(1) : "—",
      count: rows.length,
      promoters,
      complaints: rows.filter((r) => r.feedback_type === "complaint").length,
    };
  }, [rows]);

  const create = async () => {
    if (!orgId) return;
    setBusy(true);
    const { error } = await supabase.from("client_feedback").insert({
      org_id: orgId,
      account_id: form.account_id || null,
      job_id: form.job_id || null,
      feedback_type: form.feedback_type,
      rating: Number(form.rating),
      comment: form.comment || null,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Feedback captured");
    setOpen(false);
    setForm({ account_id: "", job_id: "", feedback_type: "survey", rating: "5", comment: "" });
    reload();
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Client Feedback</h1>
          <p className="text-sm text-muted-foreground">Survey scores, reviews, complaints and compliments.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Capture feedback</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Capture feedback</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Client account" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.job_id} onValueChange={(v) => setForm({ ...form, job_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Related job" /></SelectTrigger>
                  <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.job_number} · {j.client_name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.feedback_type} onValueChange={(v) => setForm({ ...form, feedback_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FEEDBACK_TYPES.map((t) => <SelectItem key={t} value={t}>{label(t)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.rating} onValueChange={(v) => setForm({ ...form, rating: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea placeholder="What did the client say?" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              <Button className="w-full" onClick={create} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Average rating", value: stats.avg },
          { label: "Responses", value: stats.count },
          { label: "Promoters (4-5)", value: stats.promoters },
          { label: "Complaints", value: stats.complaints },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Recent feedback</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback captured yet.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{accountName(r.account_id) || "Unlinked client"}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.feedback_type === "complaint" ? "destructive" : "outline"}>{label(r.feedback_type)}</Badge>
                    <span className="flex items-center gap-1 text-sm">
                      {Array.from({ length: r.rating || 0 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current text-primary" />
                      ))}
                    </span>
                  </div>
                </div>
                {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.received_at)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
