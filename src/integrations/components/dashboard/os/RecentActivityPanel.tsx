import Panel, { EmptyNote } from "./Panel";
import { useNavigate } from "react-router-dom";

export interface ActivityRow {
  id: string;
  text: string;
  meta: string;
  jobId: string | null;
  tone: string;
}

export default function RecentActivityPanel({ rows }: { rows: ActivityRow[] }) {
  const navigate = useNavigate();

  return (
    <Panel
      title="Recent Activity"
      action={
        <button onClick={() => navigate("/admin/reports")} className="text-xs font-medium text-primary hover:underline">
          View all activity
        </button>
      }
    >
      {rows.length === 0 ? (
        <EmptyNote>No activity recorded yet.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 6).map((r) => (
            <li key={r.id} className="flex items-start gap-2.5">
              <span className="mt-1 h-6 w-6 shrink-0 rounded-full" style={{ backgroundColor: r.tone }} />
              <button
                onClick={() => r.jobId && navigate(`/jobs/${r.jobId}`)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-[13px] font-medium">{r.text}</p>
                <p className="truncate text-[11px] text-muted-foreground">{r.meta}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
