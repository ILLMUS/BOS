import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ShieldQuestion, X } from "lucide-react";
import { toast } from "sonner";
import { AUTHORITY, AUTHORITY_LABELS, type AuthorityLevel } from "@/lib/authority";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RequestRow {
  id: string;
  user_id: string;
  path: string;
  label: string;
  required_authority: number;
  note: string | null;
  created_at: string;
  requester?: { full_name: string; email: string } | null;
}

/** Role granted when an admin approves a request at a given standing. */
const ROLE_FOR_AUTHORITY: Record<number, AppRole | null> = {
  1: null,
  2: "operations_manager",
  3: "owner_director",
  4: "super_admin",
};

export default function AccessRequestsQueue() {
  const { orgId, user } = useAuth();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("access_requests")
      .select("id, user_id, path, label, required_authority, note, created_at")
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const requests = (data as RequestRow[]) ?? [];
    if (requests.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", requests.map((r) => r.user_id));
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      requests.forEach((r) => {
        const p = byId.get(r.user_id);
        r.requester = p ? { full_name: p.full_name, email: p.email } : null;
      });
    }
    setRows(requests);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (row: RequestRow, grant: boolean) => {
    if (!orgId || !user) return;
    setBusy(row.id);
    try {
      if (grant) {
        // Attach the member to the workspace, then delegate the standing needed.
        const { data: membership } = await supabase
          .from("organization_members")
          .select("id")
          .eq("org_id", orgId)
          .eq("user_id", row.user_id)
          .maybeSingle();
        if (!membership) {
          const { error } = await supabase
            .from("organization_members")
            .insert({ org_id: orgId, user_id: row.user_id });
          if (error) throw error;
        }
        await supabase.from("profiles").update({ org_id: orgId }).eq("id", row.user_id);

        const role = ROLE_FOR_AUTHORITY[row.required_authority] ?? null;
        if (role) {
          const { error } = await supabase
            .from("user_roles")
            .insert({ user_id: row.user_id, org_id: orgId, role });
          if (error && !error.message.includes("duplicate")) throw error;
        }
      }

      const { error: updErr } = await supabase
        .from("access_requests")
        .update({
          status: grant ? "granted" : "declined",
          handled_by: user.id,
          handled_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (updErr) throw updErr;

      await supabase.from("notifications").insert({
        user_id: row.user_id,
        title: grant ? "Access granted" : "Access request declined",
        message: grant
          ? `Your standing was updated — ${row.label} (${row.path}) is now available.`
          : `Your request for ${row.label} (${row.path}) was declined.`,
        type: grant ? "access_granted" : "access_declined",
      });

      toast.success(grant ? "Access granted" : "Request declined");
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err: any) {
      toast.error(err?.message || "Could not update the request");
    } finally {
      setBusy(null);
    }
  };

  if (!orgId) return null;
  if (!loading && rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <ShieldQuestion className="h-5 w-5 text-primary" />
          Access requests
          {rows.length > 0 && <Badge variant="secondary">{rows.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.requester?.full_name || "Workspace member"}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {row.requester?.email}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Wants {row.label} ({row.path}) —{" "}
                  {AUTHORITY_LABELS[
                    (Math.min(row.required_authority, AUTHORITY.OWNER) as AuthorityLevel)
                  ]}{" "}
                  standing
                </p>
                {row.note && <p className="mt-1 text-xs italic text-muted-foreground">“{row.note}”</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  disabled={busy === row.id}
                  onClick={() => resolve(row, true)}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Grant
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === row.id}
                  onClick={() => resolve(row, false)}
                >
                  <X className="mr-1 h-4 w-4" />
                  Decline
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
