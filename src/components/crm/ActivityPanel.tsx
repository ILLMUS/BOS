import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ACTIVITY_TYPE_LABELS, formatDate, type Activity, type ActivityType } from "@/lib/crm";
import { CheckCircle2, Loader2, Plus } from "lucide-react";

export type ActivityLink = Partial<
  Record<"account_id" | "contact_id" | "lead_id" | "opportunity_id" | "deal_id" | "job_id", string>
>;

/** Activities + follow-ups attached to any lifecycle record. */
export default function ActivityPanel({ link, title = "Activities & follow-ups" }: { link: ActivityLink; title?: string }) {
  const { orgId, user } = useAuth();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<ActivityType>("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");

  const key = JSON.stringify(link);

  const load = useCallback(async () => {
    const entries = Object.entries(link).filter(([, v]) => !!v);
    if (!entries.length) return;
    let query = supabase.from("activities").select("*").order("created_at", { ascending: false });
    for (const [col, val] of entries) query = query.eq(col as never, val as never);
    const { data } = await query;
    setItems(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!subject.trim() || !orgId) return;
    setSaving(true);
    const { error } = await supabase.from("activities").insert({
      org_id: orgId,
      ...link,
      type,
      subject: subject.trim(),
      body: body.trim() || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      assigned_to: user?.id ?? null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save activity", description: error.message, variant: "destructive" });
      return;
    }
    setSubject("");
    setBody("");
    setDueAt("");
    load();
  };

  const complete = async (id: string) => {
    await supabase.from("activities").update({ completed_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[140px_1fr_180px]">
          <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ACTIVITY_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
        <Textarea placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
        <Button onClick={add} disabled={saving || !subject.trim()} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Log activity
        </Button>

        <div className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && !items.length && <p className="text-sm text-muted-foreground">Nothing logged yet.</p>}
          {items.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{ACTIVITY_TYPE_LABELS[a.type]}</Badge>
                  <span className="font-medium">{a.subject}</span>
                  {a.completed_at && <Badge variant="outline" className="bg-success/10 text-success border-success/20">Done</Badge>}
                </div>
                {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.due_at ? `Due ${formatDate(a.due_at)}` : `Logged ${formatDate(a.created_at)}`}
                </p>
              </div>
              {!a.completed_at && (
                <Button variant="ghost" size="sm" onClick={() => complete(a.id)}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
