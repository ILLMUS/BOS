import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import { CONFIG_SECTIONS, ConfigKey } from "@/lib/orgConfig";
import ConfigListEditor from "@/components/config/ConfigListEditor";
import ConfigLinkCard from "@/components/config/ConfigLinkCard";
import BusinessProfileCard from "@/components/config/BusinessProfileCard";
import DocumentBrandingCard from "@/components/config/DocumentBrandingCard";
import SlaDefaultsEditor from "@/components/admin/SlaDefaultsEditor";
import BusinessTemplateGallery from "@/components/config/BusinessTemplateGallery";

/** Phase 8 — one place where an organization defines how its Business OS runs. */
export default function Configuration() {
  const { isAdmin, orgId } = useAuth();
  const { config, loading, save, reload } = useOrgConfig();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!orgId) return <Navigate to="/onboarding" replace />;

  const list = (key: ConfigKey) => (
    <ConfigListEditor
      key={key}
      section={CONFIG_SECTIONS[key]}
      items={config[key]}
      onSave={(items) => save(key, items)}
    />
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Business Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Define how this workspace operates. Nothing here is fixed to one industry — every list below
          is yours to rename.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="business">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="lifecycle">Customer lifecycle</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="mt-4 space-y-6">
            <BusinessProfileCard />
            <DocumentBrandingCard />
            {list("services")}
            {list("departments")}
          </TabsContent>

          <TabsContent value="templates" className="mt-4 space-y-6">
            <BusinessTemplateGallery onInstalled={reload} />
          </TabsContent>

          <TabsContent value="people" className="mt-4 space-y-6">
            <ConfigLinkCard
              title="Users, roles and permissions"
              description="Workspace access is managed with the existing role system."
              links={[
                { to: "/admin/users", label: "Users & access", description: "Invite members and set platform roles." },
                { to: "/admin/roles", label: "Roles & teams", description: "Create your own roles and assign members." },
                {
                  to: "/admin/sop",
                  label: "Step responsibilities",
                  description: "Decide which role owns and approves each workflow step.",

                },
              ]}
            />
          </TabsContent>

          <TabsContent value="lifecycle" className="mt-4 space-y-6">
            {list("lead_stages")}
            {list("sales_stages")}
            {list("client_states")}
          </TabsContent>

          <TabsContent value="operations" className="mt-4 space-y-6">
            <ConfigLinkCard
              title="Workflows, SOPs, steps and forms"
              description="Built and versioned in the operations engine that already runs your work."
              links={[
                { to: "/admin/sop", label: "SOP builder", description: "Workflows, steps, forms, responsibilities and approvals." },
                { to: "/admin/assignments", label: "Step owners", description: "Company-wide default ownership for each workflow step." },
              ]}
            />

            <SlaDefaultsEditor />
          </TabsContent>

          <TabsContent value="finance" className="mt-4 space-y-6">
            {list("quote_states")}
            {list("invoice_states")}
            {list("payment_states")}
            {list("payment_methods")}
            {list("expense_categories")}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}