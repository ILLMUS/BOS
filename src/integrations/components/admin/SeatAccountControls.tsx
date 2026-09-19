import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KeyRound, Loader2, ShieldOff, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";

async function callManage(action: string, payload: Record<string, unknown> = {}) {
  const res = await supabase.functions.invoke("manage-user-account", { body: { action, ...payload } });
  if (res.error) {
    let message = res.error.message;
    try {
      const ctx = (res.error as { context?: Response }).context;
      if (ctx && typeof ctx.clone === "function") {
        const body = await ctx.clone().json();
        if (body?.error) message = body.error;
      }
    } catch (_e) {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export async function loadAccountStatuses(): Promise<Record<string, boolean>> {
  const data = await callManage("list");
  const map: Record<string, boolean> = {};
  for (const s of (data?.statuses || []) as { id: string; suspended: boolean }[]) map[s.id] = s.suspended;
  return map;
}

interface Props {
  userId: string;
  name: string;
  suspended: boolean;
  onChanged: (suspended: boolean) => void;
}

export default function SeatAccountControls({ userId, name, suspended, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "reactivate" | "reset_password" | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const run = async (action: "deactivate" | "reactivate" | "reset_password") => {
    setBusy(action);
    try {
      const data = await callManage(action, {
        user_id: userId,
        redirect_to: `${window.location.origin}/dashboard`,
      });
      if (action === "reset_password") {
        setTempPassword(data?.temp_password ?? null);
        toast.success(
          data?.email_sent
            ? `New temporary password emailed to ${name}`
            : `New temporary password created — share it with ${name}`,
        );
      } else {
        onChanged(action === "deactivate");
        toast.success(action === "deactivate" ? `${name} can no longer sign in` : `${name} can sign in again`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "That didn't work");
    } finally {
      setBusy(null);
      setConfirmAction(null);
    }
  };

  const confirmCopy = {
    deactivate: {
      title: `Deactivate ${name}?`,
      body: "They keep this seat and all their history, but cannot sign in until you reactivate them.",
    },
    reactivate: { title: `Reactivate ${name}?`, body: "They will be able to sign in again straight away." },
    reset_password: {
      title: `Reset password for ${name}?`,
      body: "Their current password stops working. A new temporary one is emailed to them and shown here.",
    },
  } as const;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {suspended && (
          <Badge variant="destructive" className="text-[10px] uppercase">
            Deactivated
          </Badge>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => setConfirmAction("reset_password")}
        >
          {busy === "reset_password" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          Reset password
        </Button>
        <Button
          type="button"
          size="sm"
          variant={suspended ? "default" : "outline"}
          disabled={!!busy}
          onClick={() => setConfirmAction(suspended ? "reactivate" : "deactivate")}
        >
          {busy === "deactivate" || busy === "reactivate" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : suspended ? (
            <ShieldCheck className="mr-2 h-4 w-4" />
          ) : (
            <ShieldOff className="mr-2 h-4 w-4" />
          )}
          {suspended ? "Reactivate" : "Deactivate"}
        </Button>
      </div>

      {tempPassword && (
        <div className="flex items-center gap-2 rounded-lg border p-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase text-muted-foreground">Temporary password</p>
            <p className="truncate font-mono">{tempPassword}</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(tempPassword);
              toast.success("Password copied");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction ? confirmCopy[confirmAction].title : ""}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction ? confirmCopy[confirmAction].body : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAction && run(confirmAction)}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
