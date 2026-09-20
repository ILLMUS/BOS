import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { DEAL_STATUS_LABELS, formatDate, formatMoney, type Account, type Deal, type Opportunity } from "@/lib/crm";
import StartWorkDialog from "@/components/crm/StartWorkDialog";
import { Briefcase, Handshake, Loader2, Plus } from "lucide-react";
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
              <Handshake className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Deals</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400 break-words">
            Close deals and hand won work straight into your SOP engine.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-8 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] active:scale-[0.98]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New deal
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:max-w-lg">
            <DialogHeader className="border-b border-white/[0.065] pb-3">
              <DialogTitle className="text-sm font-bold text-white">New deal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Deal name"
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
              <Select value={form.opportunity_id} onValueChange={(v) => setForm({ ...form, opportunity_id: v })}>
                <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                  <SelectValue placeholder="Originating opportunity" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                  <SelectItem value="none" className="text-[11px]">No opportunity</SelectItem>
                  {opps.map((o) => <SelectItem key={o.id} value={o.id} className="text-[11px]">{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
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
              Loading deals...
            </div>
          ) : !rows.length ? (
            <div className="py-12 text-center text-[11px] text-slate-500">
              No deals yet.
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-white/[0.085] bg-white/[0.02]">
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Deal</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">From opportunity</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Value</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Closed</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs font-semibold text-slate-100">{d.name}</TableCell>
                    <TableCell className="text-xs">
                      {d.account_id ? (
                        <Link className="text-cyan-400 hover:underline" to={`/crm/accounts/${d.account_id}`}>
                          {accountName(d.account_id)}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{oppName(d.opportunity_id) || "—"}</TableCell>
                    <TableCell className="text-xs font-mono font-medium text-slate-200">{formatMoney(d.value)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          d.status === "won"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[10px] font-semibold"
                            : d.status === "lost"
                            ? "border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px] font-semibold"
                            : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-[10px] font-semibold"
                        }
                      >
                        {DEAL_STATUS_LABELS[d.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{formatDate(d.closed_at)}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {d.status === "open" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => close(d, true)}
                            className="h-7 border-emerald-400/30 bg-emerald-400/10 text-[10px] font-bold text-emerald-300 hover:bg-emerald-400/20"
                          >
                            Won
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => close(d, false)}
                            className="h-7 text-[10px] text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            Lost
                          </Button>
                        </>
                      )}
                      {d.status === "won" && !d.job_id && (
                        <Button
                          size="sm"
                          onClick={() => setWorkDeal(d)}
                          className="h-7 bg-cyan-500 text-[10px] font-bold text-slate-950 hover:bg-cyan-400"
                        >
                          <Briefcase className="mr-1 h-3.5 w-3.5" /> Start work
                        </Button>
                      )}
                      {d.job_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/jobs/${d.job_id}`)}
                          className="h-7 border-white/[0.08] bg-[#0b0e14] text-[10px] text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          View job
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

      <StartWorkDialog deal={workDeal} onOpenChange={(o) => !o && setWorkDeal(null)} onDone={load} />
    </div>
  );
}