import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { BankTxn } from "@/lib/reconcile";
import type { LedgerAccount } from "@/lib/ledger";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string | null;
  bankOptions: LedgerAccount[];
  txn: BankTxn | null;
  onSaved: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function BankTxnDialog({ open, onOpenChange, orgId, bankOptions, txn, onSaved }: Props) {
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(txn?.txn_date || today());
    setDescription(txn?.description || "");
    setReference(txn?.reference || "");
    setAmount(txn ? String(txn.amount) : "");
    setAccountId(txn?.ledger_account_id || bankOptions[0]?.id || "");
  }, [open, txn, bankOptions]);

  const save = async () => {
    if (!orgId) return;
    const value = Number(amount);
    if (!description.trim()) return toast.error("Add a description");
    if (!Number.isFinite(value) || value === 0) return toast.error("Add an amount (negative for money out)");

    setSaving(true);
    const payload = {
      org_id: orgId,
      txn_date: date,
      description: description.trim(),
      reference: reference.trim() || null,
      amount: value,
      ledger_account_id: accountId || null,
    };
    const { error } = txn
      ? await supabase.from("bank_transactions").update(payload).eq("id", txn.id)
      : await supabase.from("bank_transactions").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(txn ? "Statement line updated" : "Statement line added");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{txn ? "Edit statement line" : "Add statement line"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bt-date">Date</Label>
              <Input id="bt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bt-amount">Amount (minus for money out)</Label>
              <Input id="bt-amount" inputMode="decimal" value={amount} placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bt-desc">Description</Label>
            <Input id="bt-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bt-ref">Reference</Label>
            <Input id="bt-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bank / cash account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {bankOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
