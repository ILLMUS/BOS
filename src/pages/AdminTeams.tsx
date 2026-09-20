import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, UsersRound, UserPlus, ShieldAlert } from "lucide-react";
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

/* -------------------------------------------------------
   BUSINESS OS GLASS CARD CONTAINER
------------------------------------------------------- */
function GlassCard({
  children,
  className = "",
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[14px]
        border border-white/[0.085]
        bg-[#10151d]/95
        shadow-[0_18px_60px_rgba(0,0,0,0.24)]
        ${className}
      `}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/[0.035] blur-3xl" />

      {(title || subtitle || action) && (
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.085] bg-white/[0.02] px-6 py-3.5">
          <div>
            {title && (
              <div className="text-[12px] font-bold tracking-wide text-white sm:text-sm">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mt-0.5 text-[11px] text-slate-400">
                {subtitle}
              </div>
            )}
          </div>
          {action}
        </div>
      )}

      {children}
    </div>
  );
}

export default function AdminTeams() {
  const { isAdmin, orgId } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignments>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [inviteSeat, setInviteSeat] = useState<{
    fnKey: string;
    fnLabel: string;
    positionKey: string;
    title: string;
  } | null>(null);
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
      <div className="flex h-48 items-center justify-center text-[11px] text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
        Loading business teams...
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-1 border-b border-white/[0.065] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <UsersRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Business Teams
            </h1>
            <p className="text-[11px] text-slate-400">
              Put a name against every seat that runs acquisition, sales and finance. Each seat also becomes a role you can own workflow steps with.
            </p>
          </div>
        </div>
      </div>

      {/* EMPTY STATE */}
      {members.length === 0 && (
        <GlassCard>
          <div className="p-6 text-center text-[11px] text-slate-400">
            Invite people first and they'll appear here to assign.
          </div>
        </GlassCard>
      )}

      {/* TEAM FUNCTIONS LIST */}
      {TEAM_FUNCTIONS.map((fn) => {
        const filled = fn.positions.filter((p) => assignments[fn.key]?.[p.key]).length;
        const isFullyFilled = filled === fn.positions.length;

        return (
          <GlassCard
            key={fn.key}
            title={fn.label}
            subtitle={fn.description}
            action={
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                  isFullyFilled
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                }`}
              >
                {filled} / {fn.positions.length} filled
              </span>
            }
          >
            <div className="space-y-3 p-5">
              {fn.positions.map((pos) => {
                const current = assignments[fn.key]?.[pos.key] ?? NONE;
                const busy = savingKey === `${fn.key}.${pos.key}`;

                return (
                  <div
                    key={pos.key}
                    className="grid gap-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 sm:grid-cols-[1fr_260px] sm:items-center"
                  >
                    {/* Position Information */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12px] font-bold text-slate-100">{pos.title}</p>
                        <span
                          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                            pos.essential
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                              : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {pos.essential ? "Must have" : "Scales up"}
                        </span>
                        <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[9px] text-slate-400 uppercase">
                          {pos.authorityHint}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-400">{pos.duties}</p>
                      {current === NONE && pos.essential && (
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-400">
                          <ShieldAlert className="h-3 w-3" />
                          Unassigned — nobody is accountable for this yet.
                        </div>
                      )}
                    </div>

                    {/* Position Actions / Controls */}
                    <div className="space-y-2">
                      <Select
                        value={current}
                        disabled={busy || members.length === 0}
                        onValueChange={(v) => assign(fn.key, pos.key, pos.title, v)}
                      >
                        <SelectTrigger className="h-9 w-full rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40 focus:ring-cyan-400/20">
                          <SelectValue placeholder="Assign someone" />
                        </SelectTrigger>
                        <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                          <SelectItem value={NONE} className="text-[11px] text-slate-400">
                            Unassigned
                          </SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-[11px]">
                              {m.full_name || m.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
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
                        <UserPlus className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
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
            </div>
          </GlassCard>
        );
      })}

      {/* FOOTER TIP */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
          Tip
        </span>
        Assigning a seat creates a matching role, so workflow steps set to that role notify the right person automatically.
      </div>

      {/* INVITE DIALOG */}
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