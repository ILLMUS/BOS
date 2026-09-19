import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import Panel, { EmptyNote, PanelPill } from "./Panel";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  suffix?: string;
}

interface Props {
  title: string;
  pill?: string;
  centerValue: string;
  centerLabel: string;
  slices: DonutSlice[];
}

export default function DonutStat({ title, pill, centerValue, centerLabel, slices }: Props) {
  const total = slices.reduce((n, s) => n + s.value, 0);

  return (
    <Panel title={title} action={pill ? <PanelPill>{pill}</PanelPill> : undefined}>
      {total === 0 ? (
        <EmptyNote>No data for this period yet.</EmptyNote>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-[150px] w-[150px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={1}
                  stroke="none"
                >
                  {slices.map((s) => (
                    <Cell key={s.label} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-xl font-bold">{centerValue}</span>
              <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-2.5">
            {slices.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-[13px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="flex-1 truncate text-muted-foreground">{s.label}</span>
                <span className="font-semibold">
                  {s.value}
                  {s.suffix ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
