import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { DEAL_STATUS_LABELS, formatDate, formatMoney, type Account, type Deal, type Opportunity } from "@/lib/crm";
import StartWorkDialog from "@/components/crm/StartWorkDialog";
import { Briefcase, Loader2, Plus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Deals() {
  const navigate = useNavigate();
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Deal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", account_id: "none", opportunity_id: "none", value: "" });
  const [workDeal, setWorkDeal] = useState<Deal | null>(null);

  const load = async () => {
    const [d, a, o] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
    ]);
    setRows(d.data || []);
    setAccounts(a.data || []);
    setOpps(o.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim() || !orgId) return;
    setSaving(true);
    const { error } = await supabase.from("deals").insert({
      org_id: orgId,
      name: form.name.trim(),
      account_id: form.account_id === "none" ? null : form.account_id,
      opportunity_id: form.opportunity_id === "none" ? null : form.opportunity_id,
      value: form.value ? Number(form.value) : null,
      owner_id: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast({ title: "Could not create deal", description: error.message, variant: "destructive" });
    setOpen(false);
    setForm({ name: "", account_id: "none", opportunity_id: "none", value: "" });
    load();
  };

  const close = async (deal: Deal, won: boolean) => {
    const reason = won ? null : window.prompt("Reason for losing this deal?") || null;
    const { error } = await supabase.rpc("close_deal", { _deal_id: deal.id, _won: won, _reason: reason });
    if (error) return toast({ title: "Could not close deal", description: error.message, variant: "destructive" });
    toast({ title: won ? "Deal won" : "Deal lost", description: won ? "The account is now a client." : "Marked as lost." });
    load();
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;
  const oppName = (id: string | null) => opps.find((o) => o.id === id)?.name;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Deals</h1>
          <p className="text-sm text-muted-foreground">Close deals and hand won work straight into your SOP engine.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New deal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New deal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Deal name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.opportunity_id} onValueChange={(v) => setForm({ ...form, opportunity_id: v })}>
                <SelectTrigger><SelectValue placeholder="Originating opportunity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No opportunity</SelectItem>
                  {opps.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
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
            <p className="p-8 text-center text-sm text-muted-foreground">No deals yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead><TableHead>Account</TableHead><TableHead>From opportunity</TableHead>
                  <TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead>Closed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      {d.account_id ? <Link className="text-accent hover:underline" to={`/crm/accounts/${d.account_id}`}>{accountName(d.account_id)}</Link> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{oppName(d.opportunity_id) || "—"}</TableCell>
                    <TableCell>{formatMoney(d.value)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={d.status === "won" ? "border-success/20 bg-success/10 text-success" : d.status === "lost" ? "border-destructive/20 bg-destructive/10 text-destructive" : ""}
                      >
                        {DEAL_STATUS_LABELS[d.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(d.closed_at)}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {d.status === "open" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => close(d, true)}>Won</Button>
                          <Button size="sm" variant="ghost" onClick={() => close(d, false)}>Lost</Button>
                        </>
                      )}
                      {d.status === "won" && !d.job_id && (
                        <Button size="sm" onClick={() => setWorkDeal(d)}>
                          <Briefcase className="mr-1 h-4 w-4" /> Start work
                        </Button>
                      )}
                      {d.job_id && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${d.job_id}`)}>View job</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StartWorkDialog deal={workDeal} onOpenChange={(o) => !o && setWorkDeal(null)} onDone={load} />
    </div>
  );
}
