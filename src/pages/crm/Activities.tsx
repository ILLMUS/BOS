import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ACTIVITY_TYPE_LABELS, formatDate, type Activity } from "@/lib/crm";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function Activities() {
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("activities").select("*").order("due_at", { ascending: true, nullsFirst: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const complete = async (id: string) => {
    await supabase.from("activities").update({ completed_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const now = Date.now();
  const openItems = rows.filter((r) => !r.completed_at);
  const overdue = openItems.filter((r) => r.due_at && new Date(r.due_at).getTime() < now);
  const done = rows.filter((r) => r.completed_at);

  const List = ({ items }: { items: Activity[] }) => (
    <div className="space-y-2">
      {!items.length && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      {items.map((a) => (
        <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{ACTIVITY_TYPE_LABELS[a.type]}</Badge>
              <span className="font-medium">{a.subject}</span>
              {a.due_at && !a.completed_at && new Date(a.due_at).getTime() < now && (
                <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">Overdue</Badge>
              )}
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
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Activities & follow-ups</h1>
        <p className="text-sm text-muted-foreground">Every call, meeting, note and follow-up across the lifecycle.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Workspace activity</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : (
            <Tabs defaultValue="open">
              <TabsList>
                <TabsTrigger value="open">Open ({openItems.length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
                <TabsTrigger value="done">Completed ({done.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="open" className="mt-4"><List items={openItems} /></TabsContent>
              <TabsContent value="overdue" className="mt-4"><List items={overdue} /></TabsContent>
              <TabsContent value="done" className="mt-4"><List items={done} /></TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
