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
import { User, Loader2, Save, Shield } from "lucide-react";
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
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400">
            <User className="h-4 w-4" />
          </div>
          <span className="break-words">Your Profile</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-6">
        {/* FULL NAME */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="full-name" className="text-xs font-semibold text-slate-300">
            Full name
          </Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="w-full border-white/[0.1] bg-[#02080b]/80 text-xs text-white placeholder:text-slate-500 focus:border-teal-400/50 focus:ring-teal-400/20"
          />
        </div>

        {/* PHONE */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="phone" className="text-xs font-semibold text-slate-300">
            Phone
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+268 ..."
            className="w-full border-white/[0.1] bg-[#02080b]/80 text-xs text-white placeholder:text-slate-500 focus:border-teal-400/50 focus:ring-teal-400/20"
          />
        </div>

        {/* EMAIL (READ-ONLY) */}
        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
            Email
          </Label>
          <Input
            id="email"
            value={profile?.email ?? ""}
            disabled
            className="w-full border-white/[0.05] bg-black/40 text-xs text-slate-400 opacity-80 cursor-not-allowed"
          />
          <p className="break-words text-[11px] text-slate-400">
            Email is used to sign in and cannot be changed here.
          </p>
        </div>

        {/* ROLES BADGES */}
        <div className="space-y-1.5 min-w-0 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Shield className="h-3.5 w-3.5 text-teal-400" />
            <span>Assigned Roles</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {roles.length === 0 && (
              <span className="text-xs text-slate-500">No roles assigned</span>
            )}
            {roles.map((r) => (
              <Badge
                key={r}
                variant="outline"
                className="border-teal-400/30 bg-teal-500/10 text-[11px] font-medium text-teal-300"
              >
                {ROLE_LABELS[r] || r}
              </Badge>
            ))}
          </div>
        </div>

        {/* ACTIONS & AUTOSAVE INDICATOR */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={() => save()}
            disabled={!dirty || saving}
            className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-600 text-xs font-semibold text-white shadow-lg shadow-teal-950/40 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save changes"}
          </Button>

          <span
            className={`break-words text-center text-[11px] sm:text-right ${
              autoState === "error"
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {autoState === "idle"
              ? "Changes save automatically"
              : autosaveLabel(autoState)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}