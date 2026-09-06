import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/crm";
import { num, type EntryWithLines, type LedgerAccount } from "@/lib/ledger";

interface DraftLine { ledger_account_id: string; description: string; debit: string; credit: string }

const blank = (): DraftLine => ({ ledger_account_id: "", description: "", debit: "", credit: "" });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | null;
  accounts: LedgerAccount[];
  entry?: EntryWithLines | null;
  onSaved: () => void;
}

export default function JournalEntryDialog({ open, onOpenChange, orgId, accounts, entry, onSaved }: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([blank(), blank()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setDate(entry.entry_date);
      setMemo(entry.memo);
      setReference(entry.reference || "");
      setLines(entry.lines.length ? entry.lines.map((l) => ({
        ledger_account_id: l.ledger_account_id,
        description: l.description || "",
        debit: num(l.debit) ? String(num(l.debit)) : "",
        credit: num(l.credit) ? String(num(l.credit)) : "",
      })) : [blank(), blank()]);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setMemo(""); setReference(""); setLines([blank(), blank()]);
    }
  }, [open, entry]);

  const totals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    return { debit, credit, diff: debit - credit };
  }, [lines]);

  const patch = (i: number, updates: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...updates } : l)));

  const save = async () => {
    if (!orgId) return toast.error("No workspace selected");
    if (!memo.trim()) return toast.error("Add a short description for this entry");
    const usable = lines.filter((l) => l.ledger_account_id && ((parseFloat(l.debit) || 0) || (parseFloat(l.credit) || 0)));
    if (usable.length < 2) return toast.error("A journal entry needs at least two lines");
    if (Math.abs(totals.diff) > 0.005) return toast.error("Debits and credits must balance");

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();

    let entryId = entry?.id;
    if (entryId) {
      const { error } = await supabase.from("journal_entries")
        .update({ entry_date: date, memo: memo.trim(), reference: reference.trim() || null })
        .eq("id", entryId);
      if (error) { setSaving(false); return toast.error(error.message); }
      await supabase.from("journal_lines").delete().eq("entry_id", entryId);
    } else {
      const { data, error } = await supabase.from("journal_entries")
        .insert({ org_id: orgId, entry_date: date, memo: memo.trim(), reference: reference.trim() || null, created_by: userData.user?.id })
        .select("id").single();
      if (error || !data) { setSaving(false); return toast.error(error?.message || "Could not save entry"); }
      entryId = data.id;
    }

    const { error: lineErr } = await supabase.from("journal_lines").insert(
      usable.map((l, i) => ({
        org_id: orgId,
        entry_id: entryId!,
        ledger_account_id: l.ledger_account_id,
        description: l.description.trim() || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        position: i,
      })),
    );
    setSaving(false);
    if (lineErr) return toast.error(lineErr.message);
    toast.success(entry ? "Journal entry updated" : "Journal entry posted");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{entry ? `Edit entry #${entry.entry_no}` : "New journal entry"}</DialogTitle>
          <DialogDescription>Every entry must balance — total debits equal total credits.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="je-date">Date</Label>
            <Input id="je-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="je-ref">Reference</Label>
            <Input id="je-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-0001, receipt no…" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="je-memo">Description</Label>
          <Textarea id="je-memo" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="What is this entry for?" />
        </div>

        <div className="space-y-2">
          <div className="hidden gap-2 text-xs uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[2fr_2fr_1fr_1fr_auto]">
            <span>Account</span><span>Line note</span><span>Debit</span><span>Credit</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[2fr_2fr_1fr_1fr_auto]">
              <Select value={l.ledger_account_id} onValueChange={(v) => patch(i, { ledger_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.is_active).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={l.description} onChange={(e) => patch(i, { description: e.target.value })} placeholder="Optional note" />
              <Input inputMode="decimal" value={l.debit} onChange={(e) => patch(i, { debit: e.target.value, credit: "" })} placeholder="0.00" aria-label="Debit" />
              <Input inputMode="decimal" value={l.credit} onChange={(e) => patch(i, { credit: e.target.value, debit: "" })} placeholder="0.00" aria-label="Credit" />
              <Button type="button" size="icon" variant="ghost" aria-label="Remove line"
                onClick={() => setLines((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, blank()])}>
            <Plus className="mr-2 h-4 w-4" />Add line
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
          <span className="text-muted-foreground">Totals</span>
          <div className="flex gap-4">
            <span>Debit <strong>{formatMoney(totals.debit)}</strong></span>
            <span>Credit <strong>{formatMoney(totals.credit)}</strong></span>
            <span className={Math.abs(totals.diff) > 0.005 ? "text-destructive" : "text-muted-foreground"}>
              Difference <strong>{formatMoney(Math.abs(totals.diff))}</strong>
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : entry ? "Save changes" : "Post entry"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
