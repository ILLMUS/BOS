import Panel, { EmptyNote, PanelPill } from "./Panel";
import { cn } from "@/lib/utils";

export interface WorkflowRow {
  name: string;
  active: number;
  completed: number;
  compliance: number;
}

export default function WorkflowPerformance({ rows }: { rows: WorkflowRow[] }) {
  return (
    <Panel title="Workflow Performance" action={<PanelPill>This Month</PanelPill>} bodyClassName="px-0 pb-3">
      {rows.length === 0 ? (
        <EmptyNote>No workflows have run yet.</EmptyNote>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-y border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Workflow</th>
              <th className="px-2 py-2 text-right font-medium">Active Jobs</th>
              <th className="px-2 py-2 text-right font-medium">Completed</th>
              <th className="px-4 py-2 text-right font-medium">SLA Compliance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.name}-${i}`} className="border-b border-border/60 last:border-0">
                <td className="truncate px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-2 py-2.5 text-right">{r.active}</td>
                <td className="px-2 py-2.5 text-right">{r.completed}</td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right font-semibold",
                    r.compliance >= 90 ? "text-success" : r.compliance >= 75 ? "text-warning" : "text-destructive"
                  )}
                >
                  {r.compliance}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
