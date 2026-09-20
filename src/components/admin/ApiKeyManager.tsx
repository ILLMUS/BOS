import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Key, Copy, Check, Trash2, Plus, Shield, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export default function ApiKeyManager() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const [newKeyLabel, setNewKeyLabel] = useState("Default API Key");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [quoteBuilderUrl, setQuoteBuilderUrl] = useState("");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-builder-api`;

  const { data: savedUrl } = useQuery({
    queryKey: ["app-settings", "quote_builder_base_url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "quote_builder_base_url")
        .maybeSingle();
      return data?.value || "";
    },
  });

  useEffect(() => {
    if (savedUrl !== undefined) setQuoteBuilderUrl(savedUrl);
  }, [savedUrl]);

  const saveUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const trimmed = url.trim();
      if (trimmed) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: "quote_builder_base_url", value: trimmed, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) throw error;
      } else {
        await supabase.from("app_settings").delete().eq("key", "quote_builder_base_url");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Quote Builder URL saved");
    },
    onError: () => toast.error("Failed to save URL"),
  });

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (label: string) => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const rawKey = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
      const apiKey = `rsq_${rawKey}`;

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const keyPreview = `rsq_...${rawKey.slice(-8)}`;

      const { error } = await supabase.from("api_keys").insert({
        org_id: orgId!,
        key_hash: keyHash,
        key_preview: keyPreview,
        label,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });

      if (error) throw error;
      return apiKey;
    },
    onSuccess: (apiKey) => {
      setGeneratedKey(apiKey);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key generated! Copy it now — it won't be shown again.");
    },
    onError: () => toast.error("Failed to generate API key"),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
    onError: () => toast.error("Failed to revoke key"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted");
    },
    onError: () => toast.error("Failed to delete key"),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="relative w-full min-w-0 overflow-hidden border-white/[0.08] bg-[#05131a]/80 text-white shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/[0.06] p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white sm:text-lg min-w-0">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-500/10 text-teal-400"
          >
            <Shield className="h-4 w-4" />
          </motion.div>
          <span className="truncate">Quote Builder API</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-4 text-xs sm:p-6 sm:text-sm min-w-0">
        {/* BASE URL BANNER */}
        <div className="space-y-1.5 min-w-0">
          <p className="font-semibold text-slate-300">API Base URL</p>
          <div className="flex items-center gap-2 min-w-0">
            <code className="flex-1 truncate rounded-lg border border-white/[0.08] bg-[#02080b]/90 px-3 py-2 font-mono text-xs text-teal-300">
              {baseUrl}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 border border-white/[0.08] bg-[#02080b]/80 text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={() => copyToClipboard(baseUrl, "API URL")}
              aria-label="Copy API Base URL"
            >
              {copied === "API URL" ? <Check className="h-4 w-4 text-teal-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="break-words text-[11px] text-slate-400">
            Use <code className="rounded bg-white/5 px-1 py-0.5 text-slate-300">?job_id=UUID</code> to target a specific job. Authenticate with <code className="rounded bg-white/5 px-1 py-0.5 text-slate-300">x-api-key: YOUR_KEY</code> header.
          </p>
        </div>

        {/* GENERATE KEY SECTION */}
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 space-y-3 min-w-0">
          <p className="font-semibold text-white">Generate New API Key</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
            <Input
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Key label..."
              className="h-9 border-white/[0.1] bg-[#030d12]/80 text-xs text-white focus:border-teal-400/50 min-w-0"
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
              <Button
                onClick={() => generateMutation.mutate(newKeyLabel)}
                disabled={generateMutation.isPending || !newKeyLabel.trim()}
                size="sm"
                className="h-9 w-full sm:w-auto bg-teal-500 font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Generate
              </Button>
            </motion.div>
          </div>

          <AnimatePresence>
            {generatedKey && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-3 rounded-lg border border-teal-500/30 bg-teal-500/10 p-3.5 space-y-2.5 min-w-0"
              >
                <p className="font-semibold text-teal-300 text-xs flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  Copy this key now — it won't be shown again!
                </p>
                <div className="flex items-center gap-2 min-w-0">
                  <code className="flex-1 break-all rounded-md border border-teal-500/20 bg-[#02080b] p-2 font-mono text-xs text-teal-200 min-w-0">
                    {generatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 border-teal-500/30 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30"
                    onClick={() => copyToClipboard(generatedKey, "API Key")}
                    aria-label="Copy Generated Key"
                  >
                    {copied === "API Key" ? <Check className="h-4 w-4 text-teal-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGeneratedKey(null)}
                  className="h-7 text-[11px] text-slate-400 hover:text-white"
                >
                  Dismiss
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ACTIVE KEYS LIST */}
        <div className="space-y-3 min-w-0">
          <p className="font-semibold text-white">Active Keys</p>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
            </div>
          ) : !keys?.length ? (
            <p className="text-slate-400 text-xs">No API keys generated yet.</p>
          ) : (
            <div className="space-y-2 min-w-0">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-3 min-w-0 transition-colors hover:border-white/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                      <Key className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-200 truncate text-xs">{key.label}</p>
                      <p className="font-mono text-[11px] text-slate-400 truncate">{key.key_preview}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={key.is_active ? "border-teal-500/30 bg-teal-500/10 text-teal-400" : "border-slate-700 bg-slate-800 text-slate-400"}
                    >
                      {key.is_active ? "Active" : "Revoked"}
                    </Badge>
                    {key.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeMutation.mutate(key.id)}
                        disabled={revokeMutation.isPending}
                        className="h-7 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(key.id)}
                        disabled={deleteMutation.isPending}
                        className="h-7 w-7 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                        aria-label="Delete API Key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EXTERNAL QUOTE BUILDER URL */}
        <div className="rounded-xl border border-white/[0.08] bg-[#02080b]/60 p-4 space-y-3 min-w-0">
          <div>
            <p className="font-semibold text-white">External Quote Builder URL</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Set the base URL of your external quote builder app. A "Launch" button will appear on the Quotation Preparation stage with the job ID pre-filled.
            </p>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Input
              value={quoteBuilderUrl}
              onChange={(e) => setQuoteBuilderUrl(e.target.value)}
              placeholder="https://your-quote-builder.app"
              className="h-9 border-white/[0.1] bg-[#030d12]/80 text-xs text-white focus:border-teal-400/50 min-w-0"
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
              <Button
                size="sm"
                onClick={() => saveUrlMutation.mutate(quoteBuilderUrl)}
                disabled={saveUrlMutation.isPending}
                className="h-9 bg-teal-500 font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
              >
                {saveUrlMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* QUICK START GUIDE */}
        <div className="rounded-xl border border-white/[0.06] bg-[#02080b]/90 p-4 space-y-2 min-w-0">
          <p className="font-semibold text-slate-300 text-xs">Quick Start</p>
          <div className="space-y-1 font-mono text-[11px] text-slate-400 break-words">
            <p><strong className="text-teal-400 font-semibold">GET</strong> data: <code className="text-slate-300">GET {baseUrl}?job_id=JOB_UUID</code></p>
            <p><strong className="text-teal-400 font-semibold">POST</strong> quote: <code className="text-slate-300">POST {baseUrl}?job_id=JOB_UUID</code></p>
            <p>Header: <code className="text-slate-300">x-api-key: YOUR_API_KEY</code></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}