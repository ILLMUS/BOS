import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DEAL_STATUS_LABELS, LEAD_STATUS_LABELS, OPPORTUNITY_STAGE_LABELS,
  formatDate, formatMoney, type Deal, type Lead, type Opportunity,
} from "@/lib/crm";

interface Props {
  leads: Lead[];
  opportunities: Opportunity[];
  deals: Deal[];
  onStartWork: (deal: Deal) => void;
}

export default function CommercialTab({ leads, opportunities, deals, onStartWork }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Leads</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {leads.length ? leads.map((l) => (
            <div key={l.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{l.title}</span>
                <Badge variant="outline">{LEAD_STATUS_LABELS[l.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatMoney(l.estimated_value)} · {formatDate(l.created_at)}</p>
            </div>
          )) : <p className="text-muted-foreground">None</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Opportunities</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {opportunities.length ? opportunities.map((o) => (
            <div key={o.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{o.name}</span>
                <Badge variant="outline">{OPPORTUNITY_STAGE_LABELS[o.stage]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatMoney(o.value)} · {o.probability}% · {formatDate(o.expected_close_date)}</p>
            </div>
          )) : <p className="text-muted-foreground">None</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Deals</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {deals.length ? deals.map((d) => (
            <div key={d.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{d.name}</span>
                <Badge variant="outline">{DEAL_STATUS_LABELS[d.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatMoney(d.value)} · {formatDate(d.closed_at || d.created_at)}</p>
              {d.status === "won" && !d.job_id && (
                <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => onStartWork(d)}>Start work</Button>
              )}
            </div>
          )) : <p className="text-muted-foreground">None</p>}
        </CardContent>
      </Card>
    </div>
  );
}
