import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, nextAccountCode, type AccountType, type LedgerAccount } from "@/lib/ledger";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | null;
  accounts: LedgerAccount[];
  account?: LedgerAccount | null;
  onSaved: () => void;
}

export default function LedgerAccountDialog({ open, onOpenChange, orgId, accounts, account, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("expense");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (account) {
      setCode(account.code); setName(account.name); setType(account.type); setActive(account.is_active);
    } else {
      setType("expense"); setCode(nextAccountCode(accounts, "expense")); setName(""); setActive(true);
    }
  }, [open, account, accounts]);

  const changeType = (v: AccountType) => {
    setType(v);
    if (!account) setCode(nextAccountCode(accounts, v));
  };

  const save = async () => {
    if (!orgId) return toast.error("No workspace selected");
    if (!code.trim() || !name.trim()) return toast.error("Code and name are required");
    setSaving(true);
    const payload = { code: code.trim(), name: name.trim(), type, is_active: active };
    const { error } = account
      ? await supabase.from("ledger_accounts").update(payload).eq("id", account.id)
      : await supabase.from("ledger_accounts").insert({ ...payload, org_id: orgId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(account ? "Account updated" : "Account added");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{account ? "Edit account" : "New ledger account"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="la-type">Type</Label>
            <Select value={type} onValueChange={(v) => changeType(v as AccountType)}>
              <SelectTrigger id="la-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <div className="space-y-1.5">
              <Label htmlFor="la-code">Code</Label>
              <Input id="la-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="la-name">Name</Label>
              <Input id="la-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welding consumables" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="la-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="la-active" className="cursor-pointer">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
