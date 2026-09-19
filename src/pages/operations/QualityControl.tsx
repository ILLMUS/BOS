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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/layout/BackButton";
import { toast } from "sonner";
import { formatMoney, formatDate, formatDateTime } from "@/lib/crm";
import {
  DEFAULT_QC_TEMPLATE,
  loadQcTemplate,
  saveQcTemplate,
  slugKey,
  type QcTemplateItem,
} from "@/lib/qc";
import {
  Loader2,
  Plus,
  Printer,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Sliders,
  DollarSign,
  AlertCircle,
} from "lucide-react";
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
        supabase
          .from("jobs")
          .select("*")
          .neq("status", "cancelled")
          .order("created_at", { ascending: false }),
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
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0c1017]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Quality Control Data...
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* BACKGROUND AMBIENT GLOWS (Hidden on print) */}
      <div className="pointer-events-none absolute -left-20 -top-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px] print:hidden" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-indigo-500/10 blur-[140px] print:hidden" />

      <div className="print:hidden">
        <BackButton />
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5 print:border-slate-300 print:pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-black tracking-tight text-white print:text-black">
              QC checklists & handover packs
            </h1>
            <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] uppercase font-mono tracking-widest print:hidden">
              Quality Assurance
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400 print:text-slate-600">
            Sign off quality before closing a job, then print the handover pack for the client.
          </p>
        </div>

        <div className="flex gap-2 print:hidden">
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="w-[260px] border-white/10 bg-[#0c1017] text-xs text-slate-200">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0c1017] text-slate-200">
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id} className="text-xs">
                  {j.job_number} · {j.client_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!job && (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-xs text-slate-400">
          No jobs yet — create one to run QC.
        </div>
      )}

      {job && (
        <Tabs defaultValue="checklist" className="w-full">
          <TabsList className="border border-white/[0.08] bg-[#0c1017]/80 p-1 backdrop-blur-md print:hidden">
            <TabsTrigger
              value="checklist"
              className="text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Checklist
            </TabsTrigger>
            <TabsTrigger
              value="handover"
              className="text-xs data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Handover pack
            </TabsTrigger>
            <TabsTrigger
              value="template"
              className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-slate-200"
            >
              <Sliders className="mr-1.5 h-3.5 w-3.5" />
              Template
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CHECKLIST */}
          <TabsContent value="checklist" className="space-y-4 pt-4">
            <Card className="border-white/[0.08] bg-[#0c1017]/80 shadow-xl backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-white/[0.04] p-4">
                <CardTitle className="font-heading text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{job.job_number}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-cyan-400">{job.client_name}</span>
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={applyTemplate}
                  disabled={busy}
                  className="border-white/10 bg-white/[0.03] text-xs text-slate-200 hover:bg-white/[0.08]"
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-3.5 w-3.5" />
                  )}
                  Apply template
                </Button>
              </CardHeader>

              <CardContent className="space-y-5 p-4">
                {/* PROGRESS METRIC BAR */}
                <div className="rounded-xl border border-white/[0.06] bg-[#121822]/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      Passed: <strong className="text-slate-100">{checked}</strong> / {items.length} checks
                    </span>
                    <span className={pct === 100 ? "text-cyan-400 font-bold" : "text-indigo-400"}>
                      {pct}% Completed
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-2 bg-white/[0.06]"
                    indicatorClassName={
                      pct === 100
                        ? "bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                        : "bg-gradient-to-r from-cyan-500 to-indigo-500"
                    }
                  />
                </div>

                {items.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-500 border border-dashed border-white/[0.06] rounded-xl">
                    No checks yet — apply the template to start the QC pass.
                  </p>
                )}

                {/* CHECKLIST ITEMS LIST */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`group rounded-xl border p-3.5 transition-all duration-200 ${
                        item.is_checked
                          ? "border-cyan-500/30 bg-cyan-500/[0.03]"
                          : "border-white/[0.06] bg-[#121822]/80 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={item.is_checked}
                          onCheckedChange={(v) => toggle(item, Boolean(v))}
                          className="mt-1 border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                        />
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p
                              className={`text-xs font-semibold ${
                                item.is_checked ? "text-cyan-200 line-through/50" : "text-slate-200"
                              }`}
                            >
                              {item.label}
                            </p>
                            {item.checked_at && (
                              <span className="text-[10px] font-mono text-cyan-400/80">
                                Passed {formatDateTime(item.checked_at)}
                              </span>
                            )}
                          </div>

                          <Textarea
                            className="text-xs bg-[#0c1017] border-white/10 text-slate-300 placeholder:text-slate-600 focus-visible:ring-cyan-500/50"
                            rows={2}
                            placeholder="Inspection note (optional)"
                            defaultValue={item.notes || ""}
                            onBlur={(e) => saveNote(item, e.target.value)}
                          />
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(item)}
                          aria-label="Remove check"
                          className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: HANDOVER PACK */}
          <TabsContent value="handover" className="space-y-4 pt-4">
            <div className="flex justify-end print:hidden">
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
              >
                <Printer className="mr-2 h-3.5 w-3.5" /> Print handover pack
              </Button>
            </div>

            <Card className="border-white/[0.08] bg-[#0c1017]/80 shadow-xl backdrop-blur-md print:border-black print:bg-white print:text-black print:shadow-none">
              <CardHeader className="border-b border-white/[0.06] p-5 print:border-slate-300">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-bold text-slate-100 print:text-black">
                    Handover pack — {job.job_number}
                  </CardTitle>
                  <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 print:border-black print:bg-black print:text-white">
                    Official Sign-Off
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-5 text-xs text-slate-300 print:text-slate-800">
                {/* METADATA SECTION */}
                <section className="grid gap-3 sm:grid-cols-2 rounded-xl border border-white/[0.06] bg-[#121822]/60 p-4 print:border-slate-300 print:bg-slate-50">
                  <p><strong className="text-slate-400 print:text-slate-600">Client: </strong>{job.client_name}</p>
                  <p><strong className="text-slate-400 print:text-slate-600">Service: </strong>{job.service_type || "—"}</p>
                  <p><strong className="text-slate-400 print:text-slate-600">Location: </strong>{job.client_location || "—"}</p>
                  <p><strong className="text-slate-400 print:text-slate-600">Started: </strong>{formatDateTime(job.created_at)}</p>
                </section>

                {/* WORKFLOW STAGES */}
                <section className="space-y-2">
                  <h3 className="font-bold text-slate-100 print:text-black flex items-center justify-between border-b border-white/[0.04] pb-1 print:border-slate-300">
                    <span>Workflow completion</span>
                    <span className="font-mono text-cyan-400 print:text-black">{stageDone} / {stages.length} Approved</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {stages.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#121822]/40 px-3 py-2 print:border-slate-200 print:bg-white"
                      >
                        <span className="font-medium text-slate-200 print:text-black">{s.stage_name || s.stage}</span>
                        <Badge
                          variant={s.status === "approved" ? "default" : "outline"}
                          className={`capitalize text-[10px] ${
                            s.status === "approved"
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 print:bg-black print:text-white"
                              : "border-white/10 text-slate-400 print:border-slate-300 print:text-slate-600"
                          }`}
                        >
                          {String(s.status).replace("_", " ")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* QUALITY CHECKS */}
                <section className="space-y-2">
                  <h3 className="font-bold text-slate-100 print:text-black flex items-center justify-between border-b border-white/[0.04] pb-1 print:border-slate-300">
                    <span>Quality checks</span>
                    <span className="font-mono text-cyan-400 print:text-black">{checked} / {items.length} Passed</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {items.map((i) => (
                      <li
                        key={i.id}
                        className="rounded-lg border border-white/[0.06] bg-[#121822]/40 px-3 py-2 print:border-slate-200 print:bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-200 print:text-black">{i.label}</span>
                          <Badge
                            className={`text-[10px] ${
                              i.is_checked
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 print:bg-black print:text-white"
                                : "bg-red-500/20 text-red-300 border-red-500/30 print:border-slate-300 print:text-slate-600"
                            }`}
                          >
                            {i.is_checked ? "Pass" : "Outstanding"}
                          </Badge>
                        </div>
                        {i.notes && (
                          <p className="mt-1 text-[11px] text-slate-400 italic print:text-slate-600">
                            Note: {i.notes}
                          </p>
                        )}
                      </li>
                    ))}
                    {items.length === 0 && (
                      <li className="text-slate-500 italic">No QC checks recorded.</li>
                    )}
                  </ul>
                </section>

                {/* COMMERCIAL SUMMARY */}
                <section className="space-y-2">
                  <h3 className="font-bold text-slate-100 print:text-black border-b border-white/[0.04] pb-1 print:border-slate-300">
                    Commercial summary
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3 font-mono">
                    <div className="rounded-lg border border-white/[0.06] bg-[#121822]/40 p-3 print:border-slate-200 print:bg-slate-50">
                      <p className="text-[10px] text-slate-400 print:text-slate-600 uppercase">Quoted</p>
                      <p className="mt-1 font-bold text-slate-200 print:text-black">{formatMoney(totals.quoted)}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-[#121822]/40 p-3 print:border-slate-200 print:bg-slate-50">
                      <p className="text-[10px] text-slate-400 print:text-slate-600 uppercase">Invoiced</p>
                      <p className="mt-1 font-bold text-slate-200 print:text-black">{formatMoney(totals.invoiced)}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-[#121822]/40 p-3 print:border-slate-200 print:bg-slate-50">
                      <p className="text-[10px] text-slate-400 print:text-slate-600 uppercase">Received</p>
                      <p className="mt-1 font-bold text-emerald-400 print:text-black">{formatMoney(totals.received)}</p>
                    </div>
                  </div>
                </section>

                {/* SIGNATURE BLOCK */}
                <section className="grid gap-12 pt-8 sm:grid-cols-2">
                  <div className="border-t border-white/20 pt-2 text-[11px] text-slate-400 print:border-black print:text-black">
                    Client signature / date
                  </div>
                  <div className="border-t border-white/20 pt-2 text-[11px] text-slate-400 print:border-black print:text-black">
                    Company representative / date
                  </div>
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: TEMPLATE EDITING */}
          <TabsContent value="template" className="space-y-4 pt-4">
            <Card className="border-white/[0.08] bg-[#0c1017]/80 shadow-xl backdrop-blur-md">
              <CardHeader className="border-b border-white/[0.04] p-4">
                <CardTitle className="font-heading text-base font-bold text-slate-100">
                  Company QC template
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  {template.map((t) => (
                    <div
                      key={t.key}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121822]/80 p-3 text-xs text-slate-200"
                    >
                      <span>{t.label}</span>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeTemplateItem(t.key)}
                          aria-label="Remove"
                          className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {isAdmin ? (
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={newLabel}
                      placeholder="Add a check, e.g. Torque test recorded"
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="bg-[#0c1017] border-white/10 text-xs text-slate-200 placeholder:text-slate-600 focus-visible:ring-cyan-500/50"
                    />
                    <Button
                      onClick={addTemplateItem}
                      disabled={!newLabel.trim()}
                      className="bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Admins can edit this template.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}