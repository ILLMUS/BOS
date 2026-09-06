import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plug } from "lucide-react";
import ApiKeyManager from "@/components/admin/ApiKeyManager";
import ConnectedServices from "@/components/integrations/ConnectedServices";
import WebhooksPanel from "@/components/integrations/WebhooksPanel";
import IntegrationLogs from "@/components/integrations/IntegrationLogs";

/** Integration Center — where this workspace connects to external systems. */
export default function Integrations() {
  const { isAdmin, orgId, hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");

  if (!isAdmin && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (!orgId) return <Navigate to="/onboarding" replace />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-accent/10 p-2">
          <Plug className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Integration Center</h1>
          <p className="text-sm text-muted-foreground">
            Connect RST Business OS with the external tools and services your organization uses.
          </p>
        </div>
      </div>

      <Tabs defaultValue="api">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="api">API Provider</TabsTrigger>
          <TabsTrigger value="services">Connected Services</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Integration Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-4 space-y-6">
          {isSuperAdmin ? (
            <ApiKeyManager />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                API keys are managed by a Super Admin.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <ConnectedServices />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <WebhooksPanel />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <IntegrationLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
