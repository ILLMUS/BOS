import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPath } from "@/lib/authority";
import { clearBlockedPath, getPendingAccess } from "@/lib/accessWatch";

const POLL_MS = 45_000;

/**
 * Watches for the moment a previously blocked section becomes reachable —
 * i.e. the missing workspace link or role assignment was granted — and raises
 * an in-app notification with a direct link back to that section.
 */
export function useAccessWatch() {
  const { user, authority, refreshProfile } = useAuth();
  const announced = useRef<Set<string>>(new Set());

  const announceUnlocked = useCallback(async () => {
    if (!user) return;
    const pending = getPendingAccess(user.id);
    if (pending.length === 0) return;

    for (const item of pending) {
      if (!canAccessPath(authority, item.path)) continue;
      clearBlockedPath(user.id, item.path);
      if (announced.current.has(item.path)) continue;
      announced.current.add(item.path);

      toast.success("Access granted", {
        description: `${item.label} is now open to you.`,
        duration: 10_000,
        action: {
          label: "Open",
          onClick: () => {
            window.location.href = item.path;
          },
        },
      });

      // Best effort: persist it to the notification bell as well.
      await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title: "Access granted",
          message: `Your standing was updated — ${item.label} (${item.path}) is now available.`,
          type: "access_granted",
        })
        .then(undefined, () => undefined);
    }
  }, [user, authority]);

  // React to standing changes as soon as the auth context updates.
  useEffect(() => {
    void announceUnlocked();
  }, [announceUnlocked]);

  // Poll for a role/workspace grant made by an admin while the app is open.
  useEffect(() => {
    if (!user) return;
    if (getPendingAccess(user.id).length === 0) return;

    const check = () => {
      if (getPendingAccess(user.id).length === 0) return;
      void refreshProfile();
    };

    const interval = window.setInterval(check, POLL_MS);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [user, authority, refreshProfile]);
}
