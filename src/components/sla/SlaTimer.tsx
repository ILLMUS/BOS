import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlaTimerProps {
  slaDeadlineHours: number | null;
  slaStartedAt: string | null;
  status: string;
}

function getTimeRemaining(slaDeadlineHours: number, slaStartedAt: string) {
  const deadline = new Date(slaStartedAt).getTime() + slaDeadlineHours * 60 * 60 * 1000;
  const now = Date.now();
  const diff = deadline - now;
  return diff;
}

function formatDuration(ms: number) {
  const absMs = Math.abs(ms);
  const hours = Math.floor(absMs / (1000 * 60 * 60));
  const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export default function SlaTimer({ slaDeadlineHours, slaStartedAt, status }: SlaTimerProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status !== "active" || !slaStartedAt || !slaDeadlineHours) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [status, slaStartedAt, slaDeadlineHours]);

  if (!slaDeadlineHours || !slaStartedAt || status !== "active") return null;

  const remaining = getTimeRemaining(slaDeadlineHours, slaStartedAt);
  const isOverdue = remaining < 0;
  const isWarning = remaining > 0 && remaining < slaDeadlineHours * 0.25 * 60 * 60 * 1000;

  const pctUsed = Math.min(100, Math.max(0, 
    ((slaDeadlineHours * 60 * 60 * 1000 - remaining) / (slaDeadlineHours * 60 * 60 * 1000)) * 100
  ));

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        isOverdue && "border-destructive/50 bg-destructive/5 text-destructive",
        isWarning && "border-warning/50 bg-warning/5 text-warning",
        !isOverdue && !isWarning && "border-border bg-muted/30 text-muted-foreground"
      )}
    >
      {isOverdue ? (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      ) : (
        <Clock className="h-4 w-4 shrink-0" />
      )}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {isOverdue ? `Overdue by ${formatDuration(remaining)}` : `${formatDuration(remaining)} remaining`}
          </span>
          <span className="text-xs opacity-70">SLA: {slaDeadlineHours}h</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isOverdue && "bg-destructive",
              isWarning && "bg-warning",
              !isOverdue && !isWarning && "bg-accent"
            )}
            style={{ width: `${Math.min(pctUsed, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
