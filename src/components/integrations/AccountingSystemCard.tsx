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
import { Calculator, ExternalLink, FileText, Receipt, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_ACCOUNTING_URL, accountingSectionUrl, isValidAccountingUrl,
  loadAccountingUrl, saveAccountingUrl,
} from "@/lib/accounting";
import { motion } from "framer-motion";

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
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <Calculator className="h-4 w-4" />
          </motion.div>
          <span className="truncate">Accounting System</span>
        </CardTitle>
        <p className="break-words text-xs text-slate-400 mt-1">
          Your quoting and accounting app handles quotes, invoices and receipts. Connecting it here
          lets every workflow launch it prefilled and pull the documents back into Finance.
        </p>
      </CardHeader>
      <CardContent className="p-4 text-xs sm:p-6 sm:text-sm min-w-0 space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg border border-teal-400/20 bg-teal-500/10 p-2 shrink-0">
              <Calculator className="h-4 w-4 text-teal-400" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <p className="font-semibold text-white truncate text-xs sm:text-sm">HustleOS Quotes</p>
                <Badge
                  variant="outline"
                  className={connected ? "border-teal-500/30 bg-teal-500/10 text-teal-400" : "border-slate-700 bg-slate-800 text-slate-400"}
                >
                  {connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
              <p className="break-all text-xs text-slate-400">
                {connected ? savedUrl : "Add the address of your accounting app to connect it."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0">
            {connected && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 border-white/10 bg-[#030d12] text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <a href={savedUrl} target="_blank" rel="noopener noreferrer">
                  Open <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                onClick={openDialog}
                className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400"
              >
                {connected ? "Manage" : "Connect"}
              </Button>
            </motion.div>
          </div>
        </div>

        {connected && (
          <div className="grid gap-3 sm:grid-cols-3 min-w-0">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.key}
                  href={accountingSectionUrl(savedUrl, s.key)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3.5 min-w-0 transition-colors hover:border-white/20 hover:bg-white/5"
                >
                  <div className="rounded-lg bg-white/5 p-2 shrink-0 border border-white/[0.06]">
                    <Icon className="h-4 w-4 text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white text-xs sm:text-sm">{s.label}</p>
                    <p className="text-[11px] text-slate-400">
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
        <DialogContent className="border-white/10 bg-[#05131a] text-white shadow-2xl backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Connect your accounting system</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Paste the web address of the app that handles your quotes, invoices and receipts.
              Workflow steps will open it prefilled with the client and job details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="accounting-url" className="text-xs font-medium text-slate-300">Accounting app address</Label>
              <Input
                id="accounting-url"
                value={url}
                placeholder={DEFAULT_ACCOUNTING_URL}
                onChange={(e) => setUrl(e.target.value)}
                className="h-9 border-white/10 bg-[#02080b] text-xs text-white placeholder:text-slate-600 focus-visible:ring-teal-500/50"
              />
              <p className="text-[11px] text-slate-400">
                Leave empty and save to disconnect.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {connected && (
              <Button
                variant="outline"
                onClick={() => save.mutate("")}
                disabled={save.isPending}
                className="h-8 border-rose-500/20 bg-rose-500/10 text-xs text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
              >
                {save.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
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
              className="h-8 bg-teal-500 text-xs font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-40"
            >
              {save.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}