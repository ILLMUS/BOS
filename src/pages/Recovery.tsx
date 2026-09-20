import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/crm";
import { clearDraft } from "@/hooks/useAutosave";
import { formatDraftAge, listPendingDrafts, clearDraft as clearStageDraft } from "@/lib/offlineDraft";
import { FileClock, GitBranch, Loader2, Megaphone, RotateCcw, Trash2, LifeBuoy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Template = Tables<"sop_templates">;

interface LocalDraft {
  key: string;
  label: string;
  summary: string;
  to: string;
}

const LOCAL_SOURCES = [
  { key: "draft:new-campaign", label: "Unfinished campaign", to: "/outreach/campaigns", field: "name" },
  { key: "draft:new-job", label: "Unfinished job", to: "/jobs/new", field: "client_name" },
];

function readLocalDrafts(): LocalDraft[] {
  const out: LocalDraft[] = [];
  for (const src of LOCAL_SOURCES) {
    try {
      const raw = localStorage.getItem(src.key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const values = Object.values(parsed).filter((v) => typeof v === "string" && v.trim());
      if (!values.length) continue;
      const title = (parsed[src.field] as string) || (values[0] as string);
      out.push({
        key: src.key,
        label: src.label,
        summary: title,
        to: src.to,
      });
    } catch {
      /* ignore unreadable drafts */
    }
  }
  return out;
}

export default function Recovery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [local, setLocal] = useState<LocalDraft[]>([]);
  const [stageDrafts, setStageDrafts] = useState(() => listPendingDrafts());

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([
      supabase.from("campaigns").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("sop_templates").select("*").eq("is_published", false).order("updated_at", { ascending: false }),
    ]);
    setCampaigns(c.data || []);
    setTemplates(t.data || []);
    setLocal(readLocalDrafts());
    setStageDrafts(listPendingDrafts());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const restoreCampaign = async (c: Campaign) => {
    const { error } = await supabase.from("campaigns").update({ deleted_at: null }).eq("id", c.id);
    if (error) return toast({ title: "Could not restore", description: error.message, variant: "destructive" });
    setCampaigns((p) => p.filter((r) => r.id !== c.id));
    toast({ title: "Campaign restored", description: c.name });
  };

  const deleteCampaign = async (c: Campaign) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (error) return toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    setCampaigns((p) => p.filter((r) => r.id !== c.id));
    toast({ title: "Deleted for good", description: c.name });
  };

  const deleteTemplate = async (t: Template) => {
    const { error } = await supabase.from("sop_templates").delete().eq("id", t.id);
    if (error) return toast({ title: "Could not discard", description: error.message, variant: "destructive" });
    setTemplates((p) => p.filter((r) => r.id !== t.id));
    toast({ title: "Workflow draft discarded", description: t.name });
  };

  const discardLocal = (d: LocalDraft) => {
    clearDraft(d.key);
    setLocal((p) => p.filter((x) => x.key !== d.key));
    toast({ title: "Draft discarded", description: d.summary });
  };

  const discardStage = (stageId: string) => {
    clearStageDraft(stageId);
    setStageDrafts((p) => p.filter((d) => d.stageId !== stageId));
    toast({ title: "Saved step discarded" });
  };

  const total = campaigns.length + templates.length + local.length + stageDrafts.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 min-w-0 pb-12 text-white">
      {/* HEADER SECTION */}
      <div className="space-y-1 min-w-0">
        <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white sm:text-2xl min-w-0">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-500/10 text-teal-400 shadow-inner"
          >
            <LifeBuoy className="h-5 w-5" />
          </motion.div>
          <span className="truncate">Recovery Centre</span>
        </h1>
        <p className="break-words text-xs sm:text-sm text-slate-400">
          {total === 0
            ? "Nothing waiting to be recovered — everything you started has been saved or cleared."
            : `${total} item${total === 1 ? "" : "s"} you can bring back or clear out.`}
        </p>
      </div>

      {/* DEVICE DRAFTS CARD */}
      <div className="relative w-full min-w-0 group">
        <motion.div
          animate={{
            x: [-15, 15, -15],
            y: [-8, 8, -8],
            opacity: [0.25, 0.5, 0.25],
            scale: [0.98, 1.02, 0.98],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/10 to-teal-400/25 blur-xl pointer-events-none"
        />

        <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-2xl backdrop-blur-md">
          <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400">
                <FileClock className="h-4 w-4" />
              </div>
              <span className="truncate">Unfinished on this device</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-2">
            {local.length === 0 && stageDrafts.length === 0 && (
              <p className="text-xs text-slate-400 py-2">No unfinished forms saved here.</p>
            )}

            <AnimatePresence>
              {local.map((d) => (
                <motion.div
                  key={d.key}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0 transition-colors hover:border-white/20"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-xs sm:text-sm font-semibold text-white">{d.summary}</p>
                    <p className="text-[11px] text-slate-400 truncate">{d.label}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(d.to)}
                      className="h-8 border-white/10 bg-[#030d12] text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      Continue
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => discardLocal(d)}
                      className="h-8 w-8 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label="Discard draft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}

              {stageDrafts.map((d) => (
                <motion.div
                  key={d.stageId}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0 transition-colors hover:border-white/20"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-xs sm:text-sm font-semibold text-white">Job step not yet sent up</p>
                    <p className="text-[11px] text-slate-400 truncate">Kept {formatDraftAge(d.savedAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/jobs/${d.jobId}`)}
                      className="h-8 border-white/10 bg-[#030d12] text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      Open job
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => discardStage(d.stageId)}
                      className="h-8 w-8 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label="Discard step draft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* CAMPAIGN TRASH CARD */}
      <div className="relative w-full min-w-0 group">
        <motion.div
          animate={{
            x: [-15, 15, -15],
            y: [-8, 8, -8],
            opacity: [0.2, 0.45, 0.2],
            scale: [0.98, 1.02, 0.98],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/10 to-teal-400/25 blur-xl pointer-events-none"
        />

        <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-2xl backdrop-blur-md">
          <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400">
                <Megaphone className="h-4 w-4" />
              </div>
              <span className="truncate">Campaigns in trash</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-2">
            {campaigns.length === 0 && <p className="text-xs text-slate-400 py-2">Trash is empty.</p>}

            <AnimatePresence>
              {campaigns.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0 transition-colors hover:border-white/20"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-xs sm:text-sm font-semibold text-white">{c.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">Deleted {formatDate(c.deleted_at as string)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreCampaign(c)}
                      className="h-8 border-teal-500/30 bg-teal-500/10 text-xs font-semibold text-teal-300 hover:bg-teal-500/20"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCampaign(c)}
                      className="h-8 w-8 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label="Delete campaign permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* WORKFLOW DRAFTS CARD */}
      <div className="relative w-full min-w-0 group">
        <motion.div
          animate={{
            x: [-15, 15, -15],
            y: [-8, 8, -8],
            opacity: [0.2, 0.45, 0.2],
            scale: [0.98, 1.02, 0.98],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/10 to-teal-400/25 blur-xl pointer-events-none"
        />

        <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-2xl backdrop-blur-md">
          <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400">
                <GitBranch className="h-4 w-4" />
              </div>
              <span className="truncate">Workflow drafts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-2">
            {templates.length === 0 && <p className="text-xs text-slate-400 py-2">No unpublished workflows.</p>}

            <AnimatePresence>
              {templates.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0 transition-colors hover:border-white/20"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-xs sm:text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Last edited {formatDate(t.updated_at)}
                      {t.version ? ` · version ${t.version}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] text-slate-400 h-6">
                      Not published
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/admin/sop")}
                      className="h-8 border-white/10 bg-[#030d12] text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTemplate(t)}
                      className="h-8 w-8 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label="Discard workflow draft"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}