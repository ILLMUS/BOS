import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/crm";
import { ArrowRight, Loader2, Mail, Phone } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Submission = Tables<"form_submissions">;

export default function OutreachInbox() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<Submission[]>([]);
  const [forms, setForms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [s, f] = await Promise.all([
      supabase.from("form_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("capture_forms").select("id,name"),
    ]);
    setRows(s.data || []);
    setForms(Object.fromEntries((f.data || []).map((x) => [x.id, x.name])));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const routeToLead = async (s: Submission) => {
    if (!orgId) return;
    setBusy(s.id);
    const { data: account, error: aErr } = await supabase
      .from("accounts")
      .insert({
        org_id: orgId,
        name: s.company || s.full_name || s.email || "Inbound enquiry",
        email: s.email, phone: s.phone, notes: s.message,
        source: forms[s.form_id] || "Inbound", lifecycle_stage: "lead", owner_id: user?.id ?? null,
      })
      .select("id").single();
    if (aErr || !account) {
      setBusy(null);
      return toast({ title: "Could not route enquiry", description: aErr?.message, variant: "destructive" });
    }
    let contactId: string | null = null;
    if (s.full_name || s.email) {
      const { data: c } = await supabase.from("contacts").insert({
        org_id: orgId, account_id: account.id, full_name: s.full_name || s.email || "Contact",
        email: s.email, phone: s.phone, is_primary: true,
      }).select("id").single();
      contactId = c?.id ?? null;
    }
    const { data: lead } = await supabase.from("leads").insert({
      org_id: orgId, account_id: account.id, contact_id: contactId,
      title: `${s.company || s.full_name || "Inbound"} - ${forms[s.form_id] || "enquiry"}`,
      description: s.message, source: forms[s.form_id] || "Inbound", status: "new",
      owner_id: user?.id ?? null, created_by: user?.id ?? null,
    }).select("id").single();
    await supabase.from("form_submissions").update({
      status: "routed", account_id: account.id, contact_id: contactId, lead_id: lead?.id ?? null,
    }).eq("id", s.id);
    setBusy(null);
    toast({ title: "Routed to the pipeline", description: "Account, contact and lead created." });
    load();
  };

  const dismiss = async (id: string) => {
    await supabase.from("form_submissions").update({ status: "dismissed" }).eq("id", id);
    load();
  };

  const List = ({ items }: { items: Submission[] }) => (
    <div className="space-y-3">
      {!items.length && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      {items.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.full_name || s.company || s.email || "Anonymous"}</span>
                <Badge variant="outline">{forms[s.form_id] || "Form"}</Badge>
                {s.status === "routed" && <Badge className="bg-primary/10 text-primary" variant="outline">Routed</Badge>}
                {s.status === "dismissed" && <Badge variant="outline">Dismissed</Badge>}
              </div>
              {s.company && s.full_name && <p className="text-sm text-muted-foreground">{s.company}</p>}
              {s.message && <p className="text-sm">{s.message}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                <span>{formatDate(s.created_at)}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {s.status === "new" && (
                <>
                  <Button size="sm" onClick={() => routeToLead(s)} disabled={busy === s.id}>
                    {busy === s.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1 h-4 w-4" />} Route to lead
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss(s.id)}>Dismiss</Button>
                </>
              )}
              {s.account_id && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/crm/accounts/${s.account_id}`}>Open account</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Inbound inbox</h1>
        <p className="text-sm text-muted-foreground">Every capture-form submission, and where it landed in the pipeline.</p>
      </div>
      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">New ({rows.filter((r) => r.status === "new").length})</TabsTrigger>
          <TabsTrigger value="routed">Routed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-4"><List items={rows.filter((r) => r.status === "new")} /></TabsContent>
        <TabsContent value="routed" className="mt-4"><List items={rows.filter((r) => r.status === "routed")} /></TabsContent>
        <TabsContent value="all" className="mt-4"><List items={rows} /></TabsContent>
      </Tabs>
    </div>
  );
}