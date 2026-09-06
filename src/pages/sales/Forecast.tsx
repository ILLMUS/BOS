import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OPPORTUNITY_STAGE_LABELS, formatMoney, formatDate } from "@/lib/crm";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";

type Opportunity = Tables<"opportunities">;
type Stage = Enums<"opportunity_stage">;

const OPEN_STAGES: Stage[] = ["discovery", "scoping", "proposal", "negotiation"];

const HORIZONS = [
  { key: "30", label: "Next 30 days" },
  { key: "90", label: "Next 90 days" },
  { key: "all", label: "All open work" },
];

export default function Forecast() {
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState("90");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("opportunities").select("*").order("expected_close_date", { ascending: true });
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const open = useMemo(() => {
    const cutoff = horizon === "all" ? null : (() => { const d = new Date(); d.setDate(d.getDate() + Number(horizon)); return d; })();
    return rows.filter((o) => {
      if (!OPEN_STAGES.includes(o.stage)) return false;
      if (!cutoff) return true;
      if (!o.expected_close_date) return false;
      return new Date(o.expected_close_date) <= cutoff;
    });
  }, [rows, horizon]);

  const byStage = useMemo(() => OPEN_STAGES.map((stage) => {
    const items = open.filter((o) => o.stage === stage);
    const gross = items.reduce((s, o) => s + Number(o.value || 0), 0);
    const weighted = items.reduce((s, o) => s + (Number(o.value || 0) * (o.probability ?? 0)) / 100, 0);
    return { stage, count: items.length, gross, weighted };
  }), [open]);

  const totalGross = byStage.reduce((s, r) => s + r.gross, 0);
  const totalWeighted = byStage.reduce((s, r) => s + r.weighted, 0);
  const maxGross = Math.max(1, ...byStage.map((r) => r.gross));

  const overdue = open.filter((o) => o.expected_close_date && new Date(o.expected_close_date) < new Date());
  const unscheduled = open.filter((o) => !o.expected_close_date).length;

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Value forecast by stage</h1>
          <p className="text-sm text-muted-foreground">Pipeline value weighted by each opportunity's probability.</p>
        </div>
        <Select value={horizon} onValueChange={setHorizon}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {HORIZONS.map((h) => <SelectItem key={h.key} value={h.key}>{h.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open opportunities", value: String(open.length) },
          { label: "Gross pipeline", value: formatMoney(totalGross) },
          { label: "Weighted forecast", value: formatMoney(totalWeighted) },
          { label: "No close date", value: String(unscheduled) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="font-heading text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="font-heading text-base">Stage breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {byStage.map((r) => (
            <div key={r.stage} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{OPPORTUNITY_STAGE_LABELS[r.stage]} <span className="text-muted-foreground">({r.count})</span></span>
                <span className="text-muted-foreground">{formatMoney(r.gross)} gross · <span className="text-foreground">{formatMoney(r.weighted)} weighted</span></span>
              </div>
              <Progress value={(r.gross / maxGross) * 100} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="font-heading text-base">Slipping — close date passed</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {overdue.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue. Good.</p>}
          {overdue.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{o.name}</p>
                <p className="text-xs text-muted-foreground">Expected {formatDate(o.expected_close_date)} · {o.probability}% likely</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{formatMoney(o.value)}</span>
                <Badge variant="outline">{OPPORTUNITY_STAGE_LABELS[o.stage]}</Badge>
              </div>
            </div>
          ))}
          <Link to="/crm/opportunities" className="inline-block pt-2 text-sm underline">Open the opportunity pipeline</Link>
        </CardContent>
      </Card>
    </div>
  );
}