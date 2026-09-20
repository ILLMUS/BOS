import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, LogOut, KeyRound, Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function SecuritySettings() {
  const { user, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password updated successfully");
  };

  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <ShieldCheck className="h-4 w-4" />
          </motion.div>
          <span className="break-words">Security Settings</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-4 text-xs sm:p-6 sm:text-sm">
        {/* PASSWORD CHANGE PANEL */}
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 space-y-4 min-w-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-200">Change password</p>
              <p className="break-words text-[11px] text-slate-400">
                Ensure your account uses a strong password of at least 8 characters.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="new-password" className="text-xs font-semibold text-slate-300">
                New password
              </Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border-white/[0.1] bg-[#030d12]/80 text-xs text-white focus:border-teal-400/50 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-300">
                Confirm new password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full border-white/[0.1] bg-[#030d12]/80 text-xs text-white focus:border-teal-400/50 placeholder:text-slate-600"
              />
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              onClick={changePassword}
              disabled={saving || !password || !confirm}
              className="w-full sm:w-auto h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                  Update password
                </>
              )}
            </Button>
          </motion.div>
        </div>

        {/* SESSION MANAGEMENT PANEL */}
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold text-slate-200">Current session</p>
            <p className="break-words text-xs text-slate-400">
              Signed in as <span className="font-medium text-teal-300 break-all">{user?.email}</span>
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="w-full sm:w-auto h-8 border-rose-500/20 bg-rose-500/10 text-xs font-medium text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-500/30"
            >
              <LogOut className="mr-2 h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
              Sign out
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}