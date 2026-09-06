import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature, PieChart, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/crm";

const TILES = [
  { to: "/sales/win-loss", icon: PieChart, label: "Win / loss analytics", description: "Win rate plus the reasons deals and leads are lost." },
  { to: "/sales/forecast", icon: TrendingUp, label: "Value forecast by stage", description: "Gross and probability-weighted pipeline value." },
  { to: "/sales/proposals", icon: FileSignature, label: "Proposal templates", description: "Reusable proposal wording auto-filled from an opportunity." },
];

export default function Sales() {
  const [stats, setStats] = useState({ weighted: 0, winRate: 0, open: 0 });

  useEffect(() => {
    (async () => {
      const [o, d] = await Promise.all([
        supabase.from("opportunities").select("value, probability, stage"),
        supabase.from("deals").select("status"),
      ]);
      const open = (o.data || []).filter((x) => !["won", "lost"].includes(x.stage));
      const weighted = open.reduce((s, x) => s + (Number(x.value || 0) * (x.probability ?? 0)) / 100, 0);
      const closed = (d.data || []).filter((x) => x.status !== "open");
      const won = closed.filter((x) => x.status === "won").length;
      setStats({ weighted, winRate: closed.length ? Math.round((won / closed.length) * 100) : 0, open: open.length });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Sales</h1>
        <p className="text-sm text-muted-foreground">Pipeline value, close performance and the proposals that win work.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Weighted forecast", value: formatMoney(stats.weighted), to: "/sales/forecast" },
          { label: "Win rate", value: `${stats.winRate}%`, to: "/sales/win-loss" },
          { label: "Open opportunities", value: String(stats.open), to: "/crm/opportunities" },
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
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {[
            { to: "/crm/leads", label: "Leads" },
            { to: "/crm/opportunities", label: "Opportunities" },
            { to: "/crm/deals", label: "Deals" },
            { to: "/jobs", label: "Active jobs" },
          ].map((l) => (
            <Button key={l.to} variant="outline" asChild className="justify-start"><Link to={l.to}>{l.label}</Link></Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}