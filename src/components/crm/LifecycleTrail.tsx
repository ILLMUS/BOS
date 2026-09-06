import { Check, ChevronRight } from "lucide-react";
import { LIFECYCLE_LABELS, type LifecycleStage } from "@/lib/crm";
import { cn } from "@/lib/utils";

interface Props {
  stage: LifecycleStage;
  hasWork?: boolean;
}

const ORDER: LifecycleStage[] = ["prospect", "lead", "opportunity", "deal", "client"];

/** Account-level progress strip: prospect → lead → opportunity → deal → client → work. */
export default function LifecycleTrail({ stage, hasWork = false }: Props) {
  const lost = stage === "lost";
  const activeIndex = lost ? -1 : ORDER.indexOf(stage);

  const steps = [
    ...ORDER.map((s, i) => ({
      key: s,
      label: LIFECYCLE_LABELS[s],
      done: activeIndex > i,
      current: activeIndex === i,
    })),
    { key: "work", label: "Work", done: hasWork, current: false },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      {lost && <span className="text-destructive">Marked as lost</span>}
      {steps.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span
            className={cn(
              "flex items-center gap-1 rounded border px-2 py-1 text-xs",
              s.current
                ? "border-accent bg-accent/10 font-medium text-foreground"
                : s.done
                  ? "border-border text-foreground"
                  : "border-dashed border-border text-muted-foreground",
            )}
          >
            {s.done && <Check className="h-3 w-3 text-accent" />}
            {s.label}
          </span>
        </span>
      ))}
    </div>
  );
}
