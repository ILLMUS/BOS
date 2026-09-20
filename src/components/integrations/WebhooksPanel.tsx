import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Webhook, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Structure only. Outbound/inbound webhook delivery is not implemented yet —
 * the only live inbound endpoint today is the Quote Builder API, managed under
 * the API Provider tab.
 */
export default function WebhooksPanel() {
  return (
    <div className="space-y-6 min-w-0">
      {/* OUTBOUND WEBHOOKS CARD */}
      <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
            >
              <ArrowUpFromLine className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Outbound webhooks</span>
          </CardTitle>
          <p className="break-words text-xs text-slate-400 mt-1">
            Notify external systems when work, approvals or finance records change.
          </p>
        </CardHeader>
        <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-[#02080b]/60 px-4 py-10 text-center min-w-0">
            <div className="rounded-full border border-white/10 bg-white/5 p-3 text-slate-400">
              <Webhook className="h-6 w-6" />
            </div>
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-slate-200 text-xs sm:text-sm">
                No outbound webhooks configured
              </p>
              <p className="break-words text-xs text-slate-400">
                Webhook delivery is not enabled for this workspace yet.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled
              className="mt-1 h-8 border-white/10 bg-white/5 text-xs text-slate-500 opacity-60 cursor-not-allowed"
            >
              Add webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* INBOUND ENDPOINTS CARD */}
      <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
            >
              <ArrowDownToLine className="h-4 w-4" />
            </motion.div>
            <span className="truncate">Inbound endpoints</span>
          </CardTitle>
          <p className="break-words text-xs text-slate-400 mt-1">
            Endpoints external systems can push data into.
          </p>
        </CardHeader>
        <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-3">
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold text-white truncate text-xs sm:text-sm">
                Quote Builder API
              </p>
              <p className="break-words text-xs text-slate-400">
                Receives quotes, invoices and receipts from the external document builder.
              </p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 self-start sm:self-auto border-teal-500/30 bg-teal-500/10 text-teal-400 text-[10px] font-semibold"
            >
              Active
            </Badge>
          </div>
          <p className="break-words text-[11px] text-slate-400">
            Manage its keys and base URL under the API Provider tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}