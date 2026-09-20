import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Moon,
  ListChecks,
  AlertTriangle,
  Smartphone,
  Mail,
  MonitorSmartphone,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useNotificationPrefs, isQuietNow } from "@/lib/notificationPrefs";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";

type JobStage = Database["public"]["Enums"]["job_stage"];

const ALL_STAGES = [
  ...STAGE_ORDER,
  ...(Object.keys(STAGE_LABELS) as JobStage[]).filter(
    (s) => !STAGE_ORDER.includes(s)
  ),
];

export default function NotificationPreferences() {
  const { prefs, update } = useNotificationPrefs();
  const { isAdmin, hasRole } = useAuth();
  const showOverdue = isAdmin || hasRole("super_admin");
  const quietActive = isQuietNow(prefs);

  const toggleStage = (stage: JobStage, on: boolean) => {
    const set = new Set(prefs.enabledStages);
    if (on) set.add(stage);
    else set.delete(stage);
    update({ enabledStages: ALL_STAGES.filter((s) => set.has(s)) });
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
            <Bell className="h-4 w-4" />
          </motion.div>
          <span className="break-words">Notifications</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-4 text-xs sm:p-6 sm:text-sm">
        {/* TOAST TOGGLES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-200">Activity feed toasts</p>
              <p className="break-words text-[11px] text-slate-400">
                Pop-ups when new stage transitions or approvals happen.
              </p>
            </div>
            <Switch
              checked={prefs.activityToasts}
              onCheckedChange={(v) => update({ activityToasts: v })}
              className="data-[state=checked]:bg-teal-500"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-200">Pending approval toasts</p>
              <p className="break-words text-[11px] text-slate-400">
                Pop-ups when a stage becomes ready for approval.
              </p>
            </div>
            <Switch
              checked={prefs.approvalToasts}
              onCheckedChange={(v) => update({ approvalToasts: v })}
              className="data-[state=checked]:bg-teal-500"
            />
          </div>

          {showOverdue && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200">Overdue step alerts</p>
                  <p className="break-words text-[11px] text-slate-400">
                    Admin-only: pop-ups when an SOP step breaches its SLA deadline.
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.overdueToasts}
                onCheckedChange={(v) => update({ overdueToasts: v })}
                className="data-[state=checked]:bg-teal-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-200">Only my assigned actions</p>
              <p className="break-words text-[11px] text-slate-400">
                Alert only when the step is owned by me or my role.
              </p>
            </div>
            <Switch
              checked={prefs.onlyMyAssignments}
              onCheckedChange={(v) => update({ onlyMyAssignments: v })}
              className="data-[state=checked]:bg-teal-500"
            />
          </div>
        </div>

        {/* SOP STEP FILTER PANEL */}
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 space-y-3 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-200">Per-SOP-step filter</p>
                <p className="break-words text-[11px] text-slate-400">
                  Receive alerts only for the SOP steps you select.
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.stageFilterEnabled}
              onCheckedChange={(v) => update({ stageFilterEnabled: v })}
              className="data-[state=checked]:bg-teal-500"
            />
          </div>

          <AnimatePresence>
            {prefs.stageFilterEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-3 pt-2 overflow-hidden"
              >
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 border-white/10 bg-white/5 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                    onClick={() => update({ enabledStages: [...ALL_STAGES] })}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3 text-teal-400" />
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 border-white/10 bg-white/5 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                    onClick={() => update({ enabledStages: [] })}
                  >
                    <XCircle className="mr-1 h-3 w-3 text-rose-400" />
                    Clear all
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2 min-w-0 sm:grid-cols-2">
                  {ALL_STAGES.map((stage) => {
                    const isChecked = prefs.enabledStages.includes(stage);
                    return (
                      <motion.label
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        key={stage}
                        htmlFor={`stage-${stage}`}
                        className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors cursor-pointer min-w-0 ${
                          isChecked
                            ? "border-teal-400/30 bg-teal-500/10 text-teal-200"
                            : "border-white/[0.06] bg-[#030d12]/50 text-slate-400 hover:border-white/10 hover:text-slate-200"
                        }`}
                      >
                        <Checkbox
                          id={`stage-${stage}`}
                          checked={isChecked}
                          onCheckedChange={(v) => toggleStage(stage, v === true)}
                          className="data-[state=checked]:bg-teal-500 border-white/20"
                        />
                        <span className="truncate text-xs font-medium">
                          {STAGE_LABELS[stage] || stage}
                        </span>
                      </motion.label>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DELIVERY CHANNELS PANEL */}
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 space-y-3.5 sm:p-4 min-w-0">
          <p className="text-xs font-bold tracking-wide uppercase text-slate-400">
            Delivery channels
          </p>

          {/* IN-APP */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-200">In-app</p>
                <p className="break-words text-[11px] text-slate-400">
                  Toast pop-ups while you are using the app.
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.channelInApp}
              onCheckedChange={(v) => update({ channelInApp: v })}
              className="data-[state=checked]:bg-teal-500"
            />
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5 min-w-0">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200">Email</p>
                  <p className="break-words text-[11px] text-slate-400">
                    Sent to your account email address.
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.channelEmail}
                onCheckedChange={(v) => update({ channelEmail: v })}
                className="data-[state=checked]:bg-teal-500"
              />
            </div>

            <AnimatePresence>
              {prefs.channelEmail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between gap-4 pl-7 pr-1 pt-1 overflow-hidden"
                >
                  <p className="break-words text-[11px] text-slate-400">
                    Hold quiet-hours emails and send them as one digest afterwards.
                  </p>
                  <Switch
                    checked={prefs.emailDigestDuringQuiet}
                    onCheckedChange={(v) => update({ emailDigestDuringQuiet: v })}
                    className="data-[state=checked]:bg-teal-500"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SMS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5 min-w-0">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200">SMS</p>
                  <p className="break-words text-[11px] text-slate-400">
                    Text alerts to the phone number on your profile.
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.channelSms}
                onCheckedChange={(v) => update({ channelSms: v })}
                className="data-[state=checked]:bg-teal-500"
              />
            </div>

            <AnimatePresence>
              {prefs.channelSms && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between gap-4 pl-7 pr-1 pt-1 overflow-hidden"
                >
                  <p className="break-words text-[11px] text-slate-400">
                    Limit SMS to urgent alerts (approvals and overdue steps).
                  </p>
                  <Switch
                    checked={prefs.smsUrgentOnly}
                    onCheckedChange={(v) => update({ smsUrgentOnly: v })}
                    className="data-[state=checked]:bg-teal-500"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* QUIET HOURS PANEL */}
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 space-y-3 sm:p-4 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <Moon className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-200 flex items-center gap-2">
                  <span>Quiet hours</span>
                  {quietActive && (
                    <span className="rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-bold text-teal-300 border border-teal-400/20">
                      ACTIVE
                    </span>
                  )}
                </p>
                <p className="break-words text-[11px] text-slate-400">
                  Silence all toast pop-ups during this window.
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.quietHoursEnabled}
              onCheckedChange={(v) => update({ quietHoursEnabled: v })}
              className="data-[state=checked]:bg-teal-500"
            />
          </div>

          <AnimatePresence>
            {prefs.quietHoursEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-3 pt-2 overflow-hidden"
              >
                <div className="space-y-1 min-w-0">
                  <Label htmlFor="quiet-start" className="text-xs font-medium text-slate-300">
                    From
                  </Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={prefs.quietStart}
                    disabled={!prefs.quietHoursEnabled}
                    onChange={(e) => update({ quietStart: e.target.value })}
                    className="w-full border-white/[0.1] bg-[#030d12]/80 text-xs text-white focus:border-teal-400/50"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <Label htmlFor="quiet-end" className="text-xs font-medium text-slate-300">
                    To
                  </Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={prefs.quietEnd}
                    disabled={!prefs.quietHoursEnabled}
                    onChange={(e) => update({ quietEnd: e.target.value })}
                    className="w-full border-white/[0.1] bg-[#030d12]/80 text-xs text-white focus:border-teal-400/50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}