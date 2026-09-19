import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import LifecycleBadge from "@/components/crm/LifecycleBadge";
import { LIFECYCLE_LABELS, formatDate, type Account, type LifecycleStage } from "@/lib/crm";
import {
  Building2,
  Filter,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Tag,
  UserPlus,
} from "lucide-react";

/* -------------------------------------------------------
   FUTURISTIC GLASS CONTAINER
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
        backdrop-blur-md
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

export default function Accounts() {
  const navigate = useNavigate();
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lifecycle_stage: "prospect" as LifecycleStage,
    industry: "",
    email: "",
    phone: "",
    location: "",
    source: "",
  });

  const load = async () => {
    const { data } = await supabase.from("accounts").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name.trim() || !orgId) return;
    setSaving(true);
    const { error } = await supabase.from("accounts").insert({
      org_id: orgId,
      name: form.name.trim(),
      lifecycle_stage: form.lifecycle_stage,
      industry: form.industry || null,
      email: form.email || null,
      phone: form.phone || null,
      location: form.location || null,
      source: form.source || null,
      owner_id: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error)
      return toast({
        title: "Could not create account",
        description: error.message,
        variant: "destructive",
      });
    setOpen(false);
    setForm({ name: "", lifecycle_stage: "prospect", industry: "", email: "", phone: "", location: "", source: "" });
    load();
  };

  const filtered = rows.filter(
    (r) =>
      (stageFilter === "all" || r.lifecycle_stage === stageFilter) &&
      r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER SECTION */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Accounts & Prospects</h1>
              <p className="mt-1 text-xs text-slate-400">
                Every company or person in your lifecycle, from prospect to client.
              </p>
            </div>
          </div>

          {/* CREATE DIALOG */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 text-black font-semibold hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Plus className="mr-1.5 h-4 w-4" /> New account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-white/[0.085] bg-[#10151d] text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-cyan-400" />
                  New account
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Account name *</Label>
                  <Input
                    placeholder="Acme Corp"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Lifecycle stage</Label>
                    <Select
                      value={form.lifecycle_stage}
                      onValueChange={(v) => setForm({ ...form, lifecycle_stage: v as LifecycleStage })}
                    >
                      <SelectTrigger className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                        {Object.entries(LIFECYCLE_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v} className="text-xs">
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Industry</Label>
                    <Input
                      placeholder="Technology"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Email</Label>
                    <Input
                      placeholder="contact@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Phone</Label>
                    <Input
                      placeholder="+268 ..."
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Location</Label>
                    <Input
                      placeholder="Mbabane, Eswatini"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Source</Label>
                    <Input
                      placeholder="Inbound / Outbound"
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={create}
                  disabled={saving || !form.name.trim()}
                  className="bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </GlassCard>

      {/* FILTERS SECTION */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="pl-9 border-white/[0.08] bg-[#10151d] text-xs text-slate-200 focus:border-cyan-400/30"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44 border-white/[0.08] bg-[#10151d] text-xs font-semibold text-slate-200">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-cyan-400" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
            <SelectItem value="all" className="text-xs">
              All stages
            </SelectItem>
            {Object.entries(LIFECYCLE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v} className="text-xs">
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DATA TABLE CONTAINER */}
      <GlassCard>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : !filtered.length ? (
          <div className="p-12 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No accounts match your current criteria.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-b border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Name</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Stage</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Industry</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]"
                  onClick={() => navigate(`/crm/accounts/${a.id}`)}
                >
                  <TableCell className="font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-cyan-400/70" />
                      {a.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <LifecycleBadge stage={a.lifecycle_stage} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {a.industry ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        <Tag className="h-3 w-3 text-purple-400" />
                        {a.industry}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {a.email || a.phone ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        {a.email ? (
                          <Mail className="h-3 w-3 text-cyan-400" />
                        ) : (
                          <Phone className="h-3 w-3 text-emerald-400" />
                        )}
                        {a.email || a.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">{formatDate(a.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>
    </div>
  );
}