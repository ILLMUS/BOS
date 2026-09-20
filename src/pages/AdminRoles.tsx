import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

interface OrgRole {
  id: string;
  name: string;
  description: string | null;
  is_admin: boolean;
}
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

export default function AdminRoles() {
  const { isAdmin, orgId } = useAuth();
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!orgId) return;
    const [r, p, ur] = await Promise.all([
      supabase.from("org_roles").select("*").eq("org_id", orgId).order("name"),
      supabase.from("profiles").select("id, full_name, email").eq("org_id", orgId).order("full_name"),
      supabase.from("user_org_roles").select("user_id, org_role_id").eq("org_id", orgId),
    ]);
    setRoles((r.data || []) as OrgRole[]);
    setMembers((p.data || []) as Member[]);
    const map: Record<string, string[]> = {};
    (ur.data || []).forEach((row: any) => {
      map[row.user_id] = [...(map[row.user_id] || []), row.org_role_id];
    });
    setAssignments(map);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin && orgId) load();
  }, [isAdmin, orgId]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const addRole = async () => {
    if (!name.trim() || !orgId) return;
    setAdding(true);
    const { error } = await supabase
      .from("org_roles")
      .insert({ org_id: orgId, name: name.trim(), description: description.trim() || null });
    setAdding(false);
    if (error) return toast.error(error.message);
    setName("");
    setDescription("");
    toast.success("Role created");
    load();
  };

  const removeRole = async (id: string) => {
    const { error } = await supabase.from("org_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role removed");
    load();
  };

  const toggleAssignment = async (userId: string, roleId: string, checked: boolean) => {
    if (!orgId) return;
    if (checked) {
      const { error } = await supabase
        .from("user_org_roles")
        .insert({ org_id: orgId, user_id: userId, org_role_id: roleId });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("user_org_roles")
        .delete()
        .eq("user_id", userId)
        .eq("org_role_id", roleId);
      if (error) return toast.error(error.message);
    }
    setAssignments((prev) => {
      const cur = prev[userId] || [];
      return { ...prev, [userId]: checked ? [...cur, roleId] : cur.filter((r) => r !== roleId) };
    });
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-[11px] text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
        Loading roles...
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-200">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-1 border-b border-white/[0.065] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Roles
            </h1>
            <p className="text-[11px] text-slate-400">
              Manage custom operational roles and map team responsibility across your organisation.
            </p>
          </div>
        </div>
      </div>

      {/* CREATE A ROLE CARD */}
      <GlassCard
        title="Create a role"
        subtitle='Name the roles your business actually uses — "Case Manager", "Head Chef", "Field Tech" — then use them when building your SOP steps.'
      >
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-300">Role name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Site Supervisor"
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-cyan-400/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-300">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role is responsible for"
                className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-cyan-400/20"
              />
            </div>
          </div>
          <Button
            onClick={addRole}
            disabled={adding || !name.trim()}
            className="h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-[11px] transition-colors"
          >
            {adding ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-2 h-3.5 w-3.5" />
            )}
            Add Role
          </Button>
        </div>
      </GlassCard>

      {/* ASSIGNMENTS TABLE CARD */}
      <GlassCard
        title="Who does what"
        subtitle="Tick the roles each team member holds."
      >
        {roles.length === 0 ? (
          <div className="p-6 text-center text-[11px] text-slate-400">
            Create your first role above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="px-5 py-3 text-left font-semibold text-slate-300">
                    Member
                  </th>
                  {roles.map((r) => (
                    <th key={r.id} className="px-4 py-3 text-left font-semibold text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{r.name}</span>
                        {!r.is_admin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                            onClick={() => removeRole(r.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {members.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-white/[0.01]">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-100">{m.full_name || "Unnamed member"}</p>
                      <p className="text-[10px] text-slate-400">{m.email}</p>
                    </td>
                    {roles.map((r) => (
                      <td key={r.id} className="px-4 py-3 align-middle">
                        <Checkbox
                          checked={(assignments[m.id] || []).includes(r.id)}
                          onCheckedChange={(v) => toggleAssignment(m.id, r.id, !!v)}
                          className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 data-[state=checked]:text-slate-950"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* FOOTER TIP */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
          Tip
        </span>
        Roles drive automatic step ownership — whoever holds a step's role gets notified when it goes live.
      </div>
    </div>
  );
}