import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { toast as sonner } from "sonner";
import { formatDate } from "@/lib/crm";
import { Loader2, Megaphone, Plus, RotateCcw, Trash2, ChevronRight, Layers } from "lucide-react";
import { useDeferredDelete } from "@/hooks/useDeferredDelete";
import { autosaveLabel, clearDraft, readDraft, useDraft } from "@/hooks/useAutosave";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;

export const CAMPAIGN_CHANNELS = ["email", "whatsapp", "call", "sms", "in_person", "social"] as const;
export const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  call: "Phone call",
  sms: "SMS",
  in_person: "In person",
  social: "Social",
};
export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const;

const EMPTY_FORM = { name: "", description: "", channel: "email", goal: "", start_date: "" };
const DRAFT_KEY = "draft:new-campaign";

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

export default function Campaigns() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [members, setMembers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [form, setForm] = useState(() => readDraft(DRAFT_KEY, EMPTY_FORM));
  const { remove } = useDeferredDelete();

  useDraft(DRAFT_KEY, form, open);
  const draftSaved = open && form.name.trim().length > 0;

  const load = async () => {
    const [c, m] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("campaign_members").select("campaign_id"),
    ]);
    setRows(c.data || []);
    const counts: Record<string, number> = {};
    (m.data || []).forEach((r) => {
      counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1;
    });
    setMembers(counts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const live = rows.filter((c) => !c.deleted_at);
  const trashed = rows.filter((c) => c.deleted_at);

  const trashCampaign = (c: Campaign) =>
    remove({
      id: c.id,
      label: c.name,
      onRemove: async () => {
        await supabase.from("campaigns").update({ deleted_at: new Date().toISOString() }).eq("id", c.id);
        setRows((p) => p.map((r) => (r.id === c.id ? { ...r, deleted_at: new Date().toISOString() } : r)));
      },
      onRestore: async () => {
        await supabase.from("campaigns").update({ deleted_at: null }).eq("id", c.id);
        setRows((p) => p.map((r) => (r.id === c.id ? { ...r, deleted_at: null } : r)));
      },
      onCommit: async () => {
        await supabase.from("campaigns").delete().eq("id", c.id);
        setRows((p) => p.filter((r) => r.id !== c.id));
      },
    });

  const restoreCampaign = async (c: Campaign) => {
    await supabase.from("campaigns").update({ deleted_at: null }).eq("id", c.id);
    setRows((p) => p.map((r) => (r.id === c.id ? { ...r, deleted_at: null } : r)));
    sonner.success(`“${c.name}” restored`);
  };

  const deleteForever = async (c: Campaign) => {
    await supabase.from("campaigns").delete().eq("id", c.id);
    setRows((p) => p.filter((r) => r.id !== c.id));
    sonner.success("Deleted permanently");
  };

  const create = async () => {
    if (!form.name.trim() || !orgId) return;
    setSaving(true);
    const { error } = await supabase.from("campaigns").insert({
      org_id: orgId,
      name: form.name.trim(),
      description: form.description || null,
      channel: form.channel,
      goal: form.goal || null,
      start_date: form.start_date || null,
      owner_id: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast({ title: "Could not create campaign", description: error.message, variant: "destructive" });
    setOpen(false);
    clearDraft(DRAFT_KEY);
    setForm(EMPTY_FORM);
    load();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]";
      case "completed":
        return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]";
      case "paused":
        return "border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]";
      default:
        return "border-slate-700 bg-slate-800 text-slate-300";
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-3 border-b border-white/[0.085] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Campaigns</h1>
          <p className="text-xs text-slate-400">
            Build a target list, define the outreach sequence and work the follow-ups.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 rounded-lg bg-cyan-500 px-4 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400">
              <Plus className="mr-1.5 h-4 w-4" /> New campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">New campaign</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Q3 industrial estates outreach"
                  className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Primary channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:ring-cyan-400/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                    {CAMPAIGN_CHANNELS.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs focus:bg-white/[0.05] focus:text-white">
                        {CHANNEL_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Goal</Label>
                <Input
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  placeholder="20 site visits booked"
                  className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Start date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-white/[0.085] pt-3 sm:justify-between">
              <span className="self-center text-[10px] text-slate-400">
                {draftSaved ? "Draft kept on this device" : autosaveLabel("idle")}
              </span>
              <Button
                onClick={create}
                disabled={saving || !form.name.trim()}
                className="h-8.5 rounded-lg bg-cyan-500 px-4 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:bg-cyan-400 disabled:opacity-50"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* TRASH TOGGLE */}
      {trashed.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.02] text-xs font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white"
          onClick={() => setShowTrash((v) => !v)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {showTrash ? "Hide trash" : `Trash (${trashed.length})`}
        </Button>
      )}

      {/* TRASHED ITEMS LIST */}
      {showTrash && (
        <div className="grid gap-2.5">
          {trashed.map((c) => (
            <GlassCard key={c.id} className="p-4 border-dashed border-rose-400/20 bg-rose-500/[0.02]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400 line-through">{c.name}</p>
                  <p className="text-[10px] text-slate-500">In trash — restore it or delete it for good.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restoreCampaign(c)}
                    className="h-7.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] font-medium text-slate-200 hover:bg-white/[0.06]"
                  >
                    <RotateCcw className="mr-1.5 h-3 w-3 text-cyan-400" /> Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteForever(c)}
                    className="h-7.5 rounded-lg text-[10px] font-semibold text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
                  >
                    Delete forever
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* LIVE CAMPAIGNS LIST */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : !live.length ? (
        <GlassCard className="p-8 text-center">
          <p className="text-xs text-slate-400">No campaigns yet.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {live.map((c) => (
            <GlassCard
              key={c.id}
              className="group p-4 transition-all hover:border-cyan-400/30 hover:bg-[#10151d]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Megaphone className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span className="text-xs font-bold text-white tracking-tight">{c.name}</span>

                    <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      {CHANNEL_LABELS[c.channel] || c.channel}
                    </span>

                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                        c.status
                      )}`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {members[c.id] || 0} in list
                    {c.goal ? ` · Goal: ${c.goal}` : ""}
                    {c.start_date ? ` · Starts ${formatDate(c.start_date)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Link to={`/outreach/campaigns/${c.id}`} className="flex items-center gap-1">
                      Open <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-cyan-400" />
                    </Link>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => trashCampaign(c)}
                    className="h-8 w-8 rounded-lg p-0 text-slate-500 hover:bg-rose-400/10 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}