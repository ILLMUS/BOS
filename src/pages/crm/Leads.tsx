import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { LEAD_SOURCES, LEAD_STATUS_LABELS, formatMoney, type Account, type Contact, type Lead, type LeadStatus } from "@/lib/crm";
import { ArrowRight, Loader2, Plus } from "lucide-react";

export default function Leads() {
  const navigate = useNavigate();
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", account_id: "none", contact_id: "none", source: "Referral", estimated_value: "", description: "" });

  const load = async () => {
    const [l, a, c] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("contacts").select("*").order("full_name"),
    ]);
    setRows(l.data || []);
    setAccounts(a.data || []);
    setContacts(c.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title.trim() || !orgId) return;
    setSaving(true);
    const accountId = form.account_id === "none" ? null : form.account_id;
    const { error } = await supabase.from("leads").insert({
      org_id: orgId,
      title: form.title.trim(),
      account_id: accountId,
      contact_id: form.contact_id === "none" ? null : form.contact_id,
      source: form.source || null,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      description: form.description || null,
      owner_id: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    if (!error && accountId) {
      await supabase.from("accounts").update({ lifecycle_stage: "lead" }).eq("id", accountId).eq("lifecycle_stage", "prospect");
    }
    setSaving(false);
    if (error) return toast({ title: "Could not create lead", description: error.message, variant: "destructive" });
    setOpen(false);
    setForm({ title: "", account_id: "none", contact_id: "none", source: "Referral", estimated_value: "", description: "" });
    load();
  };

  const setStatus = async (id: string, status: LeadStatus) => {
    await supabase.from("leads").update({ status }).eq("id", id);
    load();
  };

  const convert = async (lead: Lead) => {
    const { data, error } = await supabase.rpc("convert_lead_to_opportunity", { _lead_id: lead.id });
    if (error) return toast({ title: "Conversion failed", description: error.message, variant: "destructive" });
    toast({ title: "Lead converted", description: "An opportunity was created from this lead." });
    navigate(`/crm/opportunities?highlight=${data}`);
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;
  const filteredContacts = form.account_id === "none" ? contacts : contacts.filter((c) => c.account_id === form.account_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">Qualify enquiries, then convert them into opportunities.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New lead</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="What is the enquiry?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v, contact_id: "none" })}>
                <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                <SelectTrigger><SelectValue placeholder="Contact" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contact</SelectItem>
                  {filteredContacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>{LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Estimated value" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
              <Textarea placeholder="Notes" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={saving || !form.title.trim()}>
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
            <p className="p-8 text-center text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead><TableHead>Account</TableHead><TableHead>Source</TableHead>
                  <TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.title}</TableCell>
                    <TableCell>
                      {l.account_id ? <Link className="text-accent hover:underline" to={`/crm/accounts/${l.account_id}`}>{accountName(l.account_id)}</Link> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.source || "—"}</TableCell>
                    <TableCell>{formatMoney(l.estimated_value)}</TableCell>
                    <TableCell>
                      {l.status === "converted" ? (
                        <Badge variant="outline" className="border-success/20 bg-success/10 text-success">Converted</Badge>
                      ) : (
                        <Select value={l.status} onValueChange={(v) => setStatus(l.id, v as LeadStatus)}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(LEAD_STATUS_LABELS).filter(([v]) => v !== "converted").map(([v, lab]) => (
                              <SelectItem key={v} value={v}>{lab}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status !== "converted" && l.status !== "disqualified" && (
                        <Button size="sm" variant="outline" onClick={() => convert(l)}>
                          Convert <ArrowRight className="ml-1 h-4 w-4" />
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
