import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, UsersRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import InviteSeatDialog from "@/components/admin/InviteSeatDialog";
import SeatAccountControls, { loadAccountStatuses } from "@/components/admin/SeatAccountControls";
import {
  TEAM_FUNCTIONS,
  loadTeamAssignments,
  saveTeamAssignments,
  syncPositionRole,
  type TeamAssignments,
} from "@/lib/teams";

const NONE = "__none__";

interface Member {
  id: string;
  full_name: string;
  email: string;
}

export default function AdminTeams() {
  const { isAdmin, orgId } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignments>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [inviteSeat, setInviteSeat] = useState<
    { fnKey: string; fnLabel: string; positionKey: string; title: string } | null
  >(null);
  const [suspended, setSuspended] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orgId) return;
      try {
        const [p, a, s] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email").eq("org_id", orgId).order("full_name"),
          loadTeamAssignments(orgId).catch(() => ({} as TeamAssignments)),
          loadAccountStatuses().catch(() => ({} as Record<string, boolean>)),
        ]);
        if (cancelled) return;
        setMembers((p.data || []) as Member[]);
        setAssignments(a);
        setSuspended(s);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (isAdmin && orgId) load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, orgId]);

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.full_name || m.email]));
    return (id?: string) => (id ? map.get(id) ?? "Unknown member" : null);
  }, [members]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const refreshMembers = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("org_id", orgId)
      .order("full_name");
    setMembers((data || []) as Member[]);
  };

  const assign = async (fnKey: string, positionKey: string, title: string, value: string, name?: string) => {
    if (!orgId) return;
    const userId = value === NONE ? null : value;
    const previous = assignments[fnKey]?.[positionKey] ?? null;
    const next: TeamAssignments = {
      ...assignments,
      [fnKey]: { ...(assignments[fnKey] || {}) },
    };
    if (userId) next[fnKey][positionKey] = userId;
    else delete next[fnKey][positionKey];

    setSavingKey(`${fnKey}.${positionKey}`);
    try {
      await saveTeamAssignments(orgId, next);
      await syncPositionRole(orgId, title, userId, previous);
      setAssignments(next);
      toast.success(userId ? `${title} assigned to ${name ?? memberName(userId)}` : `${title} cleared`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save that assignment");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UsersRound className="h-6 w-6 text-accent" />
        <div>
          <h1 className="font-heading text-2xl font-bold">Business Teams</h1>
          <p className="text-sm text-muted-foreground">
            Put a name against every seat that runs acquisition, sales and finance. Each seat also becomes a
            role you can own workflow steps with.
          </p>
        </div>
      </div>

      {members.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Invite people first and they'll appear here to assign.
          </CardContent>
        </Card>
      )}

      {TEAM_FUNCTIONS.map((fn) => {
        const filled = fn.positions.filter((p) => assignments[fn.key]?.[p.key]).length;
        return (
          <Card key={fn.key}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{fn.label}</CardTitle>
                  <CardDescription>{fn.description}</CardDescription>
                </div>
                <Badge variant={filled === fn.positions.length ? "default" : "outline"}>
                  {filled} / {fn.positions.length} filled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {fn.positions.map((pos) => {
                const current = assignments[fn.key]?.[pos.key] ?? NONE;
                const busy = savingKey === `${fn.key}.${pos.key}`;
                return (
                  <div
                    key={pos.key}
                    className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_260px] sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{pos.title}</p>
                        <Badge variant={pos.essential ? "secondary" : "outline"} className="text-[10px] uppercase">
                          {pos.essential ? "Must have" : "Scales up"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {pos.authorityHint}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{pos.duties}</p>
                      {current === NONE && pos.essential && (
                        <p className="text-xs text-destructive">Unassigned — nobody is accountable for this yet.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Select
                        value={current}
                        disabled={busy || members.length === 0}
                        onValueChange={(v) => assign(fn.key, pos.key, pos.title, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Assign someone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Unassigned</SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.full_name || m.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={busy}
                        onClick={() =>
                          setInviteSeat({
                            fnKey: fn.key,
                            fnLabel: fn.label,
                            positionKey: pos.key,
                            title: pos.title,
                          })
                        }
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite someone new
                      </Button>
                      {current !== NONE && (
                        <SeatAccountControls
                          userId={current}
                          name={memberName(current) ?? "this person"}
                          suspended={!!suspended[current]}
                          onChanged={(v) => setSuspended((prev) => ({ ...prev, [current]: v }))}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-2">Tip</Badge>
        Assigning a seat creates a matching role, so workflow steps set to that role notify the right person
        automatically.
      </p>

      {inviteSeat && (
        <InviteSeatDialog
          open
          onOpenChange={(v) => {
            if (!v) setInviteSeat(null);
          }}
          seatTitle={inviteSeat.title}
          seatKey={inviteSeat.positionKey}
          functionLabel={inviteSeat.fnLabel}
          onInvited={async (userId, name) => {
            await refreshMembers();
            await assign(inviteSeat.fnKey, inviteSeat.positionKey, inviteSeat.title, userId, name);
          }}
        />
      )}
    </div>
  );
}
