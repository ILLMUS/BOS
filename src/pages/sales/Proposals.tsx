import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";

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
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Proposal templates</h1>
          <p className="text-sm text-muted-foreground">Reusable proposal wording, auto-filled from an opportunity.</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setEditing({ id: "", name: "", description: "", body: "" })}>
            <Plus className="mr-1 h-4 w-4" /> New template
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-heading text-base">Templates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full rounded border p-3 text-left text-sm transition ${t.id === selected?.id ? "border-primary bg-muted/50" : "hover:bg-muted/30"}`}
              >
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                {isAdmin && (
                  <span className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditing(t); }}>Edit</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); persist(templates.filter((x) => x.id !== t.id)); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </span>
                )}
              </button>
            ))}
            {templates.length === 0 && <p className="text-sm text-muted-foreground">No templates yet.</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="font-heading text-base">Fill from</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Opportunity</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger><SelectValue placeholder="Fill manually" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Fill manually</SelectItem>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}{d.account ? ` — ${d.account}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {sourceId === "manual" && (
                <>
                  <div><Label className="text-xs">Client</Label><Input value={manual.client} onChange={(e) => setManual({ ...manual, client: e.target.value })} /></div>
                  <div><Label className="text-xs">Contact first name</Label><Input value={manual.contact} onChange={(e) => setManual({ ...manual, contact: e.target.value })} /></div>
                  <div><Label className="text-xs">Scope</Label><Input value={manual.scope} onChange={(e) => setManual({ ...manual, scope: e.target.value })} /></div>
                  <div><Label className="text-xs">Value</Label><Input type="number" value={manual.value} onChange={(e) => setManual({ ...manual, value: e.target.value })} /></div>
                </>
              )}
              <div className="sm:col-span-2 flex flex-wrap gap-1">
                {TOKENS.map((t) => <Badge key={t} variant="outline" className="font-mono text-[10px]">{`{{${t}}}`}</Badge>)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-heading text-base">Preview</CardTitle>
              <Button size="sm" variant="outline" onClick={copy}><Copy className="mr-1 h-4 w-4" /> Copy</Button>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded border bg-muted/30 p-4 text-sm">{rendered}</pre>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label className="text-xs">Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label className="text-xs">Description</Label><Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Body — use tokens like {"{{client}}"}</Label>
                <Textarea rows={14} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
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
            >
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}