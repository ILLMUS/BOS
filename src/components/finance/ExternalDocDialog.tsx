import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CURRENCY_CODE } from "@/lib/currency";
import type { ExternalDoc, Job } from "@/lib/finance";
import type { Tables } from "@/integrations/supabase/types";

const NONE = "none";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc?: ExternalDoc | null;
  /** Prefills a brand-new document (used by the worked example templates). */
  preset?: Partial<ExternalDoc> | null;
  jobs: Job[];
  accounts: Tables<"accounts">[];
  deals: Tables<"deals">[];
  onSaved: () => void;
}

/**
 * Records a quote, invoice or receipt that was produced in the external
 * document builder, so Finance totals stay correct without duplicating
 * the accounting workflow inside this app.
 */
export default function ExternalDocDialog({ open, onOpenChange, doc, preset, jobs, accounts, deals, onSaved }: Props) {
  const { orgId, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [docType, setDocType] = useState<string>("quote");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("issued");
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState<string>(NONE);
  const [dealId, setDealId] = useState<string>(NONE);
  const [jobId, setJobId] = useState<string>(NONE);
  const [isExample, setIsExample] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = doc ?? preset ?? null;
    setDocType(base?.doc_type ?? "quote");
    setReference(base?.reference ?? "");
    setAmount(base?.amount != null ? String(base.amount) : "");
    setStatus(base?.status ?? "issued");
    setIssuedAt(base?.issued_at ?? new Date().toISOString().slice(0, 10));
    setDueDate(base?.due_date ?? "");
    setClientName(base?.client_name ?? "");
    setDocumentUrl(base?.document_url ?? "");
    setNotes(base?.notes ?? "");
    setAccountId(base?.account_id ?? NONE);
    setDealId(base?.deal_id ?? NONE);
    setJobId(base?.job_id ?? NONE);
    setIsExample(base?.is_example ?? false);
  }, [open, doc, preset]);

  const save = async () => {
    if (!orgId) return;
    if (!reference.trim()) return toast.error("Document number is required");
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) return toast.error("Enter a valid amount");

    setSaving(true);
    const account = accountId === NONE ? null : accounts.find((a) => a.id === accountId) || null;
    const payload = {
      org_id: orgId,
      doc_type: docType,
      reference: reference.trim(),
      amount: value,
      currency: CURRENCY_CODE,
      status,
      issued_at: issuedAt,
      due_date: dueDate || null,
      client_name: clientName.trim() || account?.name || null,
      document_url: documentUrl.trim() || null,
      notes: notes.trim() || null,
      account_id: accountId === NONE ? null : accountId,
      deal_id: dealId === NONE ? null : dealId,
      job_id: jobId === NONE ? null : jobId,
      source: doc?.source ?? "manual",
      is_example: isExample,
      created_by: user?.id ?? null,
    };

    const { error } = doc
      ? await supabase.from("finance_documents").update(payload).eq("id", doc.id)
      : await supabase.from("finance_documents").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(doc ? "Document updated" : "Document recorded");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{doc ? "Edit document" : "Record external document"}</DialogTitle>
          <DialogDescription>
            Mirror a quote, invoice or receipt from your document builder so Finance totals stay accurate.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="receipt">Receipt / payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-ref">Document number</Label>
              <Input id="ed-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="QTE-1042" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-amount">Amount</Label>
              <Input id="ed-amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-issued">Issue date</Label>
              <Input id="ed-issued" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-due">Due date</Label>
              <Input id="ed-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Link to a client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not linked</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Deal</Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Work item</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not linked</SelectItem>
                  {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.job_number} · {j.client_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ed-client">Client name shown on the document</Label>
            <Input id="ed-client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Optional" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ed-url">Document link</Label>
            <Input id="ed-url" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ed-notes">Notes</Label>
            <Textarea id="ed-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ed-example">Example record</Label>
              <p className="text-xs text-muted-foreground">
                Marks this as a sample document so it can be hidden or filtered out from real client data.
              </p>
            </div>
            <Switch id="ed-example" checked={isExample} onCheckedChange={setIsExample} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {doc ? "Save changes" : "Record document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}