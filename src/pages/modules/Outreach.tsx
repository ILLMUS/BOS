import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellRing, Inbox, Megaphone, Target } from "lucide-react";

const TILES = [
  { to: "/outreach/forms", icon: Target, label: "Lead capture forms", description: "Public forms that create accounts, contacts and leads automatically." },
  { to: "/outreach/inbox", icon: Inbox, label: "Inbound inbox", description: "Triage submissions and route them into the pipeline." },
  { to: "/outreach/campaigns", icon: Megaphone, label: "Campaigns & sequences", description: "Target lists with multi-step outreach cadences." },
  { to: "/outreach/timeline", icon: BellRing, label: "Timeline & reminders", description: "Every touch per contact, plus follow-ups you owe." },
];

export default function Outreach() {
  const [stats, setStats] = useState({ newSubs: 0, campaigns: 0, dueFollowUps: 0 });

  useEffect(() => {
    (async () => {
      const [s, c, a] = await Promise.all([
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("activities").select("id", { count: "exact", head: true })
          .is("completed_at", null).lte("due_at", new Date().toISOString()),
      ]);
      setStats({ newSubs: s.count || 0, campaigns: c.count || 0, dueFollowUps: a.count || 0 });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Outreach</h1>
        <p className="text-sm text-muted-foreground">Top-of-funnel: lead capture, campaigns and follow-up cadences.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "New enquiries", value: stats.newSubs, to: "/outreach/inbox" },
          { label: "Active campaigns", value: stats.campaigns, to: "/outreach/campaigns" },
          { label: "Follow-ups due", value: stats.dueFollowUps, to: "/outreach/timeline" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <Link to={s.to} className="font-heading text-3xl font-bold hover:underline">{s.value}</Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TILES.map((t) => (
          <Card key={t.to}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <t.icon className="h-4 w-4 text-muted-foreground" /> {t.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <Button size="sm" variant="outline" asChild><Link to={t.to}>Open</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="font-heading text-base">Related</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            { to: "/crm/accounts", label: "Prospects & accounts" },
            { to: "/crm/leads", label: "Leads" },
            { to: "/crm/activities", label: "Tasks & follow-ups" },
          ].map((l) => (
            <Button key={l.to} variant="outline" asChild className="justify-start"><Link to={l.to}>{l.label}</Link></Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}