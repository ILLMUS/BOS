import Panel, { EmptyNote, PanelPill } from "./Panel";

export interface FunnelRow {
  label: string;
  value: number;
  caption: string;
  color: string;
}

interface Props {
  rows: FunnelRow[];
  pipelineValue: string;
}

export default function PipelineFunnel({ rows, pipelineValue }: Props) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const empty = rows.every((r) => r.value === 0);

  return (
    <Panel title="Pipeline Overview" action={<PanelPill>Sales Pipeline</PanelPill>}>
      {empty ? (
        <EmptyNote>No work items yet — your funnel fills up as jobs are created.</EmptyNote>
      ) : (
        <div className="flex items-start gap-4">
          <div className="flex flex-1 flex-col items-center gap-1">
            {rows.map((r, i) => {
              const width = 100 - (i * 55) / Math.max(rows.length - 1, 1);
              return (
                <div
                  key={r.label}
                  className="flex h-11 items-center justify-center text-sm font-bold text-white"
                  style={{
                    width: `${Math.max(width, 42)}%`,
                    backgroundColor: r.color,
                    clipPath: "polygon(0 0, 100% 0, 94% 100%, 6% 100%)",
                  }}
                >
                  {r.value}
                </div>
              );
            })}
            <div className="mt-1 flex h-10 w-[42%] items-center justify-center rounded-b-md bg-chart-6 text-[13px] font-bold text-white">
              {pipelineValue}
            </div>
          </div>

          <ul className="w-[45%] space-y-3 pt-1">
            {rows.map((r) => (
              <li key={r.label}>
                <p className="text-[13px] font-semibold leading-tight">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.caption}</p>
              </li>
            ))}
            <li>
              <p className="text-[13px] font-semibold leading-tight">Pipeline Value</p>
              <p className="text-xs text-muted-foreground">{pipelineValue} recorded</p>
            </li>
          </ul>
        </div>
      )}
    </Panel>
  );
}
