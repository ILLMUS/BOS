import { useNavigate } from "react-router-dom";
import Panel, { EmptyNote } from "./Panel";
import { cn } from "@/lib/utils";

export interface AssignmentRow {
  id: string;
  jobId: string;
  stage: string;
  jobNumber: string;
  client: string;
  due: string | null;
  priority: "High" | "Medium" | "Low";
}

const PRIORITY: Record<AssignmentRow["priority"], string> = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-warning/15 text-warning",
  Low: "bg-chart-1/10 text-chart-1",
};

export default function MyAssignments({ rows }: { rows: AssignmentRow[] }) {
  const navigate = useNavigate();

  return (
    <Panel
      title="My Assignments"
      action={
        <button onClick={() => navigate("/jobs")} className="text-xs font-medium text-primary hover:underline">
          View all
        </button>
      }
      bodyClassName="px-3 pb-4"
    >
      {rows.length === 0 ? (
        <EmptyNote>Nothing assigned to you right now.</EmptyNote>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 5).map((r) => (
            <li key={r.id}>
              <button
                onClick={() => navigate(`/jobs/${r.jobId}`)}
                className="flex w-full items-start justify-between gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{r.stage}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Job: {r.jobNumber} | {r.client}
                  </p>
                  {r.due && <p className="text-[11px] text-muted-foreground">Due: {r.due}</p>}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    PRIORITY[r.priority]
                  )}
                >
                  {r.priority}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
