import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  deviceAlertsEnabled, permissionState, requestDeviceAlerts, setDeviceAlertsEnabled,
  showDeviceAlert,
} from "@/lib/deviceNotifications";

/** Lets the user switch on pop-up alerts with sound on this device. */
export default function DeviceAlertToggle() {
  const [on, setOn] = useState(deviceAlertsEnabled());

  const enable = async () => {
    const result = await requestDeviceAlerts();
    if (result === "granted") {
      setOn(true);
      showDeviceAlert({ title: "Alerts switched on", body: "You'll be told the moment figures stop matching." });
      return;
    }
    if (result === "blocked-in-preview") {
      toast.info("Open the app in its own browser tab to switch on pop-up alerts.");
      return;
    }
    if (result === "denied") {
      toast.error("Pop-up alerts are blocked for this site. Allow notifications in your browser settings.");
      return;
    }
    toast.error("This device cannot show pop-up alerts.");
  };

  const disable = () => {
    setDeviceAlertsEnabled(false);
    setOn(false);
  };

  if (permissionState() === "unsupported") return null;

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
      <span className="text-xs text-muted-foreground">
        {on ? "Pop-up alerts with sound are on" : "Get pop-up alerts with sound"}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-2 py-1 text-xs"
        onClick={on ? disable : enable}
      >
        <BellRing className="mr-1 h-3 w-3" />
        {on ? "Turn off" : "Turn on"}
      </Button>
    </div>
  );
}
