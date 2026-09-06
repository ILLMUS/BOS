import { Badge } from "@/components/ui/badge";
import { LIFECYCLE_LABELS, type LifecycleStage } from "@/lib/crm";
import { cn } from "@/lib/utils";

const TONE: Record<LifecycleStage, string> = {
  prospect: "bg-muted text-muted-foreground border-border",
  lead: "bg-accent/10 text-accent border-accent/20",
  opportunity: "bg-warning/10 text-warning border-warning/20",
  deal: "bg-primary/10 text-primary border-primary/20",
  client: "bg-success/10 text-success border-success/20",
  lost: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function LifecycleBadge({ stage, className }: { stage: LifecycleStage; className?: string }) {
  return (
    <Badge variant="outline" className={cn(TONE[stage], className)}>
      {LIFECYCLE_LABELS[stage]}
    </Badge>
  );
}
