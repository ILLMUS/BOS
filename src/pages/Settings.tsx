import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Building, Bell, Shield, Sliders, ExternalLink } from "lucide-react";

import SlaDefaultsEditor from "@/components/admin/SlaDefaultsEditor";
import NotificationPreferences from "@/components/settings/NotificationPreferences";
import NotificationTestPanel from "@/components/settings/NotificationTestPanel";
import ProfileSettings from "@/components/settings/ProfileSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import BusinessBrandingCard from "@/components/config/BusinessBrandingCard";

export default function Settings() {
  const { isAdmin, hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const showAdmin = isAdmin || isSuperAdmin;

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-1 border-b border-white/[0.065] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          Settings
        </h1>
        <p className="text-[11px] text-slate-400">
          Manage your personal preferences, workspace branding, alerts, and security protocols.
        </p>
      </div>

      {/* TABS CONTAINER */}
      <Tabs defaultValue="account" className="space-y-5">
        <TabsList className="flex h-10 w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/[0.085] bg-[#10151d]/95 p-1 text-slate-400 backdrop-blur-md flex-nowrap whitespace-nowrap">
          <TabsTrigger
            value="account"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20"
          >
            <User className="h-3.5 w-3.5" /> Account
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20"
          >
            <Palette className="h-3.5 w-3.5" /> Appearance
          </TabsTrigger>
          {showAdmin && (
            <TabsTrigger
              value="branding"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20"
            >
              <Building className="h-3.5 w-3.5" /> Branding
            </TabsTrigger>
          )}
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20"
          >
            <Bell className="h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20"
          >
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          {showAdmin && (
            <TabsTrigger
              value="admin"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20"
            >
              <Sliders className="h-3.5 w-3.5" /> Admin
            </TabsTrigger>
          )}
        </TabsList>

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <TabsContent value="account" className="mt-0 space-y-4">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="appearance" className="mt-0 space-y-4">
            <AppearanceSettings />
          </TabsContent>

          {showAdmin && (
            <TabsContent value="branding" className="mt-0 space-y-4">
              <BusinessBrandingCard />
            </TabsContent>
          )}

          <TabsContent value="notifications" className="mt-0 space-y-5">
            <NotificationPreferences />
            <NotificationTestPanel />
          </TabsContent>

          <TabsContent value="security" className="mt-0 space-y-4">
            <SecuritySettings />
          </TabsContent>

          {showAdmin && (
            <TabsContent value="admin" className="mt-0 space-y-5">
              {isAdmin && <SlaDefaultsEditor />}
              <div className="relative overflow-hidden rounded-[14px] border border-white/[0.085] bg-[#10151d]/95 p-4 text-[11px] text-slate-400 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    Notice
                  </span>
                  <span>
                    External connections and API keys have moved to{" "}
                    <Link
                      to="/admin/integrations"
                      className="inline-flex items-center gap-1 text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
                    >
                      Administration → Integrations
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    .
                  </span>
                </div>
              </div>
            </TabsContent>
          )}
        </motion.div>
      </Tabs>
    </div>
  );
}