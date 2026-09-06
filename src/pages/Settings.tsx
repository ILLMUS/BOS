import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SlaDefaultsEditor from "@/components/admin/SlaDefaultsEditor";
import NotificationPreferences from "@/components/settings/NotificationPreferences";
import NotificationTestPanel from "@/components/settings/NotificationTestPanel";
import ProfileSettings from "@/components/settings/ProfileSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";

export default function Settings() {
  const { isAdmin, hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const showAdmin = isAdmin || isSuperAdmin;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, appearance, alerts and security.
        </p>
      </div>

      <Tabs defaultValue="account">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {showAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="account" className="mt-4">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <AppearanceSettings />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4 space-y-6">
          <NotificationPreferences />
          <NotificationTestPanel />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecuritySettings />
        </TabsContent>
        {showAdmin && (
          <TabsContent value="admin" className="mt-4 space-y-6">
            {isAdmin && <SlaDefaultsEditor />}
            <p className="text-sm text-muted-foreground">
              External connections and API keys have moved to{" "}
              <a href="/admin/integrations" className="underline">Administration → Integrations</a>.
            </p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
