import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";

export interface DynamicStageInfo {
  id: string;
  name: string;
  status: string;
  position: number;
}

interface Props {
  stages: DynamicStageInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function DynamicPipelineBar({ stages, selectedId, onSelect }: Props) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div
        className="flex items-center gap-0.5"
        style={{ minWidth: `${Math.max(stages.length * 92, 320)}px` }}
      >
        {stages.map((s, idx) => {
          const isSelected = s.id === selectedId;
          const isCompleted = s.status === "approved";
          const isLocked = s.status === "locked";
          const isRejected = s.status === "rejected";
          const isActive = s.status === "active" || s.status === "pending_approval";

          return (
            <div key={s.id} className="flex flex-1 items-center">
              <button
                onClick={() => onSelect(s.id)}
                className={cn(
                  "relative flex w-full flex-col items-center gap-1 rounded px-1.5 py-2 text-center transition-all",
                  isSelected && "bg-accent/10 ring-2 ring-accent",
                  isCompleted && !isSelected && "bg-success/10",
                  isRejected && "bg-destructive/10",
                  isLocked && "opacity-60",
                  !isSelected && "hover:bg-muted cursor-pointer"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    isCompleted && "bg-success text-success-foreground",
                    isActive && "bg-accent text-accent-foreground",
                    isRejected && "bg-destructive text-destructive-foreground",
                    isLocked && "bg-locked text-locked-foreground",
                    !isCompleted && !isActive && !isRejected && !isLocked && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : isLocked ? <Lock className="h-3 w-3" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight",
                    isActive && "text-accent font-bold",
                    isCompleted && "text-success",
                    isLocked && "text-locked-foreground",
                    isRejected && "text-destructive"
                  )}
                >
                  {s.name}
                </span>
              </button>
              {idx < stages.length - 1 && (
                <div className={cn("h-0.5 w-3 shrink-0", isCompleted ? "bg-success" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}