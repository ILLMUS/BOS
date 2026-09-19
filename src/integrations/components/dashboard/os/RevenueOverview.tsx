import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Panel, { EmptyNote, PanelPill } from "./Panel";

export interface RevenuePoint {
  month: string;
  value: number;
}

export default function RevenueOverview({ data, currency }: { data: RevenuePoint[]; currency: string }) {
  const empty = data.every((d) => d.value === 0);

  return (
    <Panel title="Revenue Overview" action={<PanelPill>This Year</PanelPill>}>
      {empty ? (
        <EmptyNote>No payments recorded yet this year.</EmptyNote>
      ) : (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-6))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--chart-6))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `${currency}${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
              />
              <Tooltip
                formatter={(v: number) => [`${currency}${v.toLocaleString()}`, "Revenue"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-6))"
                strokeWidth={2}
                fill="url(#revFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
