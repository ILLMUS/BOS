import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Bell, Moon, ListChecks, AlertTriangle, Smartphone, Mail, MonitorSmartphone } from "lucide-react";
import { useNotificationPrefs, isQuietNow } from "@/lib/notificationPrefs";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type JobStage = Database["public"]["Enums"]["job_stage"];

const ALL_STAGES = [
  ...STAGE_ORDER,
  ...(Object.keys(STAGE_LABELS) as JobStage[]).filter((s) => !STAGE_ORDER.includes(s)),
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-accent" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Activity feed toasts</p>
            <p className="text-xs text-muted-foreground">
              Pop-ups when new stage transitions or approvals happen.
            </p>
          </div>
          <Switch
            checked={prefs.activityToasts}
            onCheckedChange={(v) => update({ activityToasts: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Pending approval toasts</p>
            <p className="text-xs text-muted-foreground">
              Pop-ups when a stage becomes ready for approval.
            </p>
          </div>
          <Switch
            checked={prefs.approvalToasts}
            onCheckedChange={(v) => update({ approvalToasts: v })}
          />
        </div>

        {showOverdue && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <p className="font-medium">Overdue step alerts</p>
                <p className="text-xs text-muted-foreground">
                  Admin-only: pop-ups when an SOP step breaches its SLA deadline.
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.overdueToasts}
              onCheckedChange={(v) => update({ overdueToasts: v })}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Only my assigned actions</p>
            <p className="text-xs text-muted-foreground">
              Alert only when the step is owned by me or my role.
            </p>
          </div>
          <Switch
            checked={prefs.onlyMyAssignments}
            onCheckedChange={(v) => update({ onlyMyAssignments: v })}
          />
        </div>

        <div className="space-y-3 rounded border p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <ListChecks className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Per-SOP-step filter</p>
                <p className="text-xs text-muted-foreground">
                  Receive alerts only for the SOP steps you select.
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.stageFilterEnabled}
              onCheckedChange={(v) => update({ stageFilterEnabled: v })}
            />
          </div>

          {prefs.stageFilterEnabled && (
            <>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => update({ enabledStages: [...ALL_STAGES] })}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => update({ enabledStages: [] })}
                >
                  Clear all
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ALL_STAGES.map((stage) => (
                  <label
                    key={stage}
                    className="flex items-center gap-2 rounded border p-2 text-xs"
                    htmlFor={`stage-${stage}`}
                  >
                    <Checkbox
                      id={`stage-${stage}`}
                      checked={prefs.enabledStages.includes(stage)}
                      onCheckedChange={(v) => toggleStage(stage, v === true)}
                    />
                    <span>{STAGE_LABELS[stage]}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 rounded border p-3">
          <p className="font-medium">Delivery channels</p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <MonitorSmartphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">In-app</p>
                <p className="text-xs text-muted-foreground">Toast pop-ups while you are using the app.</p>
              </div>
            </div>
            <Switch checked={prefs.channelInApp} onCheckedChange={(v) => update({ channelInApp: v })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-xs text-muted-foreground">Sent to your account email address.</p>
              </div>
            </div>
            <Switch checked={prefs.channelEmail} onCheckedChange={(v) => update({ channelEmail: v })} />
          </div>
          {prefs.channelEmail && (
            <div className="flex items-center justify-between gap-4 pl-6">
              <p className="text-xs text-muted-foreground">
                Hold quiet-hours emails and send them as one digest afterwards.
              </p>
              <Switch
                checked={prefs.emailDigestDuringQuiet}
                onCheckedChange={(v) => update({ emailDigestDuringQuiet: v })}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <Smartphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">SMS</p>
                <p className="text-xs text-muted-foreground">Text alerts to the phone number on your profile.</p>
              </div>
            </div>
            <Switch checked={prefs.channelSms} onCheckedChange={(v) => update({ channelSms: v })} />
          </div>
          {prefs.channelSms && (
            <div className="flex items-center justify-between gap-4 pl-6">
              <p className="text-xs text-muted-foreground">
                Limit SMS to urgent alerts (approvals and overdue steps).
              </p>
              <Switch
                checked={prefs.smsUrgentOnly}
                onCheckedChange={(v) => update({ smsUrgentOnly: v })}
              />
            </div>
          )}
        </div>

        <div className="rounded border p-3 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <Moon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  Quiet hours{" "}
                  {quietActive && (
                    <span className="ml-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Silence all toast pop-ups during this window.
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.quietHoursEnabled}
              onCheckedChange={(v) => update({ quietHoursEnabled: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="quiet-start" className="text-xs">From</Label>
              <Input
                id="quiet-start"
                type="time"
                value={prefs.quietStart}
                disabled={!prefs.quietHoursEnabled}
                onChange={(e) => update({ quietStart: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quiet-end" className="text-xs">To</Label>
              <Input
                id="quiet-end"
                type="time"
                value={prefs.quietEnd}
                disabled={!prefs.quietHoursEnabled}
                onChange={(e) => update({ quietEnd: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}