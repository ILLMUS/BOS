import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type Expense, type Job } from "@/lib/finance";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import type { Tables } from "@/integrations/supabase/types";

const NONE = "none";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense?: Expense | null;
  jobs: Job[];
  accounts: Tables<"accounts">[];
  deals: Tables<"deals">[];
  defaultJobId?: string;
  onSaved: () => void;
}

export default function ExpenseDialog({ open, onOpenChange, expense, jobs, accounts, deals, defaultJobId, onSaved }: Props) {
  const { orgId, user } = useAuth();
  const { config } = useOrgConfig();
  // Workspace-configured lists, falling back to the shipped defaults.
  const categories = config.expense_categories?.length
    ? config.expense_categories
    : EXPENSE_CATEGORIES.map((c) => ({ key: c, label: EXPENSE_CATEGORY_LABELS[c] }));
  const methods = config.payment_methods ?? [];
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState("");
  const [method, setMethod] = useState("eft");
  const [reference, setReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [billable, setBillable] = useState(false);
  const [notes, setNotes] = useState("");
  const [jobId, setJobId] = useState<string>(NONE);
  const [accountId, setAccountId] = useState<string>(NONE);
  const [dealId, setDealId] = useState<string>(NONE);

  useEffect(() => {
    if (!open) return;
    setDescription(expense?.description ?? "");
    setAmount(expense ? String(expense.amount) : "");
    setCategory(expense?.category ?? "general");
    setSpentAt(expense?.spent_at ?? new Date().toISOString().slice(0, 10));
    setVendor(expense?.vendor ?? "");
    setMethod(expense?.method ?? "eft");
    setReference(expense?.reference ?? "");
    setReceiptUrl(expense?.receipt_url ?? "");
    setBillable(expense?.billable ?? false);
    setNotes(expense?.notes ?? "");
    setJobId(expense?.job_id ?? defaultJobId ?? NONE);
    setAccountId(expense?.account_id ?? NONE);
    setDealId(expense?.deal_id ?? NONE);
  }, [open, expense, defaultJobId]);

  // Keep the client/deal links consistent with the selected work.
  useEffect(() => {
    if (jobId === NONE) return;
    const job = jobs.find((j) => j.id === jobId);
    if (job?.account_id) setAccountId(job.account_id);
    if (job?.deal_id) setDealId(job.deal_id);
  }, [jobId, jobs]);

  const save = async () => {
    const value = Number(amount);
    if (!description.trim()) return toast.error("Add a short description");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter an amount greater than zero");
    if (!orgId || !user) return toast.error("No active workspace");

    setSaving(true);
    const payload = {
      org_id: orgId,
      description: description.trim(),
      amount: value,
      category,
      spent_at: spentAt,
      vendor: vendor.trim() || null,
      method: method || null,
      reference: reference.trim() || null,
      receipt_url: receiptUrl.trim() || null,
      billable,
      notes: notes.trim() || null,
      job_id: jobId === NONE ? null : jobId,
      account_id: accountId === NONE ? null : accountId,
      deal_id: dealId === NONE ? null : dealId,
    };

    const { error } = expense
      ? await supabase.from("expenses").update(payload).eq("id", expense.id)
      : await supabase.from("expenses").insert({ ...payload, recorded_by: user.id });

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(expense ? "Expense updated" : "Expense recorded");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{expense ? "Edit expense" : "Record expense"}</DialogTitle></DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="exp-desc">Description</Label>
            <Input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Steel sheeting for JOB-00012" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="exp-amount">Amount</Label>
              <Input id="exp-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.some((c) => c.key === category) ? null : (
                    <SelectItem value={category}>{category}</SelectItem>
                  )}
                  {categories.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exp-vendor">Supplier</Label>
              <Input id="exp-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Linked work</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger><SelectValue placeholder="No job" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No job (overhead)</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.job_number} · {j.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Client</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No client</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Deal</Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger><SelectValue placeholder="No deal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No deal</SelectItem>
                  {deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="exp-method">Paid by</Label>
              {methods.length ? (
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="exp-method"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {methods.some((m) => m.key === method) || !method ? null : (
                      <SelectItem value={method}>{method}</SelectItem>
                    )}
                    {methods.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="exp-method" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="eft / card / cash" />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exp-ref">Reference</Label>
              <Input id="exp-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="exp-receipt">Receipt link</Label>
            <Input id="exp-receipt" value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Billable to client</p>
              <p className="text-xs text-muted-foreground">Recover this cost through a variation or invoice.</p>
            </div>
            <Switch checked={billable} onCheckedChange={setBillable} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="exp-notes">Notes</Label>
            <Textarea id="exp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {expense ? "Save changes" : "Record expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
