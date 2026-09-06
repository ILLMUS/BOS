import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Key, Copy, Check, Trash2, Plus, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          Quote Builder API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">API Base URL</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-3 py-2 rounded flex-1 truncate">{baseUrl}</code>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 shrink-0"
              onClick={() => copyToClipboard(baseUrl, "API URL")}
            >
              {copied === "API URL" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use <code className="text-xs">?job_id=UUID</code> to target a specific job. Authenticate with <code className="text-xs">x-api-key: YOUR_KEY</code> header.
          </p>
        </div>

        <div className="border rounded-lg p-3 space-y-3">
          <p className="text-sm font-semibold">Generate New API Key</p>
          <div className="flex items-center gap-2">
            <Input
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Key label..."
              className="flex-1"
            />
            <Button
              onClick={() => generateMutation.mutate(newKeyLabel)}
              disabled={generateMutation.isPending || !newKeyLabel.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Generate
            </Button>
          </div>

          {generatedKey && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-success">⚠️ Copy this key now — it won't be shown again!</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background px-3 py-2 rounded flex-1 break-all font-mono">
                  {generatedKey}
                </code>
                <Button
                  variant="outline" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(generatedKey, "API Key")}
                >
                  {copied === "API Key" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setGeneratedKey(null)} className="text-xs">
                Dismiss
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Active Keys</p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !keys?.length ? (
            <p className="text-sm text-muted-foreground">No API keys generated yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{key.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{key.key_preview}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={key.is_active ? "default" : "secondary"}>
                      {key.is_active ? "Active" : "Revoked"}
                    </Badge>
                    {key.is_active ? (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => revokeMutation.mutate(key.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => deleteMutation.mutate(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-3 space-y-3">
          <p className="text-sm font-semibold">External Quote Builder URL</p>
          <p className="text-xs text-muted-foreground">
            Set the base URL of your external quote builder app. A "Launch" button will appear on the Quotation Preparation stage with the job ID pre-filled.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={quoteBuilderUrl}
              onChange={(e) => setQuoteBuilderUrl(e.target.value)}
              placeholder="https://your-quote-builder.app"
              className="flex-1"
            />
            <Button size="sm" onClick={() => saveUrlMutation.mutate(quoteBuilderUrl)} disabled={saveUrlMutation.isPending}>
              Save
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold">Quick Start</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>GET</strong> data: <code>GET {baseUrl}?job_id=JOB_UUID</code></p>
            <p><strong>POST</strong> quote: <code>POST {baseUrl}?job_id=JOB_UUID</code></p>
            <p>Header: <code>x-api-key: YOUR_API_KEY</code></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
