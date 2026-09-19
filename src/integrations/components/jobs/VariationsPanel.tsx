import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Variation {
  id: string;
  variation_number: number;
  description: string;
  amount: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

export default function VariationsPanel({ jobId }: { jobId: string }) {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("job_variations")
      .select("*")
      .eq("job_id", jobId)
      .order("variation_number", { ascending: true });
    setItems((data || []) as Variation[]);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!description.trim() || isNaN(amt)) {
      toast.error("Description and a valid amount are required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("job_variations").insert({
      job_id: jobId,
      description: description.trim(),
      amount: amt,
      created_by: user.id,
      variation_number: 0,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Variation logged");
    setDescription(""); setAmount(""); setShowForm(false);
    fetchItems();
  };

  const setStatus = async (id: string, status: "approved" | "rejected", reason?: string) => {
    const { error } = await supabase
      .from("job_variations")
      .update({
        status,
        approved_by: user?.id,
        client_decision_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Variation ${status}`);
    fetchItems();
  };

  const total = items.filter((i) => i.status === "approved").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg">Variation Orders</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" /> Log Variation
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 rounded border border-border p-3">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} placeholder="What's changing? e.g. Add 2 extra panels" />
            <Label>Amount (excl. VAT)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variations logged.</p>
        ) : (
          <div className="space-y-2">
            {items.map((v) => (
              <div key={v.id} className="rounded border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Variation #{v.variation_number} — E{Number(v.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">{v.description}</p>
                    {v.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">Rejected: {v.rejection_reason}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      v.status === "approved" ? "border-success text-success"
                      : v.status === "rejected" ? "border-destructive text-destructive"
                      : "border-accent text-accent"
                    }
                  >
                    {v.status.toUpperCase()}
                  </Badge>
                </div>
                {v.status === "pending" && isAdmin && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="border-success text-success" onClick={() => setStatus(v.id, "approved")}>
                      <Check className="mr-1 h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-destructive text-destructive" onClick={() => {
                      const reason = prompt("Rejection reason:");
                      if (reason) setStatus(v.id, "rejected", reason);
                    }}>
                      <X className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div className="border-t border-border pt-2 text-sm font-medium">
              Approved variations total: E{total.toFixed(2)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
