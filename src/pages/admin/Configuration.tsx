import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Building2,
  LayoutTemplate,
  Users2,
  GitMerge,
  Workflow,
  Receipt,
  Settings2,
} from "lucide-react";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import { CONFIG_SECTIONS, ConfigKey } from "@/lib/orgConfig";
import ConfigListEditor from "@/components/config/ConfigListEditor";
import ConfigLinkCard from "@/components/config/ConfigLinkCard";
import BusinessProfileCard from "@/components/config/BusinessProfileCard";
import DocumentBrandingCard from "@/components/config/DocumentBrandingCard";
import SlaDefaultsEditor from "@/components/admin/SlaDefaultsEditor";
import BusinessTemplateGallery from "@/components/config/BusinessTemplateGallery";
import BusinessLanguageCard from "@/components/config/BusinessLanguageCard";
import BusinessBrandingCard from "@/components/config/BusinessBrandingCard";
import { motion } from "framer-motion";

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
    <div className="mx-auto max-w-5xl space-y-6 min-w-0 pb-12 text-white">
      {/* HEADER SECTION */}
      <div className="space-y-1 min-w-0">
        <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white sm:text-2xl min-w-0">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-500/10 text-teal-400 shadow-inner"
          >
            <Settings2 className="h-5 w-5" />
          </motion.div>
          <span className="truncate">Business Configuration</span>
        </h1>
        <p className="break-words text-xs sm:text-sm text-slate-400">
          Define how this workspace operates. Nothing here is fixed to one industry — every list below
          is yours to rename.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-teal-400" />
        </div>
      ) : (
        <Tabs defaultValue="business" className="w-full space-y-6 min-w-0">
          {/* TAB TRIGGERS WITH MODERN ICONS */}
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#05131a]/90 p-1.5 backdrop-blur-md min-w-0 scrollbar-none">
            <TabsTrigger
              value="business"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-300 data-[state=active]:shadow-sm shrink-0"
            >
              <Building2 className="h-3.5 w-3.5 text-teal-400" />
              <span>Business</span>
            </TabsTrigger>

            <TabsTrigger
              value="templates"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-300 data-[state=active]:shadow-sm shrink-0"
            >
              <LayoutTemplate className="h-3.5 w-3.5 text-teal-400" />
              <span>Templates</span>
            </TabsTrigger>

            <TabsTrigger
              value="people"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-300 data-[state=active]:shadow-sm shrink-0"
            >
              <Users2 className="h-3.5 w-3.5 text-teal-400" />
              <span>People</span>
            </TabsTrigger>

            <TabsTrigger
              value="lifecycle"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-300 data-[state=active]:shadow-sm shrink-0"
            >
              <GitMerge className="h-3.5 w-3.5 text-teal-400" />
              <span>Customer lifecycle</span>
            </TabsTrigger>

            <TabsTrigger
              value="operations"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-300 data-[state=active]:shadow-sm shrink-0"
            >
              <Workflow className="h-3.5 w-3.5 text-teal-400" />
              <span>Operations</span>
            </TabsTrigger>

            <TabsTrigger
              value="finance"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition-all data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-300 data-[state=active]:shadow-sm shrink-0"
            >
              <Receipt className="h-3.5 w-3.5 text-teal-400" />
              <span>Finance</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB CONTENTS */}
          <TabsContent value="business" className="mt-0 space-y-6 focus-visible:outline-none min-w-0">
            <BusinessProfileCard />
            <BusinessBrandingCard />
            <BusinessLanguageCard />
            <DocumentBrandingCard />
            {list("services")}
            {list("departments")}
          </TabsContent>

          <TabsContent value="templates" className="mt-0 space-y-6 focus-visible:outline-none min-w-0">
            <BusinessTemplateGallery onInstalled={reload} />
          </TabsContent>

          <TabsContent value="people" className="mt-0 space-y-6 focus-visible:outline-none min-w-0">
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

          <TabsContent value="lifecycle" className="mt-0 space-y-6 focus-visible:outline-none min-w-0">
            {list("lead_stages")}
            {list("sales_stages")}
            {list("client_states")}
          </TabsContent>

          <TabsContent value="operations" className="mt-0 space-y-6 focus-visible:outline-none min-w-0">
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

          <TabsContent value="finance" className="mt-0 space-y-6 focus-visible:outline-none min-w-0">
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