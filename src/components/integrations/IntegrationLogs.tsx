import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Placeholder surface. There is no integration activity store yet, so this
 * always renders an honest empty state rather than invented entries.
 */
export default function IntegrationLogs() {
  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <ScrollText className="h-4 w-4" />
          </motion.div>
          <span className="truncate">Integration Logs</span>
        </CardTitle>
        <p className="break-words text-xs text-slate-400 mt-1">
          Activity from inbound and outbound integration traffic will appear here.
        </p>
      </CardHeader>

      <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-[#02080b]/60 px-4 py-12 text-center min-w-0">
          <div className="rounded-full border border-white/10 bg-white/5 p-3 text-slate-400">
            <ScrollText className="h-6 w-6" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-semibold text-slate-200 text-xs sm:text-sm">
              No integration activity recorded
            </p>
            <p className="max-w-md break-words text-xs text-slate-400">
              Log capture is not enabled yet. Once integrations are connected, requests, syncs and
              failures will be listed here with their timestamps and outcomes.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}