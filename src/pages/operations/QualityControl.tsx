import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { formatMoney, formatDate } from "@/lib/crm";
import { DEFAULT_QC_TEMPLATE, loadQcTemplate, saveQcTemplate, slugKey, type QcTemplateItem } from "@/lib/qc";
import { Loader2, Plus, Printer, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Job = Tables<"jobs">;
type QcItem = Tables<"job_qc_items">;

export default function OperationsQC() {
  const { orgId, user, hasRole } = useAuth();
  const isAdmin = hasRole("super_admin") || hasRole("owner_director");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [template, setTemplate] = useState<QcTemplateItem[]>(DEFAULT_QC_TEMPLATE);
  const [items, setItems] = useState<QcItem[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: j }, tpl] = await Promise.all([
        supabase.from("jobs").select("*").neq("status", "cancelled").order("created_at", { ascending: false }),
        orgId ? loadQcTemplate(orgId) : Promise.resolve(DEFAULT_QC_TEMPLATE),
      ]);
      setJobs(j || []);
      setTemplate(tpl);
      if (j?.length) setJobId(j[0].id);
      setLoading(false);
    })();
  }, [orgId]);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      const [q, s, d] = await Promise.all([
        supabase.from("job_qc_items").select("*").eq("job_id", jobId).order("position"),
        supabase.from("job_stages").select("*").eq("job_id", jobId).order("position"),
        supabase.from("finance_documents").select("*").eq("job_id", jobId).order("issued_at"),
      ]);
      setItems(q.data || []);
      setStages(s.data || []);
      setDocs(d.data || []);
    })();
  }, [jobId]);

  const job = jobs.find((j) => j.id === jobId) || null;
  const checked = items.filter((i) => i.is_checked).length;
  const pct = items.length ? Math.round((checked / items.length) * 100) : 0;
  const stageDone = stages.filter((s) => s.status === "approved").length;

  const applyTemplate = async () => {
    if (!jobId || !orgId) return;
    setBusy(true);
    const existing = new Set(items.map((i) => i.item_key));
    const rows = template
      .filter((t) => !existing.has(t.key))
      .map((t, idx) => ({
        org_id: orgId,
        job_id: jobId,
        item_key: t.key,
        label: t.label,
        position: items.length + idx,
      }));
    if (!rows.length) {
      setBusy(false);
      toast.info("Checklist already applied to this job");
      return;
    }
    const { data, error } = await supabase.from("job_qc_items").insert(rows).select();
    setBusy(false);
    if (error) return toast.error(error.message);
    setItems((prev) => [...prev, ...(data || [])]);
    toast.success("Checklist applied");
  };

  const toggle = async (item: QcItem, value: boolean) => {
    const patch = {
      is_checked: value,
      checked_by: value ? user?.id ?? null : null,
      checked_at: value ? new Date().toISOString() : null,
    };
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    const { error } = await supabase.from("job_qc_items").update(patch).eq("id", item.id);
    if (error) toast.error("Could not save that check");
  };

  const saveNote = async (item: QcItem, notes: string) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, notes } : i)));
    await supabase.from("job_qc_items").update({ notes }).eq("id", item.id);
  };

  const removeItem = async (item: QcItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await supabase.from("job_qc_items").delete().eq("id", item.id);
  };

  const addTemplateItem = async () => {
    if (!newLabel.trim() || !orgId) return;
    const next = [...template, { key: slugKey(newLabel), label: newLabel.trim() }];
    setTemplate(next);
    setNewLabel("");
    try {
      await saveQcTemplate(orgId, next);
      toast.success("Checklist template updated");
    } catch {
      toast.error("Only admins can edit the template");
    }
  };

  const removeTemplateItem = async (key: string) => {
    if (!orgId) return;
    const next = template.filter((t) => t.key !== key);
    setTemplate(next);
    try {
      await saveQcTemplate(orgId, next);
    } catch {
      toast.error("Only admins can edit the template");
    }
  };

  const totals = useMemo(() => {
    const sum = (type: string) =>
      docs.filter((d) => d.doc_type === type).reduce((s, d) => s + Number(d.amount || 0), 0);
    return { quoted: sum("quote"), invoiced: sum("invoice"), received: sum("receipt") };
  }, [docs]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <BackButton />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">QC checklists & handover packs</h1>
          <p className="text-sm text-muted-foreground">
            Sign off quality before closing a job, then print the handover pack for the client.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.job_number} · {j.client_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!job && <p className="text-sm text-muted-foreground">No jobs yet — create one to run QC.</p>}

      {job && (
        <Tabs defaultValue="checklist">
          <TabsList className="print:hidden">
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="handover">Handover pack</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="font-heading text-lg">
                  {job.job_number} · {job.client_name}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={applyTemplate} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Apply template
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {checked} of {items.length} checks passed
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No checks yet — apply the template to start the QC pass.
                  </p>
                )}
                {items.map((item) => (
                  <div key={item.id} className="rounded border p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={(v) => toggle(item, Boolean(v))}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        {item.checked_at && (
                          <p className="text-xs text-muted-foreground">Passed {formatDate(item.checked_at)}</p>
                        )}
                        <Textarea
                          className="mt-2 text-xs"
                          rows={2}
                          placeholder="Inspection note (optional)"
                          defaultValue={item.notes || ""}
                          onBlur={(e) => saveNote(item, e.target.value)}
                        />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(item)} aria-label="Remove check">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="handover" className="space-y-4 pt-4">
            <div className="flex justify-end print:hidden">
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print handover pack
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">Handover pack — {job.job_number}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                <section className="grid gap-2 sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Client: </span>{job.client_name}</p>
                  <p><span className="text-muted-foreground">Service: </span>{job.service_type || "—"}</p>
                  <p><span className="text-muted-foreground">Location: </span>{job.client_location || "—"}</p>
                  <p><span className="text-muted-foreground">Started: </span>{formatDate(job.created_at)}</p>
                </section>

                <section>
                  <h3 className="mb-2 font-semibold">Workflow completion ({stageDone}/{stages.length})</h3>
                  <ul className="space-y-1">
                    {stages.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <span>{s.stage_name || s.stage}</span>
                        <Badge variant={s.status === "approved" ? "default" : "outline"} className="capitalize">
                          {String(s.status).replace("_", " ")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-2 font-semibold">Quality checks ({checked}/{items.length})</h3>
                  <ul className="space-y-1">
                    {items.map((i) => (
                      <li key={i.id} className="rounded border px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span>{i.label}</span>
                          <Badge variant={i.is_checked ? "default" : "destructive"}>
                            {i.is_checked ? "Pass" : "Outstanding"}
                          </Badge>
                        </div>
                        {i.notes && <p className="mt-1 text-xs text-muted-foreground">{i.notes}</p>}
                      </li>
                    ))}
                    {items.length === 0 && <li className="text-muted-foreground">No QC checks recorded.</li>}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-2 font-semibold">Commercial summary</h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <p><span className="text-muted-foreground">Quoted: </span>{formatMoney(totals.quoted)}</p>
                    <p><span className="text-muted-foreground">Invoiced: </span>{formatMoney(totals.invoiced)}</p>
                    <p><span className="text-muted-foreground">Received: </span>{formatMoney(totals.received)}</p>
                  </div>
                </section>

                <section className="grid gap-8 pt-6 sm:grid-cols-2">
                  <div className="border-t pt-2 text-xs text-muted-foreground">Client signature / date</div>
                  <div className="border-t pt-2 text-xs text-muted-foreground">Company representative / date</div>
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">Company QC template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.map((t) => (
                  <div key={t.key} className="flex items-center justify-between rounded border p-3 text-sm">
                    <span>{t.label}</span>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => removeTemplateItem(t.key)} aria-label="Remove">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {isAdmin ? (
                  <div className="flex gap-2">
                    <Input
                      value={newLabel}
                      placeholder="Add a check, e.g. Torque test recorded"
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                    <Button onClick={addTemplateItem} disabled={!newLabel.trim()}>
                      Add
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Admins can edit this template.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
