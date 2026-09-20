import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/crm";
import { formatCurrency } from "@/lib/currency";
import { Copy, Loader2, Plus, Trash2, FileText } from "lucide-react";
import { motion } from "framer-motion";

const CONFIG_KEY = "proposal_templates";

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  body: string;
}

const DEFAULT_TEMPLATES: ProposalTemplate[] = [
  {
    id: "standard",
    name: "Standard proposal",
    description: "General-purpose proposal for a scoped piece of work.",
    body: `Proposal for {{client}}
Prepared by {{company}} on {{date}}

1. Understanding
{{client}} requires {{scope}}.

2. Our approach
- Site/requirement confirmation
- Delivery per our standard workflow with approval gates
- Handover and sign-off

3. Investment
Total: {{value}} (valid 30 days)

4. Next step
Approve this proposal and we open the job immediately.`,
  },
  {
    id: "quick-quote",
    name: "Quick quote cover",
    description: "Short cover note that accompanies a quote from the quote builder.",
    body: `Hi {{contact}},

Thank you for the opportunity. Attached is our quote for {{scope}}.

Total: {{value}}
Validity: 30 days
Lead time: confirmed on acceptance

Reply to this message to approve and we start straight away.

{{company}}`,
  },
  {
    id: "retainer",
    name: "Retainer / ongoing service",
    description: "Monthly recurring service agreement outline.",
    body: `Service proposal for {{client}}
Date: {{date}}

Scope: {{scope}}
Monthly fee: {{value}}
Term: 12 months, reviewed quarterly
Response times: per our published SLAs

Prepared by {{company}}.`,
  },
];

const TOKENS = ["client", "contact", "scope", "value", "company", "date"];

