import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { User } from "lucide-react";
import { autosaveLabel, useAutosave } from "@/hooks/useAutosave";

export default function ProfileSettings() {
  const { profile, roles, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.full_name, profile?.phone]);

  const dirty =
    fullName !== (profile?.full_name ?? "") || phone !== (profile?.phone ?? "");

  const save = async (silent = false) => {
    if (!profile?.id) return;
    if (!fullName.trim()) {
      if (!silent) toast.error("Name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save profile");
      throw error;
    }
    await refreshProfile();
    if (!silent) toast.success("Profile updated");
  };

  const autoState = useAutosave({
    value: { fullName, phone },
    enabled: dirty && !!fullName.trim(),
    onSave: () => save(true),
  });


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-accent" />
          Your Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+268 ..."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profile?.email ?? ""} disabled />
          <p className="text-xs text-muted-foreground">
            Email is used to sign in and cannot be changed here.
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Roles</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {roles.length === 0 && (
              <span className="text-xs text-muted-foreground">No roles assigned</span>
            )}
            {roles.map((r) => (
              <Badge key={r} variant="outline">{ROLE_LABELS[r]}</Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => save()} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <span className={`text-xs ${autoState === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {autoState === "idle" ? "Changes save automatically" : autosaveLabel(autoState)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}