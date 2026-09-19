import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Calculator, ExternalLink, FileText, Receipt, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_ACCOUNTING_URL, accountingSectionUrl, isValidAccountingUrl,
  loadAccountingUrl, saveAccountingUrl,
} from "@/lib/accounting";

export default function AccountingSystemCard() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const { data: savedUrl = "" } = useQuery({
    queryKey: ["accounting-url"],
    queryFn: loadAccountingUrl,
  });

  const { data: docCounts } = useQuery({
    queryKey: ["accounting-doc-counts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_documents")
        .select("doc_type")
        .eq("org_id", orgId!);
      if (error) throw error;
      return (data ?? []).reduce<Record<string, number>>((acc, d) => {
        acc[d.doc_type] = (acc[d.doc_type] ?? 0) + 1;
        return acc;
      }, {});
    },
  });

  const save = useMutation({
    mutationFn: (value: string) => saveAccountingUrl(value),
    onSuccess: (value) => {
      qc.invalidateQueries({ queryKey: ["accounting-url"] });
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      setOpen(false);
      toast.success(value ? "Accounting system connected" : "Accounting system disconnected");
    },
    onError: () => toast.error("Could not save the accounting system link"),
  });

  const connected = !!savedUrl;

  const openDialog = () => {
    setUrl(savedUrl || DEFAULT_ACCOUNTING_URL);
    setOpen(true);
  };

  const sections = [
    { key: "quote" as const, label: "Quotes", icon: FileText },
    { key: "invoice" as const, label: "Invoices", icon: FileSpreadsheet },
    { key: "receipt" as const, label: "Receipts", icon: Receipt },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Accounting System</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your quoting and accounting app handles quotes, invoices and receipts. Connecting it here
          lets every workflow launch it prefilled and pull the documents back into Finance.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-accent/10 p-2">
              <Calculator className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">HustleOS Quotes</p>
                <Badge variant={connected ? "default" : "outline"}>
                  {connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {connected ? savedUrl : "Add the address of your accounting app to connect it."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {connected && (
              <Button asChild size="sm" variant="outline">
                <a href={savedUrl} target="_blank" rel="noopener noreferrer">
                  Open <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
            <Button size="sm" onClick={openDialog}>{connected ? "Manage" : "Connect"}</Button>
          </div>
        </div>

        {connected && (
          <div className="grid gap-3 sm:grid-cols-3">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.key}
                  href={accountingSectionUrl(savedUrl, s.key)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {docCounts?.[s.key] ?? 0} synced
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect your accounting system</DialogTitle>
            <DialogDescription>
              Paste the web address of the app that handles your quotes, invoices and receipts.
              Workflow steps will open it prefilled with the client and job details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="accounting-url">Accounting app address</Label>
            <Input
              id="accounting-url"
              value={url}
              placeholder={DEFAULT_ACCOUNTING_URL}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty and save to disconnect.
            </p>
          </div>
          <DialogFooter className="gap-2">
            {connected && (
              <Button variant="outline" onClick={() => save.mutate("")} disabled={save.isPending}>
                Disconnect
              </Button>
            )}
            <Button
              onClick={() => {
                if (url.trim() && !isValidAccountingUrl(url)) {
                  toast.error("Enter a valid web address");
                  return;
                }
                save.mutate(url);
              }}
              disabled={save.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