/* -------------------------------------------------------
   BUSINESS OS GLASS CARD CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[14px]
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.24)]
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

export default function Proposals() {
  const { orgId, isAdmin, organization } = useAuth();
  const [templates, setTemplates] = useState<ProposalTemplate[]>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ProposalTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [sourceId, setSourceId] = useState<string>("manual");
  const [manual, setManual] = useState({ client: "", contact: "", scope: "", value: "" });
  const [deals, setDeals] = useState<{ id: string; name: string; value: number | null; account: string }[]>([]);

  useEffect(() => {
    (async () => {
      if (!orgId) return;
      const [cfg, opps, accounts] = await Promise.all([
        supabase.from("org_config").select("value").eq("org_id", orgId).eq("key", CONFIG_KEY).maybeSingle(),
        supabase.from("opportunities").select("id, name, value, account_id").order("created_at", { ascending: false }).limit(50),
        supabase.from("accounts").select("id, name"),
      ]);
      const stored = cfg.data?.value as unknown as ProposalTemplate[] | undefined;
      if (Array.isArray(stored) && stored.length) {
        setTemplates(stored);
        setSelectedId(stored[0].id);
      }
      const accMap = new Map((accounts.data || []).map((a) => [a.id, a.name]));
      setDeals((opps.data || []).map((o) => ({
        id: o.id,
        name: o.name,
        value: o.value as number | null,
        account: (o.account_id && accMap.get(o.account_id)) || "",
      })));
      setLoading(false);
    })();
  }, [orgId]);

  const persist = async (next: ProposalTemplate[]) => {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase
      .from("org_config")
      .upsert({ org_id: orgId, key: CONFIG_KEY, value: next as unknown as never }, { onConflict: "org_id,key" });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setTemplates(next);
    toast({ title: "Templates saved" });
  };

  const selected = templates.find((t) => t.id === selectedId) || templates[0];

  const values = useMemo(() => {
    const src = deals.find((d) => d.id === sourceId);
    return {
      client: src?.account || manual.client || "{{client}}",
      contact: manual.contact || "there",
      scope: src?.name || manual.scope || "the work discussed",
      value: src?.value != null ? formatMoney(src.value) : manual.value ? formatCurrency(Number(manual.value)) : "TBC",
      company: organization?.name || "our team",
      date: new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
    } as Record<string, string>;
  }, [deals, sourceId, manual, organization]);

  const rendered = useMemo(() => {
    if (!selected) return "";
    return selected.body.replace(/\{\{(\w+)\}\}/g, (m, k: string) => values[k] ?? m);
  }, [selected, values]);

  const copy = async () => {
    await navigator.clipboard.writeText(rendered);
    toast({ title: "Proposal copied", description: "Paste it into your quote builder, email or document." });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-[11px] text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-400" />
        Loading proposal templates...
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-200 min-w-0 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-4 min-w-0">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white sm:text-2xl min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 text-cyan-400"
            >
              <FileText className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Proposal templates</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400 break-words">
            Reusable proposal wording, auto-filled from an opportunity.
          </p>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setEditing({ id: "", name: "", description: "", body: "" })}
            className="h-8 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] active:scale-[0.98]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New template
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr] min-w-0">
        {/* TEMPLATES LIST */}
        <GlassCard>
          <div className="border-b border-white/[0.085] bg-white/[0.02] px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Templates
            </span>
          </div>
          <div className="p-4 space-y-2 min-w-0">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full rounded-xl border p-3 text-left text-xs transition-all ${
                  t.id === selected?.id
                    ? "border-cyan-400/40 bg-cyan-500/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                    : "border-white/[0.08] bg-[#0b0e14] text-slate-300 hover:bg-white/[0.04] hover:border-white/[0.15]"
                }`}
              >
                <p className="font-semibold text-slate-100">{t.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-400 break-words">{t.description}</p>
                {isAdmin && (
                  <span className="mt-2.5 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setEditing(t); }}
                      className="h-6 border-white/[0.08] bg-[#10151d] px-2.5 text-[10px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); persist(templates.filter((x) => x.id !== t.id)); }}
                      className="h-6 w-6 p-0 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                )}
              </button>
            ))}
            {templates.length === 0 && <p className="text-[11px] text-slate-500 py-4 text-center">No templates yet.</p>}
          </div>
        </GlassCard>

        {/* FILL FROM & PREVIEW */}
        <div className="space-y-4 min-w-0">
          <GlassCard>
            <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Fill from
              </span>
            </div>
            <div className="p-6 grid gap-3.5 sm:grid-cols-2 min-w-0">
              <div className="sm:col-span-2 min-w-0 space-y-1.5">
                <Label className="text-[11px] font-medium text-slate-300">Opportunity</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                    <SelectValue placeholder="Fill manually" />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    <SelectItem value="manual" className="text-[11px]">Fill manually</SelectItem>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-[11px]">
                        {d.name}{d.account ? ` — ${d.account}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sourceId === "manual" && (
                <>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[11px] font-medium text-slate-300">Client</Label>
                    <Input
                      value={manual.client}
                      onChange={(e) => setManual({ ...manual, client: e.target.value })}
                      className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[11px] font-medium text-slate-300">Contact first name</Label>
                    <Input
                      value={manual.contact}
                      onChange={(e) => setManual({ ...manual, contact: e.target.value })}
                      className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[11px] font-medium text-slate-300">Scope</Label>
                    <Input
                      value={manual.scope}
                      onChange={(e) => setManual({ ...manual, scope: e.target.value })}
                      className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[11px] font-medium text-slate-300">Value</Label>
                    <Input
                      type="number"
                      value={manual.value}
                      onChange={(e) => setManual({ ...manual, value: e.target.value })}
                      className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2 flex flex-wrap gap-1.5 pt-1">
                {TOKENS.map((t) => (
                  <Badge key={t} variant="outline" className="border-white/[0.08] bg-[#0b0e14] font-mono text-[10px] text-cyan-300">
                    {`{{${t}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Preview
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={copy}
                className="h-7 border-cyan-400/30 bg-cyan-400/10 text-[10px] font-bold text-cyan-300 hover:bg-cyan-400/20"
              >
                <Copy className="mr-1.5 h-3 w-3" /> Copy
              </Button>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-[#0b0e14] p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                {rendered}
              </pre>
            </div>
          </GlassCard>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:max-w-2xl">
          <DialogHeader className="border-b border-white/[0.065] pb-3">
            <DialogTitle className="text-sm font-bold text-white">
              {editing?.id ? "Edit template" : "New template"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3.5 pt-2">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-[11px] font-medium text-slate-300">Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-[11px] font-medium text-slate-300">Description</Label>
                <Input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label className="text-[11px] font-medium text-slate-300">
                  Body — use tokens like <code className="text-cyan-400">{"{{client}}"}</code>
                </Label>
                <Textarea
                  rows={12}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  className="rounded-xl border-white/[0.08] bg-[#0b0e14] text-xs font-mono text-slate-200 focus:border-cyan-400/40"
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              className="h-8 border-white/[0.08] bg-transparent text-xs text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              disabled={saving || !editing?.name.trim()}
              onClick={async () => {
                if (!editing) return;
                const id = editing.id || `tpl-${Math.random().toString(36).slice(2, 8)}`;
                const next = editing.id
                  ? templates.map((t) => (t.id === editing.id ? { ...editing } : t))
                  : [...templates, { ...editing, id }];
                await persist(next);
                setSelectedId(id);
                setEditing(null);
              }}
              className="h-8 bg-cyan-500 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-400"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}