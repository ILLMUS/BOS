import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard, EmptyState } from "./MetricCard";
import type { PersonReport } from "@/lib/reporting";

export function PeopleReport({ people, currentUserId }: { people: PersonReport[]; currentUserId?: string }) {
  const me = people.find((p) => p.userId === currentUserId);
  const maxLoad = Math.max(...people.map((p) => p.active + p.pendingApproval), 1);

  return (
    <div className="space-y-4">
      {me && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="My open work" value={me.active + me.pendingApproval} hint={`${me.pendingApproval} awaiting approval`} />
          <MetricCard label="My overdue" value={me.overdue} tone={me.overdue ? "danger" : "default"} />
          <MetricCard label="My completed steps" value={me.completed} tone="positive" />
          <MetricCard label="My on-time rate" value={me.completed ? `${me.onTimeRate}%` : "—"} hint={me.avgHours ? `${me.avgHours}h avg per step` : undefined} />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Workload distribution</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {people.length === 0 ? <EmptyState message="No work is assigned yet." /> :
            people.map((p) => (
              <div key={p.userId}>
                <div className="flex items-center justify-between text-sm">
                  <span className={p.userId === currentUserId ? "font-semibold" : "text-muted-foreground"}>{p.name}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary">{p.active + p.pendingApproval} open</Badge>
                    {p.overdue > 0 && <Badge variant="destructive">{p.overdue} late</Badge>}
                  </span>
                </div>
                <Progress value={((p.active + p.pendingApproval) / maxLoad) * 100} className="mt-1 h-2" />
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Performance</CardTitle></CardHeader>
        <CardContent className="px-0">
          {people.length === 0 ? <EmptyState message="No performance data yet." /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Avg time</TableHead>
                  <TableHead className="text-right">On time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((p) => (
                  <TableRow key={p.userId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.assigned}</TableCell>
                    <TableCell className="text-right">{p.active + p.pendingApproval}</TableCell>
                    <TableCell className="text-right">{p.completed}</TableCell>
                    <TableCell className="text-right">{p.avgHours ? `${p.avgHours}h` : "—"}</TableCell>
                    <TableCell className="text-right">{p.completed ? `${p.onTimeRate}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
