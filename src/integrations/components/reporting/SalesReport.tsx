import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard, EmptyState } from "./MetricCard";
import { money, type SalesReport as SalesData } from "@/lib/reporting";

export function SalesReport({ data }: { data: SalesData }) {
  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Leads" value={data.leadsTotal} hint={`${data.qualified} qualified`} />
        <MetricCard label="Lead conversion" value={`${data.leadConversionRate}%`} hint={`${data.converted} converted`} />
        <MetricCard label="Weighted pipeline" value={money(data.weightedPipeline)} hint={`${data.opportunitiesTotal} opportunities`} />
        <MetricCard label="Win rate" value={`${data.winRate}%`} hint={`${data.dealsWon} won / ${data.dealsLost} lost`} tone={data.winRate >= 50 ? "positive" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Conversion funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.funnel.every((f) => f.count === 0) ? (
              <EmptyState message="No sales records in this period yet." />
            ) : data.funnel.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-semibold">
                    {f.count}{f.value > 0 && <span className="ml-2 text-xs text-muted-foreground">{money(f.value)}</span>}
                  </span>
                </div>
                <Progress value={(f.count / maxFunnel) * 100} className="mt-1 h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Opportunity pipeline by stage</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.opportunitiesTotal === 0 ? (
              <EmptyState message="No opportunities recorded." />
            ) : data.opportunitiesByStage.filter((s) => s.count > 0).map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{s.count}</Badge>
                  <span className="font-medium">{money(s.value)}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Deals</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Open" value={`${data.dealsOpen}`} sub={money(data.openValue)} />
            <Stat label="Won" value={`${data.dealsWon}`} sub={money(data.wonValue)} />
            <Stat label="Lost" value={`${data.dealsLost}`} sub={money(data.lostValue)} />
            <Stat label="Avg won deal" value={money(data.avgDealValue)} sub="per closed deal" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lead sources & lost reasons</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Sources</p>
              {data.sources.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> :
                data.sources.slice(0, 6).map((s) => (
                  <div key={s.source} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{s.source}</span><span>{s.count}</span>
                  </div>
                ))}
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Lost reasons</p>
              {data.lostReasons.length === 0 ? <p className="text-sm text-muted-foreground">No lost deals.</p> :
                data.lostReasons.slice(0, 6).map((s) => (
                  <div key={s.reason} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{s.reason}</span><span>{s.count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
