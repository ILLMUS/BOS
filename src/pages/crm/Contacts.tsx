import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { type Account, type Contact } from "@/lib/crm";
import {
  Building2,
  Briefcase,
  UserCheck,
  Users,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
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

export default function Contacts() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    account_id: "none",
    job_title: "",
    email: "",
    phone: "",
  });

  const load = async () => {
    const [c, a] = await Promise.all([
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("accounts").select("*").order("name"),
    ]);
    setRows(c.data || []);
    setAccounts(a.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.full_name.trim() || !orgId) return;
    setSaving(true);
    const { error } = await supabase.from("contacts").insert({
      org_id: orgId,
      account_id: form.account_id === "none" ? null : form.account_id,
      full_name: form.full_name.trim(),
      job_title: form.job_title || null,
      email: form.email || null,
      phone: form.phone || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error)
      return toast({
        title: "Could not create contact",
        description: error.message,
        variant: "destructive",
      });
    setOpen(false);
    setForm({ full_name: "", account_id: "none", job_title: "", email: "", phone: "" });
    load();
  };

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name;
  const filtered = rows.filter((r) => r.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER SECTION */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Contacts</h1>
              <p className="mt-1 text-xs text-slate-400">
                People you deal with, linked to their account.
              </p>
            </div>
          </div>

          {/* CREATE DIALOG */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 text-black font-semibold hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Plus className="mr-1.5 h-4 w-4" /> New contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-white/[0.085] bg-[#10151d] text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-cyan-400" />
                  New contact
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">Full name *</Label>
                  <Input
                    placeholder="Jane Doe"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Account</Label>
                    <Select
                      value={form.account_id}
                      onValueChange={(v) => setForm({ ...form, account_id: v })}
                    >
                      <SelectTrigger className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200">
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                        <SelectItem value="none" className="text-xs">
                          No account
                        </SelectItem>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Role / Job Title</Label>
                    <Input
                      placeholder="CTO"
                      value={form.job_title}
                      onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                      className="border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300">Email</Label>
                    <Input
                      placeholder="jane@company.com"
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
              </div>

              <DialogFooter>
                <Button
                  onClick={create}
                  disabled={saving || !form.full_name.trim()}
                  className="bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </GlassCard>

      {/* SEARCH BAR */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          className="pl-9 border-white/[0.08] bg-[#10151d] text-xs text-slate-200 focus:border-cyan-400/30"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            <p className="text-sm text-slate-400">No contacts match your current search.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-b border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Name</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Account</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Role</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]"
                >
                  <TableCell className="font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-xs font-bold">
                        {c.full_name.charAt(0).toUpperCase()}
                      </div>
                      {c.full_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.account_id ? (
                      <Link
                        className="inline-flex items-center gap-1.5 font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                        to={`/crm/accounts/${c.account_id}`}
                      >
                        <Building2 className="h-3.5 w-3.5 text-cyan-400/70" />
                        {accountName(c.account_id)}
                      </Link>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {c.job_title ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        <Briefcase className="h-3 w-3 text-purple-400" />
                        {c.job_title}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {c.email ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        <Mail className="h-3 w-3 text-cyan-400" />
                        {c.email}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {c.phone ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        <Phone className="h-3 w-3 text-emerald-400" />
                        {c.phone}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>
    </div>
  );
}