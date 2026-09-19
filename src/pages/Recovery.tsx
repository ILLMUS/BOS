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
import { FileClock, GitBranch, Loader2, Megaphone, RotateCcw, Trash2 } from "lucide-react";
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
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Recovery Centre</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "Nothing waiting to be recovered — everything you started has been saved or cleared."
            : `${total} item${total === 1 ? "" : "s"} you can bring back or clear out.`}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileClock className="h-4 w-4" /> Unfinished on this device
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {local.length === 0 && stageDrafts.length === 0 && (
            <p className="text-sm text-muted-foreground">No unfinished forms saved here.</p>
          )}
          {local.map((d) => (
            <div key={d.key} className="flex items-center justify-between gap-3 border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.summary}</p>
                <p className="text-xs text-muted-foreground">{d.label}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(d.to)}>Continue</Button>
                <Button size="sm" variant="ghost" onClick={() => discardLocal(d)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {stageDrafts.map((d) => (
            <div key={d.stageId} className="flex items-center justify-between gap-3 border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Job step not yet sent up</p>
                <p className="text-xs text-muted-foreground">Kept {formatDraftAge(d.savedAt)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${d.jobId}`)}>Open job</Button>
                <Button size="sm" variant="ghost" onClick={() => discardStage(d.stageId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" /> Campaigns in trash
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">Trash is empty.</p>}
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">Deleted {formatDate(c.deleted_at as string)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => restoreCampaign(c)}>
                  <RotateCcw className="mr-1 h-3 w-3" /> Restore
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteCampaign(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" /> Workflow drafts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0 && <p className="text-sm text-muted-foreground">No unpublished workflows.</p>}
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  Last edited {formatDate(t.updated_at)}
                  {t.version ? ` · version ${t.version}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Not published</Badge>
                <Button size="sm" variant="outline" onClick={() => navigate("/admin/sop")}>Open</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
