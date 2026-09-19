import { STAGE_LABELS, STAGE_ORDER, getStageIndex } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type JobStage = Database["public"]["Enums"]["job_stage"];
type StageStatus = Database["public"]["Enums"]["stage_status"];

interface StageInfo {
  stage: JobStage;
  status: StageStatus;
}

interface PipelineBarProps {
  stages: StageInfo[];
  currentStage: JobStage;
  onStageClick?: (stage: JobStage) => void;
}

export default function PipelineBar({ stages, currentStage, onStageClick }: PipelineBarProps) {
  const currentIdx = getStageIndex(currentStage);

  const getStatusForStage = (stage: JobStage): StageStatus => {
    const found = stages.find((s) => s.stage === stage);
    return found?.status ?? "locked";
  };

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex min-w-[800px] items-center gap-0.5">
        {STAGE_ORDER.map((stage, idx) => {
          const status = getStatusForStage(stage);
          const isCurrent = stage === currentStage;
          const isCompleted = status === "approved";
          const isLocked = status === "locked";
          const isRejected = status === "rejected";

          return (
            <div key={stage} className="flex flex-1 items-center">
              <button
                disabled={isLocked}
                onClick={() => onStageClick?.(stage)}
                className={cn(
                  "relative flex w-full flex-col items-center gap-1 rounded px-1.5 py-2 text-center transition-all",
                  isCurrent && "bg-accent/10 ring-2 ring-accent",
                  isCompleted && "bg-success/10",
                  isRejected && "bg-destructive/10",
                  isLocked && "cursor-not-allowed opacity-50",
                  !isLocked && !isCurrent && "hover:bg-muted cursor-pointer"
                )}
              >
                {/* Step indicator */}
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    isCompleted && "bg-success text-success-foreground",
                    isCurrent && "bg-accent text-accent-foreground",
                    isRejected && "bg-destructive text-destructive-foreground",
                    isLocked && "bg-locked text-locked-foreground",
                    !isCompleted && !isCurrent && !isRejected && !isLocked && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight",
                    isCurrent && "text-accent font-bold",
                    isCompleted && "text-success",
                    isLocked && "text-locked-foreground",
                    isRejected && "text-destructive"
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </button>

              {/* Connector line */}
              {idx < STAGE_ORDER.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-3 shrink-0",
                    getStageIndex(stage) < currentIdx ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
