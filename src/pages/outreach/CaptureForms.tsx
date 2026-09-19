import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Loader2, Plus, Trash2, FileText } from "lucide-react";
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
    (s.data || []).forEach((r) => {
      c[r.form_id] = (c[r.form_id] || 0) + 1;
    });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

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
    <div className="space-y-6 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-3 border-b border-white/[0.085] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Lead capture forms</h1>
          <p className="text-xs text-slate-400">
            Public forms that create an account, contact and lead automatically when someone enquires.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 rounded-lg bg-cyan-500 px-4 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400">
              <Plus className="mr-1.5 h-4 w-4" /> New form
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[85vh] overflow-y-auto border-white/[0.085] bg-[#10151d] text-slate-200 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">New capture form</DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Form name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Website enquiry"
                  className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Intro text</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell us about your project and we'll get back to you."
                  rows={2}
                  className="rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Source label</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="h-9 rounded-xl border-white/[0.08] bg-[#161c26] text-xs text-slate-200 focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] text-slate-300">Fields</Label>
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div
                      key={f.key}
                      className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#161c26]/60 p-2"
                    >
                      <Input
                        className="h-7.5 rounded-lg border-white/[0.08] bg-[#10151d] text-xs text-slate-200 focus:border-cyan-400/30"
                        value={f.label}
                        onChange={(e) =>
                          setFields(
                            fields.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x))
                          )
                        }
                      />
                      <div className="flex shrink-0 items-center gap-2 pr-1">
                        <Switch
                          checked={f.required}
                          onCheckedChange={(v) =>
                            setFields(
                              fields.map((x, xi) => (xi === i ? { ...x, required: v } : x))
                            )
                          }
                        />
                        <span className="text-[11px] text-slate-400">Required</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-white/[0.085] pt-3">
              <Button
                onClick={create}
                disabled={saving || !form.name.trim()}
                className="h-8.5 rounded-lg bg-cyan-500 px-4 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:bg-cyan-400 disabled:opacity-50"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Create form
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* CARDS LIST */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : !rows.length ? (
        <GlassCard className="p-8 text-center">
          <p className="text-xs text-slate-400">
            No capture forms yet. Create one to collect enquiries from your website, WhatsApp bio or email signature.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <GlassCard key={r.id} className="p-4 transition-all hover:border-cyan-400/30">
              <div className="space-y-3.5">
                {/* HEADER */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
                    <h3 className="text-sm font-bold text-white tracking-tight">{r.name}</h3>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)] shrink-0">
                    {counts[r.id] || 0} submissions
                  </span>
                </div>

                {/* DESCRIPTION */}
                {r.description && <p className="text-xs text-slate-400 line-clamp-2">{r.description}</p>}

                {/* PUBLIC LINK BOX */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#161c26]/80 p-1.5 pl-3">
                  <code className="flex-1 truncate text-[11px] text-cyan-300/90 font-mono">
                    {publicUrl(r.slug)}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl(r.slug));
                      toast({ title: "Link copied" });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                    className="h-7 w-7 rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  >
                    <a href={publicUrl(r.slug)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>

                {/* FOOTER CONTROLS */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                      <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /> Active
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                      <Switch checked={r.auto_create_lead} onCheckedChange={() => toggleRouting(r)} /> Auto-route
                    </label>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg p-0 text-slate-500 hover:bg-rose-400/10 hover:text-rose-400"
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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