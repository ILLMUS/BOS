import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, Megaphone, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useDeferredDelete } from "@/hooks/useDeferredDelete";
import { autosaveLabel, clearDraft, readDraft, useDraft } from "@/hooks/useAutosave";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;

export const CAMPAIGN_CHANNELS = ["email", "whatsapp", "call", "sms", "in_person", "social"] as const;
export const CHANNEL_LABELS: Record<string, string> = {
  email: "Email", whatsapp: "WhatsApp", call: "Phone call", sms: "SMS", in_person: "In person", social: "Social",
};
export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const;

const EMPTY_FORM = { name: "", description: "", channel: "email", goal: "", start_date: "" };
const DRAFT_KEY = "draft:new-campaign";

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
    (m.data || []).forEach((r) => { counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1; });
    setMembers(counts);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

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


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Build a target list, define the outreach sequence and work the follow-ups.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New campaign</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>New campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q3 industrial estates outreach" /></div>
              <div className="space-y-1"><Label>Primary channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CAMPAIGN_CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1"><Label>Goal</Label>
                <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="20 site visits booked" /></div>
              <div className="space-y-1"><Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter className="sm:justify-between">
              <span className="self-center text-xs text-muted-foreground">
                {draftSaved ? "Draft kept on this device" : autosaveLabel("idle")}
              </span>
              <Button onClick={create} disabled={saving || !form.name.trim()}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {trashed.length > 0 && (
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowTrash((v) => !v)}>
          <Trash2 className="mr-1 h-3 w-3" />
          {showTrash ? "Hide trash" : `Trash (${trashed.length})`}
        </Button>
      )}

      {showTrash && (
        <div className="grid gap-2">
          {trashed.map((c) => (
            <Card key={c.id} className="border-dashed">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-muted-foreground line-through">{c.name}</p>
                  <p className="text-xs text-muted-foreground">In trash — restore it or delete it for good.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => restoreCampaign(c)}>
                    <RotateCcw className="mr-1 h-3 w-3" /> Restore
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteForever(c)}>
                    Delete forever
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        : !live.length ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No campaigns yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {live.map((c) => (
              <Card key={c.id} className="transition hover:border-primary/40">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Megaphone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="outline">{CHANNEL_LABELS[c.channel] || c.channel}</Badge>
                      <Badge variant="outline" className="capitalize">{c.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {members[c.id] || 0} in list{c.goal ? ` · Goal: ${c.goal}` : ""}{c.start_date ? ` · Starts ${formatDate(c.start_date)}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild><Link to={`/outreach/campaigns/${c.id}`}>Open</Link></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => trashCampaign(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

    </div>
  );
}