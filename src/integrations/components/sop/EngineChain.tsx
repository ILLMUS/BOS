import { ENGINE_CHAIN, type EngineStep } from "@/lib/universalEngine";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Props {
  /** Steps to highlight as currently in play. */
  active?: EngineStep[];
  className?: string;
}

export default function EngineChain({ active = [], className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1", className)}>
      {ENGINE_CHAIN.map((step, idx) => (
        <span key={step.key} className="flex items-center gap-1">
          <span
            title={step.hint}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              active.includes(step.key)
                ? "bg-accent/15 text-accent"
                : "bg-muted text-muted-foreground"
            )}
          >
            {step.label}
          </span>
          {idx < ENGINE_CHAIN.length - 1 && (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
        </span>
      ))}
    </div>
  );
}
