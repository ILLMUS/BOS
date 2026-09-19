import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Kpi {
  label: string;
  hint?: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  icon: React.ElementType;
  tone: "violet" | "green" | "blue" | "amber" | "sky";
}

const TONES: Record<Kpi["tone"], string> = {
  violet: "bg-chart-6/10 text-chart-6",
  green: "bg-chart-2/10 text-chart-2",
  blue: "bg-chart-1/10 text-chart-1",
  amber: "bg-chart-4/10 text-chart-4",
  sky: "bg-chart-1/10 text-chart-1",
};

export default function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((k) => {
        const up = (k.delta ?? 0) >= 0;
        return (
          <div
            key={k.label}
            className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-muted-foreground">
                  {k.label}{" "}
                  {k.hint && <span className="text-muted-foreground/70">({k.hint})</span>}
                </p>
                <p className="mt-2 font-heading text-[26px] font-bold leading-none tracking-tight">{k.value}</p>
              </div>
              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", TONES[k.tone])}>
                <k.icon className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
            {k.delta !== null && k.delta !== undefined && (
              <p className="mt-3 flex items-center gap-1 text-xs">
                <span className={cn("inline-flex items-center font-semibold", up ? "text-success" : "text-destructive")}>
                  {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(k.delta).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">{k.deltaLabel ?? "vs last month"}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
