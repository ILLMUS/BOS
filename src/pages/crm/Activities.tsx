import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ACTIVITY_TYPE_LABELS, formatDateTime, type Activity } from "@/lib/crm";
import { CheckCircle2, Loader2, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";

/* -------------------------------------------------------
   BUSINESS OS GLASS CARD CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[14px]
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.24)]
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />
      {children}
    </div>
  );
}

export default function Activities() {
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("activities").select("*").order("due_at", { ascending: true, nullsFirst: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const complete = async (id: string) => {
    await supabase.from("activities").update({ completed_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const now = Date.now();
  const openItems = rows.filter((r) => !r.completed_at);
  const overdue = openItems.filter((r) => r.due_at && new Date(r.due_at).getTime() < now);
  const done = rows.filter((r) => r.completed_at);

  const List = ({ items }: { items: Activity[] }) => (
    <div className="space-y-2.5 min-w-0">
      {!items.length && (
        <p className="py-8 text-center text-[11px] text-slate-500">Nothing here.</p>
      )}
      {items.map((a) => (
        <div
          key={a.id}
          className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0b0e14] p-3.5 min-w-0 transition-all duration-200 hover:border-white/[0.15]"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-[10px] font-semibold shrink-0">
                {ACTIVITY_TYPE_LABELS[a.type]}
              </Badge>
              <span className="text-xs font-semibold text-slate-100 truncate">{a.subject}</span>
              {a.due_at && !a.completed_at && new Date(a.due_at).getTime() < now && (
                <Badge variant="outline" className="border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px] font-semibold shrink-0">
                  Overdue
                </Badge>
              )}
            </div>
            {a.body && <p className="text-[11px] text-slate-300 break-words">{a.body}</p>}
            <p className="text-[10px] text-slate-400">
              {a.due_at ? `Due ${formatDateTime(a.due_at)}` : `Logged ${formatDateTime(a.created_at)}`}
            </p>
          </div>
          {!a.completed_at && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => complete(a.id)}
              className="h-7 shrink-0 border-cyan-400/30 bg-cyan-400/10 text-[10px] font-bold text-cyan-300 hover:bg-cyan-400/20 self-end sm:self-auto"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Complete
            </Button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 text-slate-200 min-w-0 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] pb-4 min-w-0">
        <div>
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white sm:text-2xl min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 text-cyan-400"
            >
              <CalendarCheck className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Activities & follow-ups</span>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400 break-words">
            Every call, meeting, note and follow-up across the lifecycle.
          </p>
        </div>
      </div>

      <GlassCard>
        {/* CARD HEADER */}
        <div className="border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace activity
          </span>
        </div>

        {/* CARD CONTENT & TABS */}
        <div className="p-6 min-w-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-[11px] text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
              Loading activities...
            </div>
          ) : (
            <Tabs defaultValue="open" className="w-full min-w-0">
              <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0b0e14] p-1.5 min-w-0">
                <TabsTrigger
                  value="open"
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition-all data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 shrink-0"
                >
                  Open ({openItems.length})
                </TabsTrigger>
                <TabsTrigger
                  value="overdue"
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition-all data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 shrink-0"
                >
                  Overdue ({overdue.length})
                </TabsTrigger>
                <TabsTrigger
                  value="done"
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition-all data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 shrink-0"
                >
                  Completed ({done.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="open" className="mt-4 focus-visible:outline-none min-w-0"><List items={openItems} /></TabsContent>
              <TabsContent value="overdue" className="mt-4 focus-visible:outline-none min-w-0"><List items={overdue} /></TabsContent>
              <TabsContent value="done" className="mt-4 focus-visible:outline-none min-w-0"><List items={done} /></TabsContent>
            </Tabs>
          )}
        </div>
      </GlassCard>
    </div>
  );
}