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
    <div className="space-y-6">
      <GoogleWorkspaceCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">WhatsApp Business</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click-to-chat links that open WhatsApp with a prefilled message for clients and job
            updates. No API key or business verification required.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-accent/10 p-2">
                <MessageSquare className="h-4 w-4 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Client messaging</p>
                  <Badge variant={waActive ? "default" : "outline"}>
                    {waActive ? "Connected" : "Not connected"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {waActive
                    ? `Business number ${wa.businessNumber}`
                    : "Add your business number to start chats in one tap."}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {waActive && (
                <Button asChild size="sm" variant="outline">
                  <a href={whatsappLink(wa.businessNumber, wa.defaultMessage)} target="_blank" rel="noopener noreferrer">
                    Open chat <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                {waActive ? "Manage" : "Connect"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Other services</CardTitle>
          <p className="text-sm text-muted-foreground">
            External systems that can be connected to this workspace. None are active yet —
            connecting these is handled in a later phase.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.name} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <Badge variant="outline">{STATUS_LABEL[s.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.category}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                    <Button size="sm" variant="outline" className="mt-2" disabled>
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
