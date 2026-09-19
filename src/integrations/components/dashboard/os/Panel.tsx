import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export default function Panel({ title, action, className, bodyClassName, children }: PanelProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-border bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <h2 className="font-heading text-[15px] font-bold tracking-tight">{title}</h2>
        {action}
      </header>
      <div className={cn("flex-1 px-4 pb-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PanelPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-[13px] text-muted-foreground">{children}</p>;
}
