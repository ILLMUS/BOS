import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { LEAD_SOURCES, LEAD_STATUS_LABELS, formatMoney, type Account, type Contact, type Lead, type LeadStatus } from "@/lib/crm";
import { ArrowRight, Loader2, Plus, Target } from "lucide-react";
import { motion } from "framer-motion";

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
              <Target className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Leads</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400 break-words">
            Qualify enquiries, then convert them into opportunities.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-8 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] active:scale-[0.98]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New lead
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:max-w-lg">
            <DialogHeader className="border-b border-white/[0.065] pb-3">
              <DialogTitle className="text-sm font-bold text-white">New lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="What is the enquiry?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />
              <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v, contact_id: "none" })}>
                <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                  <SelectItem value="none" className="text-[11px]">No account</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-[11px]">{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                  <SelectValue placeholder="Contact" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                  <SelectItem value="none" className="text-[11px]">No contact</SelectItem>
                  {filteredContacts.map((c) => <SelectItem key={c.id} value={c.id} className="text-[11px]">{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                  {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Estimated value"
                value={form.estimated_value}
                onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />
              <Textarea
                placeholder="Notes"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[70px] rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                onClick={create}
                disabled={saving || !form.title.trim()}
                className="w-full rounded-xl bg-cyan-500 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-400"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE CONTAINER */}
      <GlassCard>
        <div className="overflow-x-auto min-w-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-[11px] text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
              Loading leads...
            </div>
          ) : !rows.length ? (
            <div className="py-12 text-center text-[11px] text-slate-500">
              No leads yet.
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-white/[0.085] bg-white/[0.02]">
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Lead</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Source</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Value</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs font-semibold text-slate-100">{l.title}</TableCell>
                    <TableCell className="text-xs">
                      {l.account_id ? (
                        <Link className="text-cyan-400 hover:underline" to={`/crm/accounts/${l.account_id}`}>
                          {accountName(l.account_id)}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{l.source || "—"}</TableCell>
                    <TableCell className="text-xs font-mono font-medium text-slate-200">{formatMoney(l.estimated_value)}</TableCell>
                    <TableCell>
                      {l.status === "converted" ? (
                        <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[10px] font-semibold">
                          Converted
                        </Badge>
                      ) : (
                        <Select value={l.status} onValueChange={(v) => setStatus(l.id, v as LeadStatus)}>
                          <SelectTrigger className="h-7 w-36 rounded-lg border-white/[0.08] bg-[#0b0e14] text-[10px] font-medium text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                            {Object.entries(LEAD_STATUS_LABELS).filter(([v]) => v !== "converted").map(([v, lab]) => (
                              <SelectItem key={v} value={v} className="text-[11px]">{lab}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status !== "converted" && l.status !== "disqualified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => convert(l)}
                          className="h-7 border-cyan-400/30 bg-cyan-400/10 text-[10px] font-bold text-cyan-300 hover:bg-cyan-400/20"
                        >
                          Convert <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </GlassCard>
    </div>
  );
}