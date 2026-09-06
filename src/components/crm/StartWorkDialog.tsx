import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatMoney, type Account, type Contact, type Deal } from "@/lib/crm";
import { ArrowRight, Building2, Clock, Loader2, UserCheck, Workflow } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Props = {
  deal: Deal | null;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
};

/**
 * Sales -> Client -> Operations hand-off.
 * Reuses the existing workflow engine via the create_job_from_deal RPC,
 * which itself calls create_job_from_template (stages, SLA, owner assignment).
 */
export default function StartWorkDialog({ deal, onOpenChange, onDone }: Props) {
  const navigate = useNavigate();
  const { orgId, user } = useAuth();
  const [templates, setTemplates] = useState<Tables<"sop_templates">[]>([]);
  const [stages, setStages] = useState<Tables<"sop_stages">[]>([]);
  const [roles, setRoles] = useState<Tables<"org_roles">[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [newAccountName, setNewAccountName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!deal) return;
    setLoading(true);
    setServiceType(deal.name);
    setAccountId(deal.account_id ?? "new");
    setNewAccountName(deal.account_id ? "" : deal.name);
    (async () => {
      const [t, a, r, c] = await Promise.all([
        supabase.from("sop_templates").select("*").eq("is_locked", false).order("name"),
        supabase.from("accounts").select("*").order("name"),
        supabase.from("org_roles").select("*"),
        deal.contact_id
          ? supabase.from("contacts").select("*").eq("id", deal.contact_id).maybeSingle()
          : Promise.resolve({ data: null } as { data: Contact | null }),
      ]);
      setTemplates(t.data || []);
      setAccounts(a.data || []);
      setRoles(r.data || []);
      setContact((c as { data: Contact | null }).data ?? null);
      setTemplateId((t.data || [])[0]?.id ?? "");
      setLoading(false);
    })();
  }, [deal]);

  useEffect(() => {
    if (!templateId) return setStages([]);
    supabase
      .from("sop_stages")
      .select("*")
      .eq("template_id", templateId)
      .order("position")
      .then(({ data }) => setStages(data || []));
  }, [templateId]);

  const template = templates.find((t) => t.id === templateId);
  const firstStage = stages[0];
  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name;
  const account = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId]);

  const start = async () => {
    if (!deal || !templateId) return;
    if (!stages.length) {
      return toast({ title: "This workflow has no stages", description: "Add stages in the SOP builder first.", variant: "destructive" });
    }
    setStarting(true);
    try {
      let linkedAccount = deal.account_id;

      // 1. Identify or create the client.
      if (accountId === "new") {
        if (!newAccountName.trim()) throw new Error("Enter a client name");
        const { data, error } = await supabase
          .from("accounts")
          .insert({
            org_id: orgId!,
            name: newAccountName.trim(),
            lifecycle_stage: "client",
            email: contact?.email ?? null,
            phone: contact?.phone ?? null,
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        linkedAccount = data.id;
      } else if (accountId) {
        linkedAccount = accountId;
      }

      if (linkedAccount && linkedAccount !== deal.account_id) {
        const { error } = await supabase.from("deals").update({ account_id: linkedAccount }).eq("id", deal.id);
        if (error) throw error;
      }

      // 2-11. Existing engine: creates the job, stages, SLA, owners, audit entry.
      const { data: jobId, error } = await supabase.rpc("create_job_from_deal", {
        _deal_id: deal.id,
        _template_id: templateId,
        _service_type: serviceType.trim() || null,
      });
      if (error) throw error;

      toast({ title: "Work started", description: `${template?.name} is now running for this client.` });
      onOpenChange(false);
      onDone?.();
      navigate(`/jobs/${jobId}`);
    } catch (e) {
      toast({ title: "Could not start work", description: (e as Error).message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={!!deal} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start work from this deal</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs font-medium">
              <span>Deal</span><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>Client</span><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>Work</span><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>Workflow</span>
              <Badge variant="outline" className="ml-auto">{deal ? formatMoney(deal.value) : ""}</Badge>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Client</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Create a new client</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {accountId === "new" ? (
                <Input placeholder="Client name" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {[account?.email, account?.phone, account?.location].filter(Boolean).join(" · ") || "No contact details on file"}
                </p>
              )}
              {contact && <p className="text-xs text-muted-foreground">Primary contact: {contact.full_name}</p>}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Workflow className="h-4 w-4" /> Workflow / SOP</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select a workflow" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} (v{t.version})</SelectItem>)}
                </SelectContent>
              </Select>
              {!templates.length && <p className="text-xs text-destructive">No workflows yet. Build one in the SOP builder first.</p>}
            </div>

            <div className="space-y-2">
              <Label>Work description</Label>
              <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="What is being delivered?" />
            </div>

            {stages.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {stages.length} stages will be created
                </p>
                <ol className="space-y-1 text-sm">
                  {stages.map((s, i) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                        {i + 1}. {s.name}{i === 0 && <Badge variant="outline" className="ml-2 border-success/20 bg-success/10 text-success">Activates now</Badge>}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{s.sla_hours}h</span>
                    </li>
                  ))}
                </ol>
                {firstStage && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <UserCheck className="h-3 w-3" />
                    Responsibility: {roleName(firstStage.primary_role_id) || "Unassigned"}
                    {firstStage.secondary_role_id && ` · backup ${roleName(firstStage.secondary_role_id)}`}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={start} disabled={starting || loading || !templateId}>
            {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create work record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
