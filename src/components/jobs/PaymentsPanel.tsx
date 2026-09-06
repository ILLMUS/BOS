import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, ExternalLink, Upload } from "lucide-react";
import JobFileLink from "@/components/jobs/JobFileLink";
import { toast } from "sonner";


interface Payment {
  id: string;
  payment_type: string;
  amount: number;
  method: string | null;
  reference: string | null;
  paid_at: string;
  proof_url: string | null;
  notes: string | null;
}

const TYPES = ["deposit", "progress", "variation", "final", "refund"];

export default function PaymentsPanel({ jobId, quotedAmount }: { jobId: string; quotedAmount?: number }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [type, setType] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("eft");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("job_payments").select("*").eq("job_id", jobId)
      .order("paid_at", { ascending: false });
    setItems((data || []) as Payment[]);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${jobId}/payments/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("job-files").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("job-files").getPublicUrl(path);
    setProofUrl(publicUrl);
    setUploading(false);
    toast.success("Proof uploaded");
  };

  const handleAdd = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("job_payments").insert({
      job_id: jobId, payment_type: type, amount: amt, method,
      reference: reference.trim() || null, paid_at: paidAt,
      proof_url: proofUrl || null, recorded_by: user.id,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment recorded");
    setAmount(""); setReference(""); setProofUrl(""); setShow(false);
    fetchItems();
  };

  const totalIn = items.filter((p) => p.payment_type !== "refund").reduce((s, p) => s + Number(p.amount), 0);
  const refunds = items.filter((p) => p.payment_type === "refund").reduce((s, p) => s + Number(p.amount), 0);
  const net = totalIn - refunds;
  const balance = quotedAmount ? quotedAmount - net : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg">Payment Ledger</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShow(!show)}>
            <Plus className="mr-1 h-4 w-4" /> Record
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {show && (
          <div className="space-y-2 rounded border border-border p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <select className="mt-1 w-full rounded border border-input bg-background p-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label>Method</Label>
                <select className="mt-1 w-full rounded border border-input bg-background p-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="eft">EFT</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
            </div>
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank ref / receipt no." maxLength={100} />
            <div>
              <Label>Proof of payment</Label>
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                    Upload
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleProofUpload} />
                  </label>
                </Button>
                {proofUrl && <span className="text-xs text-success">Attached</span>}
              </div>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Payment
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <>
            <div className="space-y-2">
              {items.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
                  <div>
                    <p className="font-medium capitalize">
                      {p.payment_type} — E{Number(p.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.paid_at} • {p.method || "—"}{p.reference ? ` • ${p.reference}` : ""}
                    </p>
                  </div>
                  {p.proof_url && (
                    <JobFileLink url={p.proof_url} className="text-accent">
                      <ExternalLink className="h-4 w-4" />
                    </JobFileLink>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border pt-2 text-sm">
              <div className="flex justify-between"><span>Net received</span><span className="font-medium">E{net.toFixed(2)}</span></div>
              {quotedAmount != null && (
                <div className="flex justify-between">
                  <span>Outstanding (vs quote)</span>
                  <span className={`font-medium ${(balance ?? 0) > 0 ? "text-destructive" : "text-success"}`}>
                    E{(balance ?? 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
