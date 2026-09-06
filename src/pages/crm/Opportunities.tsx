import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { OPPORTUNITY_STAGE_LABELS, formatDate, formatMoney, type Account, type Lead, type Opportunity, type OpportunityStage } from "@/lib/crm";
import { ArrowRight, Loader2, Plus } from "lucide-react";

export default function Opportunities() {
  const navigate = useNavigate();
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", account_id: "none", lead_id: "none", value: "", expected_close_date: "" });

  const load = async () => {
    const [o, a, l] = await Promise.all([
      supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
    ]);
    setRows(o.data || []);
    setAccounts(a.data || []);
    setLeads(l.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim() || !orgId) return;
    setSaving(true);
    const { error } = await supabase.from("opportunities").insert({
      org_id: orgId,
      name: form.name.trim(),
      account_id: form.account_id === "none" ? null : form.account_id,
      lead_id: form.lead_id === "none" ? null : form.lead_id,
      value: form.value ? Number(form.value) : null,
      expected_close_date: form.expected_close_date || null,
      owner_id: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast({ title: "Could not create opportunity", description: error.message, variant: "destructive" });
    setOpen(false);
    setForm({ name: "", account_id: "none", lead_id: "none", value: "", expected_close_date: "" });
    load();
  };

  const setStage = async (id: string, stage: OpportunityStage) => {
    await supabase.from("opportunities").update({ stage }).eq("id", id);
    load();
  };

  const toDeal = async (opp: Opportunity) => {
    const { data, error } = await supabase.rpc("convert_opportunity_to_deal", { _opportunity_id: opp.id });
    if (error) return toast({ title: "Conversion failed", description: error.message, variant: "destructive" });
    toast({ title: "Deal created", description: "This opportunity is now a deal." });
    navigate(`/crm/deals?highlight=${data}`);
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;
  const leadTitle = (id: string | null) => leads.find((l) => l.id === id)?.title;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Opportunities</h1>
          <p className="text-sm text-muted-foreground">Qualified work in play, originating from your leads.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New opportunity</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New opportunity</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Opportunity name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                <SelectTrigger><SelectValue placeholder="Originating lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead</SelectItem>
                  {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              <Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={saving || !form.name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : !rows.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No opportunities yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead><TableHead>Account</TableHead><TableHead>From lead</TableHead>
                  <TableHead>Value</TableHead><TableHead>Close</TableHead><TableHead>Stage</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>
                      {o.account_id ? <Link className="text-accent hover:underline" to={`/crm/accounts/${o.account_id}`}>{accountName(o.account_id)}</Link> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{leadTitle(o.lead_id) || "—"}</TableCell>
                    <TableCell>{formatMoney(o.value)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(o.expected_close_date)}</TableCell>
                    <TableCell>
                      {o.stage === "won" || o.stage === "lost" ? (
                        <Badge variant="outline">{OPPORTUNITY_STAGE_LABELS[o.stage]}</Badge>
                      ) : (
                        <Select value={o.stage} onValueChange={(v) => setStage(o.id, v as OpportunityStage)}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(OPPORTUNITY_STAGE_LABELS).filter(([v]) => v !== "won" && v !== "lost").map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {o.stage !== "won" && o.stage !== "lost" && (
                        <Button size="sm" variant="outline" onClick={() => toDeal(o)}>
                          Create deal <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
