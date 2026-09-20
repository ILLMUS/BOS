import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plug,
  Key,
  Globe,
  Webhook,
  Activity,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import ApiKeyManager from "@/components/admin/ApiKeyManager";
import ConnectedServices from "@/components/integrations/ConnectedServices";
import WebhooksPanel from "@/components/integrations/WebhooksPanel";
import IntegrationLogs from "@/components/integrations/IntegrationLogs";

/** Integration Center — where this workspace connects to external systems. */
export default function Integrations() {
  const { isAdmin, orgId, hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const [activeTab, setActiveTab] = useState("api");

  if (!isAdmin && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (!orgId) return <Navigate to="/onboarding" replace />;

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 space-y-6 px-4 sm:px-6 md:space-y-8">
      {/* =========================================================
          PAGE HEADER / QUICK START CARD (MOBILE CONTAINER CONTAINED)
      ========================================================== */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-[#05131a]/90 via-[#030d12] to-[#02080b] p-4 shadow-xl shadow-teal-950/20 backdrop-blur-md sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-400/30 bg-teal-500/10 shadow-inner shadow-teal-400/20 sm:h-12 sm:w-12">
              <Plug className="h-5 w-5 text-teal-400 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-xl font-bold tracking-tight text-white sm:text-3xl">
                  Integration Center
                </h1>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-0.5 text-[10px] font-medium text-teal-300">
                  <Sparkles className="h-3 w-3" /> System Engine
                </span>
              </div>
              <p className="mt-1 break-words text-xs text-slate-400 sm:text-sm">
                Connect RST Business OS with external services, manage system credentials, and audit webhooks.
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2 font-mono text-xs sm:w-auto sm:justify-start">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-slate-300">Gateway Status:</span>
            <span className="font-semibold text-emerald-400">Operational</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          INTEGRATION TABS SYSTEM (MOBILE SCROLL CONTAINED)
      ========================================================== */}
      <Tabs
        defaultValue="api"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full min-w-0 space-y-6"
      >
        <div className="w-full min-w-0 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex h-auto min-w-full justify-start gap-1 rounded-xl border border-white/[0.08] bg-[#05131a]/80 p-1.5 backdrop-blur-md">
            <TabsTrigger
              value="api"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:border data-[state=active]:border-teal-400/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600/30 data-[state=active]:to-emerald-600/20 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg shadow-teal-950/40 hover:text-slate-200 sm:px-4 sm:py-2.5"
            >
              <Key className="h-3.5 w-3.5 text-teal-400" />
              API Provider
            </TabsTrigger>

            <TabsTrigger
              value="services"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:border data-[state=active]:border-teal-400/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600/30 data-[state=active]:to-emerald-600/20 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg shadow-teal-950/40 hover:text-slate-200 sm:px-4 sm:py-2.5"
            >
              <Globe className="h-3.5 w-3.5 text-teal-400" />
              Connected Services
            </TabsTrigger>

            <TabsTrigger
              value="webhooks"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:border data-[state=active]:border-teal-400/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600/30 data-[state=active]:to-emerald-600/20 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg shadow-teal-950/40 hover:text-slate-200 sm:px-4 sm:py-2.5"
            >
              <Webhook className="h-3.5 w-3.5 text-teal-400" />
              Webhooks
            </TabsTrigger>

            <TabsTrigger
              value="logs"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:border data-[state=active]:border-teal-400/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600/30 data-[state=active]:to-emerald-600/20 data-[state=active]:text-teal-200 data-[state=active]:shadow-lg shadow-teal-950/40 hover:text-slate-200 sm:px-4 sm:py-2.5"
            >
              <Activity className="h-3.5 w-3.5 text-teal-400" />
              Integration Logs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: API KEYS */}
        <TabsContent value="api" className="mt-0 min-w-0 focus-visible:outline-none">
          {isSuperAdmin ? (
            <ApiKeyManager />
          ) : (
            <Card className="w-full border-white/[0.08] bg-[#05131a]/60 backdrop-blur-md">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center sm:py-12">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Super Admin Privileges Required
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-slate-400">
                  API keys and credential pairs are restricted and managed exclusively by organization Super Administrators.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: SERVICES */}
        <TabsContent value="services" className="mt-0 min-w-0 focus-visible:outline-none">
          <ConnectedServices />
        </TabsContent>

        {/* TAB 3: WEBHOOKS */}
        <TabsContent value="webhooks" className="mt-0 min-w-0 focus-visible:outline-none">
          <WebhooksPanel />
        </TabsContent>

        {/* TAB 4: LOGS */}
        <TabsContent value="logs" className="mt-0 min-w-0 focus-visible:outline-none">
          <IntegrationLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}