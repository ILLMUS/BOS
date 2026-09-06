import { useNavigate } from "react-router-dom";
import Panel, { EmptyNote, PanelPill } from "./Panel";

export interface BoardJob {
  id: string;
  job_number: string;
  title: string;
  client: string;
}

export interface BoardColumn {
  name: string;
  tint: string;
  jobs: BoardJob[];
}

const INITIAL_TINTS = ["bg-chart-6", "bg-chart-2", "bg-chart-1", "bg-chart-3", "bg-chart-4"];

export default function JobPipelineBoard({ columns }: { columns: BoardColumn[] }) {
  const navigate = useNavigate();
  const total = columns.reduce((n, c) => n + c.jobs.length, 0);

  return (
    <Panel title="Job Pipeline (SOP)" action={<PanelPill>All Workflows</PanelPill>} bodyClassName="px-4 pb-4">
      {total === 0 ? (
        <EmptyNote>No active work items in the pipeline yet.</EmptyNote>
      ) : (
        <div className="thin-scroll flex gap-3 overflow-x-auto pb-1">
          {columns.map((col) => (
            <div key={col.name} className="w-[190px] shrink-0">
              <div className={`${col.tint} rounded-lg py-2 text-center text-[13px] font-semibold text-white`}>
                {col.name}
              </div>
              <p className="py-2 text-center font-heading text-xl font-bold">{col.jobs.length}</p>
              <div className="space-y-2">
                {col.jobs.slice(0, 2).map((j) => (
                  <button
                    key={j.id}
                    onClick={() => navigate(`/jobs/${j.id}`)}
                    className="w-full rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <p className="text-[11px] font-semibold text-muted-foreground">{j.job_number}</p>
                    <p className="truncate text-[13px] font-semibold">{j.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">Client: {j.client}</p>
                  </button>
                ))}
                {col.jobs.length > 2 && (
                  <button
                    onClick={() => navigate("/jobs")}
                    className="w-full py-1 text-center text-xs font-medium text-primary hover:underline"
                  >
                    View all ({col.jobs.length})
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export { INITIAL_TINTS };
