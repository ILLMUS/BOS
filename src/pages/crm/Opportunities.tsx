import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { OPPORTUNITY_STAGE_LABELS, formatDate, formatMoney, type Account, type Lead, type Opportunity, type OpportunityStage } from "@/lib/crm";
import { ArrowRight, Loader2, Plus, TrendingUp } from "lucide-react";
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
              <TrendingUp className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Opportunities</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400 break-words">
            Qualified work in play, originating from your leads.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-8 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] active:scale-[0.98]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New opportunity
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:max-w-lg">
            <DialogHeader className="border-b border-white/[0.065] pb-3">
              <DialogTitle className="text-sm font-bold text-white">New opportunity</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Opportunity name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />
              <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                  <SelectItem value="none" className="text-[11px]">No account</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-[11px]">{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                  <SelectValue placeholder="Originating lead" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                  <SelectItem value="none" className="text-[11px]">No lead</SelectItem>
                  {leads.map((l) => <SelectItem key={l.id} value={l.id} className="text-[11px]">{l.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />
              <Input
                type="date"
                value={form.expected_close_date}
                onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                onClick={create}
                disabled={saving || !form.name.trim()}
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
              Loading opportunities...
            </div>
          ) : !rows.length ? (
            <div className="py-12 text-center text-[11px] text-slate-500">
              No opportunities yet.
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-white/[0.085] bg-white/[0.02]">
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Opportunity</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">From lead</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Value</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Close</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Stage</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs font-semibold text-slate-100">{o.name}</TableCell>
                    <TableCell className="text-xs">
                      {o.account_id ? (
                        <Link className="text-cyan-400 hover:underline" to={`/crm/accounts/${o.account_id}`}>
                          {accountName(o.account_id)}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{leadTitle(o.lead_id) || "—"}</TableCell>
                    <TableCell className="text-xs font-mono font-medium text-slate-200">{formatMoney(o.value)}</TableCell>
                    <TableCell className="text-xs text-slate-400">{formatDate(o.expected_close_date)}</TableCell>
                    <TableCell>
                      {o.stage === "won" || o.stage === "lost" ? (
                        <Badge
                          variant="outline"
                          className={
                            o.stage === "won"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[10px] font-semibold"
                              : "border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px] font-semibold"
                          }
                        >
                          {OPPORTUNITY_STAGE_LABELS[o.stage]}
                        </Badge>
                      ) : (
                        <Select value={o.stage} onValueChange={(v) => setStage(o.id, v as OpportunityStage)}>
                          <SelectTrigger className="h-7 w-36 rounded-lg border-white/[0.08] bg-[#0b0e14] text-[10px] font-medium text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                            {Object.entries(OPPORTUNITY_STAGE_LABELS).filter(([v]) => v !== "won" && v !== "lost").map(([v, l]) => (
                              <SelectItem key={v} value={v} className="text-[11px]">{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {o.stage !== "won" && o.stage !== "lost" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toDeal(o)}
                          className="h-7 border-cyan-400/30 bg-cyan-400/10 text-[10px] font-bold text-cyan-300 hover:bg-cyan-400/20"
                        >
                          Create deal <ArrowRight className="ml-1 h-3 w-3" />
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