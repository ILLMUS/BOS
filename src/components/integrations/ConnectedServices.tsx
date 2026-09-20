import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail, MessageSquare, CreditCard, CalendarDays, Building2, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import WhatsAppSetupDialog from "./WhatsAppSetupDialog";
import GoogleWorkspaceCard from "./GoogleWorkspaceCard";
import AccountingSystemCard from "./AccountingSystemCard";
import CloudStorageCard from "./CloudStorageCard";
import {
  DEFAULT_WHATSAPP_CONFIG, WhatsAppConfig, loadWhatsAppConfig, whatsappLink,
} from "@/lib/whatsapp";
import { motion } from "framer-motion";

type Status = "connected" | "not_connected" | "available";

interface ServiceDef {
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  status: Status;
}

/**
 * Future-ready catalogue. Only WhatsApp Business is live today (click-to-chat);
 * everything else is explicitly marked available so the UI never claims a false connection.
 */
const SERVICES: ServiceDef[] = [
  { name: "Microsoft 365", category: "Productivity", description: "Outlook mail, OneDrive and Teams connectivity.", icon: Building2, status: "available" },
  { name: "Email Provider", category: "Communication", description: "Transactional email delivery for notifications and documents.", icon: Mail, status: "available" },
  { name: "Payment Provider", category: "Finance", description: "Collect payments against invoices raised in Finance.", icon: CreditCard, status: "available" },
  { name: "Calendars", category: "Scheduling", description: "Publish site visits, jobs and SLA deadlines to calendars.", icon: CalendarDays, status: "available" },
];

const STATUS_LABEL: Record<Status, string> = {
  connected: "Connected",
  not_connected: "Not connected",
  available: "Available",
};

export default function ConnectedServices() {
  const { orgId } = useAuth();
  const [wa, setWa] = useState<WhatsAppConfig>(DEFAULT_WHATSAPP_CONFIG);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (orgId) loadWhatsAppConfig(orgId).then(setWa).catch(() => undefined);
  }, [orgId]);

  const waActive = wa.enabled && !!wa.businessNumber;

  return (
    <div className="space-y-6 min-w-0">
      <GoogleWorkspaceCard />

      {/* WHATSAPP BUSINESS CARD */}
      <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
            >
              <MessageSquare className="h-4 w-4" />
            </motion.div>
            <span className="truncate">WhatsApp Business</span>
          </CardTitle>
          <p className="break-words text-xs text-slate-400 mt-1">
            Click-to-chat links that open WhatsApp with a prefilled message for clients and job
            updates. No API key or business verification required.
          </p>
        </CardHeader>
        <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0">
          <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="rounded-lg border border-teal-400/20 bg-teal-500/10 p-2 shrink-0">
                <MessageSquare className="h-4 w-4 text-teal-400" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <p className="font-semibold text-white truncate text-xs sm:text-sm">Client messaging</p>
                  <Badge
                    variant="outline"
                    className={waActive ? "border-teal-500/30 bg-teal-500/10 text-teal-400" : "border-slate-700 bg-slate-800 text-slate-400"}
                  >
                    {waActive ? "Connected" : "Not connected"}
                  </Badge>
                </div>
                <p className="break-words text-xs text-slate-400">
                  {waActive
                    ? `Business number ${wa.businessNumber}`
                    : "Add your business number to start chats in one tap."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0">
              {waActive && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 border-white/10 bg-[#030d12] text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  <a href={whatsappLink(wa.businessNumber, wa.defaultMessage)} target="_blank" rel="noopener noreferrer">
                    Open chat <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400"
                >
                  {waActive ? "Manage" : "Connect"}
                </Button>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CATALOGUE SERVICES CARD */}
      <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
        <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
          <CardTitle className="text-base font-bold tracking-tight text-white sm:text-lg">Other services</CardTitle>
          <p className="break-words text-xs text-slate-400 mt-0.5">
            External systems that can be connected to this workspace. None are active yet —
            connecting these is handled in a later phase.
          </p>
        </CardHeader>
        <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0">
          <div className="grid gap-3 sm:grid-cols-2 min-w-0">
            {SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.name}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0 transition-colors hover:border-white/20"
                >
                  <div className="rounded-lg bg-white/5 p-2 shrink-0 border border-white/[0.06]">
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <p className="truncate font-semibold text-white text-xs sm:text-sm">{s.name}</p>
                      <Badge variant="outline" className="border-slate-800 bg-slate-900/60 text-slate-400 shrink-0 text-[10px]">
                        {STATUS_LABEL[s.status]}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-medium text-teal-400/80 truncate">{s.category}</p>
                    <p className="break-words text-xs text-slate-400">{s.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 border-white/10 bg-white/5 text-[11px] text-slate-500 opacity-60 cursor-not-allowed"
                      disabled
                    >
                      Connect
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <WhatsAppSetupDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={setWa} />

      <AccountingSystemCard />

      <CloudStorageCard />
    </div>
  );
}