import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CaptureForm = Tables<"capture_forms">;

type FieldDef = { key: string; label: string; type: string; required: boolean };

const DEFAULT_FIELDS: FieldDef[] = [
  { key: "full_name", label: "Full name", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "phone", label: "Phone (+268)", type: "tel", required: false },
  { key: "company", label: "Company", type: "text", required: false },
  { key: "message", label: "What do you need?", type: "textarea", required: false },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "form";

export default function CaptureForms() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<CaptureForm[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", source: "Website form" });
  const [fields, setFields] = useState<FieldDef[]>(DEFAULT_FIELDS);

  const load = async () => {
    const [f, s] = await Promise.all([
      supabase.from("capture_forms").select("*").order("created_at", { ascending: false }),
      supabase.from("form_submissions").select("form_id"),
    ]);
    setRows(f.data || []);
    const c: Record<string, number> = {};
    (s.data || []).forEach((r) => { c[r.form_id] = (c[r.form_id] || 0) + 1; });
    setCounts(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const publicUrl = (slug: string) => `${window.location.origin}/f/${slug}`;

  const create = async () => {
    if (!form.name.trim() || !orgId) return;
    setSaving(true);
    const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("capture_forms").insert({
      org_id: orgId,
      name: form.name.trim(),
      description: form.description || null,
      slug,
      fields: fields as unknown as never,
      default_source: form.source || "Website form",
      default_owner_id: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast({ title: "Could not create form", description: error.message, variant: "destructive" });
    toast({ title: "Capture form created", description: "Share the link to start collecting leads." });
    setOpen(false);
    setForm({ name: "", description: "", source: "Website form" });
    setFields(DEFAULT_FIELDS);
    load();
  };

  const toggleActive = async (row: CaptureForm) => {
    await supabase.from("capture_forms").update({ is_active: !row.is_active }).eq("id", row.id);
    load();
  };

  const toggleRouting = async (row: CaptureForm) => {
    await supabase.from("capture_forms").update({ auto_create_lead: !row.auto_create_lead }).eq("id", row.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("capture_forms").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Lead capture forms</h1>
          <p className="text-sm text-muted-foreground">
            Public forms that create an account, contact and lead automatically when someone enquires.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New form</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>New capture form</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Form name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Website enquiry" />
              </div>
              <div className="space-y-1">
                <Label>Intro text</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell us about your project and we'll get back to you." />
              </div>
              <div className="space-y-1">
                <Label>Source label</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fields</Label>
                {fields.map((f, i) => (
                  <div key={f.key} className="flex items-center gap-2 rounded border p-2">
                    <Input
                      className="h-8"
                      value={f.label}
                      onChange={(e) => setFields(fields.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
                    />
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={f.required}
                        onCheckedChange={(v) => setFields(fields.map((x, xi) => (xi === i ? { ...x, required: v } : x)))}
                      />
                      <span className="text-xs text-muted-foreground">Required</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={saving || !form.name.trim()}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create form
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !rows.length ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No capture forms yet. Create one to collect enquiries from your website, WhatsApp bio or email signature.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-heading text-base">{r.name}</CardTitle>
                  <Badge variant="outline">{counts[r.id] || 0} submissions</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {r.description && <p className="text-muted-foreground">{r.description}</p>}
                <div className="flex items-center gap-2 rounded border bg-muted/40 p-2">
                  <code className="flex-1 truncate text-xs">{publicUrl(r.slug)}</code>
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(publicUrl(r.slug)); toast({ title: "Link copied" }); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" asChild>
                    <a href={publicUrl(r.slug)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /> Active
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch checked={r.auto_create_lead} onCheckedChange={() => toggleRouting(r)} /> Auto-route to lead
                  </label>
                  <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => remove(r.id)}>
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