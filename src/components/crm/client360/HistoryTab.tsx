import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActivityPanel from "@/components/crm/ActivityPanel";
import { formatDate } from "@/lib/crm";
import type { Client360Data } from "@/hooks/useClient360";

interface Props extends Pick<Client360Data, "audit" | "jobs"> { accountId: string }

/** Support & relationship history: logged interactions plus the operational audit trail. */
export default function HistoryTab({ audit, jobs, accountId }: Props) {
  const jobNumber = (id: string | null) => jobs.find((j) => j.id === id)?.job_number || "—";

  return (
    <div className="space-y-6">
      <ActivityPanel link={{ account_id: accountId }} title="Support & interaction history" />
      <Card>
        <CardHeader><CardTitle className="text-base">Operational audit trail</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.length ? audit.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <span>{jobNumber(a.job_id)} · {a.action.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
            </div>
          )) : <p className="text-muted-foreground">No audit entries.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
