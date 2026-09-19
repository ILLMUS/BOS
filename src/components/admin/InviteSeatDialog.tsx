import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

/** Access levels an admin can hand out from the teams screen. */
const ACCESS_LEVELS = [
  { value: "none", label: "No extra access (field member)" },
  { value: "lead_handler", label: "Lead Handler (manager)" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "client_manager", label: "Client Manager" },
  { value: "estimator", label: "Estimator" },
  { value: "quotation_officer", label: "Quotation Officer" },
  { value: "accounts_admin", label: "Accounts Admin (finance)" },
  { value: "owner_director", label: "Owner / Director (board)" },
];

/** Sensible default access for each seat. */
export const SEAT_ACCESS_DEFAULTS: Record<string, string> = {
  lead_handler: "lead_handler",
  outreach_rep: "none",
  sales_lead: "client_manager",
  salesperson: "none",
  estimator: "estimator",
  accountant: "accounts_admin",
  finance_approver: "owner_director",
};

async function edgeErrorMessage(error: unknown, fallback: string) {
  try {
    const ctx = (error as { context?: { clone?: () => Response } })?.context;
    if (ctx && typeof (ctx as Response).clone === "function") {
      const body = await (ctx as Response).clone().json();
      if (body?.error) return body.error as string;
    }
  } catch (_e) {
    /* ignore */
  }
  return (error as Error)?.message || fallback;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seatTitle: string;
  seatKey: string;
  functionLabel: string;
  /** Called with the new (or linked) user id once the invite succeeds. */
  onInvited: (userId: string, fullName: string) => Promise<void> | void;
}

export default function InviteSeatDialog({
  open,
  onOpenChange,
  seatTitle,
  seatKey,
  functionLabel,
  onInvited,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState(SEAT_ACCESS_DEFAULTS[seatKey] ?? "none");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ link: string | null; password: string | null; emailSent: boolean } | null>(
    null,
  );

  const reset = () => {
    setFullName("");
    setEmail("");
    setAccessLevel(SEAT_ACCESS_DEFAULTS[seatKey] ?? "none");
    setResult(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: {
          email,
          full_name: fullName || email,
          role: accessLevel !== "none" ? accessLevel : null,
          redirect_to: `${window.location.origin}/dashboard`,
        },
      });
      if (res.error) throw new Error(await edgeErrorMessage(res.error, "Could not send the invite"));
      if (res.data?.error) throw new Error(res.data.error);

      const userId = res.data?.user_id as string | undefined;
      if (!userId) throw new Error("The invite did not return an account");

      await onInvited(userId, fullName || email);

      setResult({
        link: res.data?.invite_link ?? null,
        password: res.data?.temp_password ?? null,
        emailSent: !!res.data?.email_sent,
      });
      toast.success(
        res.data?.email_sent
          ? `Invite emailed to ${email} — assigned as ${seatTitle}`
          : `${seatTitle} assigned — share the sign-in details below`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not send the invite");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite a {seatTitle}</DialogTitle>
          <DialogDescription>
            Creates the account, gives it the access it needs and puts the person in the {seatTitle} seat under{" "}
            {functionLabel}.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {result.emailSent
                ? "An invite email is on its way with their sign-in details."
                : "The email could not be sent — share these details directly."}
            </p>
            {result.password && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase text-muted-foreground">Temporary password</p>
                  <p className="truncate font-mono">{result.password}</p>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => copy(result.password!, "Password")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            {result.link && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase text-muted-foreground">Sign-in link</p>
                  <p className="truncate">{result.link}</p>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => copy(result.link!, "Link")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seat-name">Full name</Label>
              <Input
                id="seat-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Thandi Dlamini"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seat-email">Email</Label>
              <Input
                id="seat-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Access level</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !email}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
