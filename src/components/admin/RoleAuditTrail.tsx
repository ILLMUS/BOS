import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface AuditEntry {
  id: string;
  created_at: string;
  action: string;
  details: Json;
  user_id: string;
  actor_name?: string;
}

export default function RoleAuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditEntries();
  }, []);

  const fetchAuditEntries = async () => {
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .eq("action", "role_change")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      // Fetch actor names
      const actorIds = [...new Set(data.map((e) => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);

      const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

      setEntries(
        data.map((e) => ({
          ...e,
          actor_name: nameMap.get(e.user_id) ?? "Unknown",
        }))
      );
    }
    setLoading(false);
  };

  const getDetails = (details: Json) => {
    if (typeof details === "object" && details !== null && !Array.isArray(details)) {
      return details as Record<string, Json>;
    }
    return {};
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Role Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No role changes recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Role Change History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry) => {
          const d = getDetails(entry.details);
          return (
            <div
              key={entry.id}
              className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{String(d.target_user_name ?? "Unknown user")}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-muted-foreground">{String(d.summary ?? "")}</p>
              <p className="text-xs text-muted-foreground">
                Changed by <span className="font-medium text-foreground">{entry.actor_name}</span>
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
