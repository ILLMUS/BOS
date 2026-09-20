import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Loader2, UserPlus, Trash2, Link as LinkIcon, Mail, Key, UserCheck, ChevronDown, Shield, Workflow, Layers } from "lucide-react";
import UserRoleEditor from "@/components/admin/UserRoleEditor";
import RoleAuditTrail from "@/components/admin/RoleAuditTrail";
import AccessRequestsQueue from "@/components/admin/AccessRequestsQueue";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Navigate } from "react-router-dom";
import type { Tables, Database } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type AppRole = Database["public"]["Enums"]["app_role"];

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
  title?: string;
  subtitle?: string;
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
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 sm:text-xs">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}

      {children}
    </div>
  );
}

async function edgeErrorMessage(error: any, fallback: string) {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.clone().json();
      if (body?.error) return body.error as string;
    }
  } catch (_e) {
    // ignore parse issues and fall through
  }
  return error?.message || fallback;
}

interface UserWithRoles extends Profile {
  roles: AppRole[];
  orgRoleIds: string[];
  orgRoleNames: string[];
  assignedStages: string[];
}

interface OrgRole {
  id: string;
  name: string;
}

interface WorkflowStage {
  name: string;
  primary_role_id: string | null;
  secondary_role_id: string | null;
}

const formatWhen = (value?: string | null) => {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function InviteStatus({ user }: { user: Profile }) {
  const emailedAt = formatWhen(user.invite_email_sent_at);
  const invitedAt = formatWhen(user.invited_at);
  const signedInAt = formatWhen(user.last_sign_in_at);

  let label = "Not invited";
  let badgeStyle = "border-slate-500/30 bg-slate-500/10 text-slate-400";

  if (user.last_sign_in_at) {
    label = "Active";
    badgeStyle = "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  } else if (user.invite_email_status === "sent") {
    label = "Invite emailed";
    badgeStyle = "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
  } else if (user.invite_email_status === "link_only") {
    label = "Link only";
    badgeStyle = "border-amber-400/30 bg-amber-400/10 text-amber-300";
  } else if (user.invite_email_status === "failed") {
    label = "Email failed";
    badgeStyle = "border-rose-400/30 bg-rose-400/10 text-rose-300";
  } else if (user.invited_at) {
    label = "Invited";
    badgeStyle = "border-slate-400/30 bg-slate-400/10 text-slate-300";
  }

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${badgeStyle}`}
      >
        {label}
      </span>
      <p className="font-mono text-[10px] text-slate-400">
        {emailedAt
          ? `Last email ${emailedAt}`
          : signedInAt
            ? `Signed in ${signedInAt}`
            : invitedAt
              ? `Invited ${invitedAt}`
              : "No email sent"}
      </p>
    </div>
  );
}

export default function AdminUsers() {
  const { isAdmin, orgId } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [orgRoles, setOrgRoles] = useState<OrgRole[]>([]);
  const [workflowName, setWorkflowName] = useState<string | null>(null);
  const [roleStages, setRoleStages] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "" as string,
    accessLevel: "none" as string,
  });
  const [inviteMode, setInviteMode] = useState(true);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string>("");

  useEffect(() => {
    if (isAdmin && orgId) fetchUsers();
  }, [isAdmin, orgId]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const fetchUsers = async () => {
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("org_id", orgId!);
    const memberIds = Array.from(new Set((members || []).map((m: any) => m.user_id as string)));

    const [{ data: profiles }, { data: roles }, { data: oRoles }, { data: userOrgRoles }, { data: templates }] =
      await Promise.all([
        memberIds.length
          ? supabase.from("profiles").select("*").in("id", memberIds).order("created_at")
          : supabase.from("profiles").select("*").eq("org_id", orgId!).order("created_at"),
        supabase.from("user_roles").select("*").eq("org_id", orgId!),
        supabase.from("org_roles").select("id, name").eq("org_id", orgId!).order("name"),
        supabase.from("user_org_roles").select("user_id, org_role_id").eq("org_id", orgId!),
        supabase
          .from("sop_templates")
          .select("id, name, is_active, created_at")
          .eq("org_id", orgId!)
          .order("created_at", { ascending: false }),
      ]);

    const roleList = (oRoles || []) as OrgRole[];
    setOrgRoles(roleList);

    const active = (templates || []).find((t: any) => t.is_active) ?? (templates || [])[0];
    setWorkflowName(active?.name ?? null);

    let stages: WorkflowStage[] = [];
    if (active) {
      const { data } = await supabase
        .from("sop_stages")
        .select("name, primary_role_id, secondary_role_id")
        .eq("template_id", active.id)
        .order("position");
      stages = (data || []) as WorkflowStage[];
    }

    const stageMap: Record<string, string[]> = {};
    stages.forEach((s) => {
      [s.primary_role_id, s.secondary_role_id].forEach((rid) => {
        if (!rid) return;
        stageMap[rid] = [...(stageMap[rid] || []), s.name];
      });
    });
    setRoleStages(stageMap);

    if (profiles) {
      const usersWithRoles: UserWithRoles[] = profiles.map((p) => {
        const userRoles = (roles || []).filter((r) => r.user_id === p.id).map((r) => r.role);
        const orgRoleIds = (userOrgRoles || [])
          .filter((r: any) => r.user_id === p.id)
          .map((r: any) => r.org_role_id as string);
        const orgRoleNames = orgRoleIds
          .map((id) => roleList.find((r) => r.id === id)?.name)
          .filter(Boolean) as string[];
        const assignedStages = stages
          .filter(
            (s) =>
              (s.primary_role_id && orgRoleIds.includes(s.primary_role_id)) ||
              (s.secondary_role_id && orgRoleIds.includes(s.secondary_role_id))
          )
          .map((s) => s.name);
        return { ...p, roles: userRoles, orgRoleIds, orgRoleNames, assignedStages };
      });
      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: {
          email: newUser.email,
          password: inviteMode ? null : newUser.password,
          full_name: newUser.full_name,
          org_role_id: newUser.role || null,
          role: newUser.accessLevel && newUser.accessLevel !== "none" ? newUser.accessLevel : null,
          redirect_to: `${window.location.origin}/dashboard`,
        },
      });
      if (res.error) throw new Error(await edgeErrorMessage(res.error, "Failed to create user"));
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(
        res.data?.email_sent
          ? `Invite email sent to ${newUser.email}`
          : res.data?.mode === "linked"
            ? "Existing account added to your team"
            : "Member created — share the sign-in details below"
      );
      setInviteLink(res.data?.invite_link ?? null);
      setTempPassword(res.data?.temp_password ?? (inviteMode ? null : newUser.password));
      setEmailSent(!!res.data?.email_sent);
      setInvitedEmail(newUser.email);
      if (!res.data?.invite_link && !res.data?.temp_password) setShowCreate(false);
      setNewUser({ email: "", password: "", full_name: "", role: "", accessLevel: "none" });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLoginLink = async (u: UserWithRoles) => {
    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: {
          email: u.email,
          full_name: u.full_name,
          redirect_to: `${window.location.origin}/dashboard`,
        },
      });
      if (res.error) throw new Error(await edgeErrorMessage(res.error, "Failed to generate link"));
      if (res.data?.error) throw new Error(res.data.error);

      if (!res.data?.invite_link) throw new Error("Could not generate a link");
      await navigator.clipboard.writeText(res.data.invite_link);
      toast.success(`Sign-in link copied for ${u.full_name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate link");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const res = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (res.error) throw new Error(await edgeErrorMessage(res.error, "Failed to delete user"));
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`${userName} has been removed`);

      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-[11px] text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
        Loading team members...
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-200">
      <AccessRequestsQueue />

      {/* HEADER BAR */}
      <div className="flex flex-col gap-3 border-b border-white/[0.065] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            User Management
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {workflowName ? `Roles and steps from "${workflowName}"` : "Invite members and assign workflow roles"}
          </p>
        </div>

        {/* INVITE DIALOG TRIGGER */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="h-8 rounded-lg bg-cyan-500 px-3.5 text-[11px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] active:scale-[0.98]">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite Member
            </Button>
          </DialogTrigger>

          <DialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.4)] sm:max-w-xl">
            <DialogHeader className="border-b border-white/[0.065] pb-3">
              <DialogTitle className="text-sm font-bold text-white">
                {inviteMode ? "Invite Team Member" : "Create New User"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
              <div className="flex gap-2 rounded-xl border border-white/[0.08] bg-[#0b0e14] p-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`flex-1 rounded-lg text-[11px] font-semibold transition-all ${
                    inviteMode ? "bg-cyan-500/10 text-cyan-300" : "text-slate-400 hover:text-slate-200"
                  }`}
                  onClick={() => setInviteMode(true)}
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> Send Invite Email
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`flex-1 rounded-lg text-[11px] font-semibold transition-all ${
                    !inviteMode ? "bg-cyan-500/10 text-cyan-300" : "text-slate-400 hover:text-slate-200"
                  }`}
                  onClick={() => setInviteMode(false)}
                >
                  <Key className="mr-1.5 h-3.5 w-3.5" /> Set Password
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Full Name *
                  </Label>
                  <Input
                    value={newUser.full_name}
                    onChange={(e) => setNewUser((u) => ({ ...u, full_name: e.target.value }))}
                    required
                    className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Email *
                  </Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                    required
                    className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40"
                  />
                </div>

                {!inviteMode && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Password *
                    </Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                      required
                      minLength={6}
                      className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-200 focus:border-cyan-400/40"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Role *
                  </Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser((u) => ({ ...u, role: v }))}>
                    <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                      <SelectValue placeholder={orgRoles.length ? "Select role..." : "No roles defined"} />
                    </SelectTrigger>
                    <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                      {orgRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-[11px]">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Access Level
                  </Label>
                  <Select
                    value={newUser.accessLevel}
                    onValueChange={(v) => setNewUser((u) => ({ ...u, accessLevel: v }))}
                  >
                    <SelectTrigger className="h-9 rounded-xl border-white/[0.08] bg-[#0b0e14] text-[11px] text-slate-300">
                      <SelectValue placeholder="Team member" />
                    </SelectTrigger>
                    <SelectContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                      <SelectItem value="none" className="text-[11px]">Team member</SelectItem>
                      <SelectItem value="operations_manager" className="text-[11px]">Operations Manager</SelectItem>
                      <SelectItem value="accounts_admin" className="text-[11px]">Accounts / Admin</SelectItem>
                      <SelectItem value="owner_director" className="text-[11px]">Owner / Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(inviteLink || tempPassword) && (
                <div className="space-y-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3.5 text-slate-300">
                  <p className="text-[11px] font-semibold text-cyan-300">
                    {emailSent
                      ? `Invite emailed to ${invitedEmail}. Direct details:`
                      : "Direct sign-in details:"}
                  </p>
                  {tempPassword && (
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={tempPassword}
                        className="h-8 rounded-lg border-white/[0.08] bg-[#0b0e14] font-mono text-[10px] text-slate-200"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[10px] font-bold hover:bg-white/[0.06]"
                        onClick={() => {
                          navigator.clipboard.writeText(tempPassword);
                          toast.success("Password copied");
                        }}
                      >
                        Copy Password
                      </Button>
                    </div>
                  )}
                  {inviteLink && (
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={inviteLink}
                        className="h-8 rounded-lg border-white/[0.08] bg-[#0b0e14] font-mono text-[10px] text-slate-200"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[10px] font-bold hover:bg-white/[0.06]"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          toast.success("Link copied");
                        }}
                      >
                        Copy Link
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-cyan-500 font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-400"
                  disabled={creating}
                >
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                  {inviteMode ? "Send Invite" : "Create User"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl border border-white/[0.08] text-slate-300 hover:bg-white/[0.04]"
                  onClick={() => {
                    setShowCreate(false);
                    setInviteLink(null);
                    setTempPassword(null);
                  }}
                >
                  {inviteLink ? "Done" : "Cancel"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* MAIN CONTENT TABLE / CARDS */}
      <GlassCard
        title="Workspace Team Members"
        subtitle="Manage access levels, assigned workflow roles, and invite states"
      >
        <div className="p-6">
          {/* Mobile view */}
          <div className="space-y-3 lg:hidden">
            {users.map((u) => (
              <div
                key={u.id}
                className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-slate-100">{u.full_name}</p>
                    <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-white"
                      title="Copy sign-in link"
                      onClick={() => handleCopyLoginLink(u)}
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400 text-[11px]">
                            Are you sure you want to remove <strong>{u.full_name}</strong>? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-white/[0.08] bg-white/[0.02] text-slate-300">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-rose-500 font-bold text-white hover:bg-rose-600"
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">System Access</p>
                  <UserRoleEditor
                    userId={u.id}
                    userName={u.full_name}
                    currentRoles={u.roles}
                    onRolesUpdated={fetchUsers}
                    orgRoles={orgRoles}
                    currentOrgRoleIds={u.orgRoleIds}
                    roleStages={roleStages}
                    workflowName={workflowName}
                  />
                </div>

                {/* Workflow Roles Dropdown */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Workflow Roles
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-between border-white/[0.08] bg-[#0b0e14] text-[11px] font-normal text-slate-300 hover:bg-white/[0.04]"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Workflow className="h-3.5 w-3.5 text-slate-400" />
                          {u.orgRoleNames.length > 0
                            ? `${u.orgRoleNames.length} Role${u.orgRoleNames.length > 1 ? "s" : ""}`
                            : "No Roles"}
                        </span>
                        <ChevronDown className="h-3 w-3 text-slate-500 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 border-white/[0.085] bg-[#10151d] p-2 text-slate-200 shadow-xl" align="start">
                      <p className="mb-2 border-b border-white/[0.06] pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Workflow Roles
                      </p>
                      {u.orgRoleNames.length > 0 ? (
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {u.orgRoleNames.map((n) => (
                            <div
                              key={n}
                              className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-300"
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">No roles assigned.</p>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Assigned Steps Dropdown */}
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Assigned Steps
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-full justify-between border-cyan-400/30 bg-cyan-400/10 text-[11px] font-medium text-cyan-300 hover:bg-cyan-400/20"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Layers className="h-3.5 w-3.5 text-cyan-400" />
                          {u.assignedStages.length > 0
                            ? `${u.assignedStages.length} Step${u.assignedStages.length > 1 ? "s" : ""}`
                            : "No Steps"}
                        </span>
                        <ChevronDown className="h-3 w-3 text-cyan-400 opacity-70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 border-white/[0.085] bg-[#10151d] p-2 text-slate-200 shadow-xl" align="start">
                      <p className="mb-2 border-b border-white/[0.06] pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Assigned Steps ({u.assignedStages.length})
                      </p>
                      {u.assignedStages.length > 0 ? (
                        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                          {u.assignedStages.map((s) => (
                            <div
                              key={s}
                              className="rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1.5 text-[11px] font-medium text-cyan-300"
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">No steps assigned.</p>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Invite Status
                  </p>
                  <InviteStatus user={u} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.01]">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Name</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">System Access</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Workflow Roles</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Assigned Steps</th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Invite Status</th>
                  <th className="w-20 px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 text-[11px] font-bold text-slate-100">{u.full_name}</td>
                    <td className="max-w-[220px] truncate px-4 py-3.5 font-mono text-[11px] text-slate-400">{u.email}</td>

                    {/* System Access Column */}
                    <td className="px-4 py-3.5">
                      <UserRoleEditor
                        userId={u.id}
                        userName={u.full_name}
                        currentRoles={u.roles}
                        onRolesUpdated={fetchUsers}
                        orgRoles={orgRoles}
                        currentOrgRoleIds={u.orgRoleIds}
                        roleStages={roleStages}
                        workflowName={workflowName}
                      />
                    </td>

                    {/* Workflow Roles Dropdown */}
                    <td className="px-4 py-3.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-36 justify-between border-white/[0.08] bg-[#0b0e14] text-[11px] font-normal text-slate-300 hover:bg-white/[0.04]"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <Workflow className="h-3.5 w-3.5 text-slate-400" />
                              {u.orgRoleNames.length > 0
                                ? `${u.orgRoleNames.length} Role${u.orgRoleNames.length > 1 ? "s" : ""}`
                                : "No Roles"}
                            </span>
                            <ChevronDown className="h-3 w-3 text-slate-500 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 border-white/[0.085] bg-[#10151d] p-2 text-slate-200 shadow-xl" align="start">
                          <p className="mb-2 border-b border-white/[0.06] pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Workflow Roles ({u.orgRoleNames.length})
                          </p>
                          {u.orgRoleNames.length > 0 ? (
                            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                              {u.orgRoleNames.map((n) => (
                                <div
                                  key={n}
                                  className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-300"
                                >
                                  {n}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500">No roles assigned.</p>
                          )}
                        </PopoverContent>
                      </Popover>
                    </td>

                    {/* Assigned Steps Dropdown */}
                    <td className="px-4 py-3.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-40 justify-between border-cyan-400/30 bg-cyan-400/10 text-[11px] font-medium text-cyan-300 hover:bg-cyan-400/20"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <Layers className="h-3.5 w-3.5 text-cyan-400" />
                              {u.assignedStages.length > 0
                                ? `${u.assignedStages.length} Step${u.assignedStages.length > 1 ? "s" : ""}`
                                : "No Steps"}
                            </span>
                            <ChevronDown className="h-3 w-3 text-cyan-400 opacity-70" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 border-white/[0.085] bg-[#10151d] p-2 text-slate-200 shadow-xl" align="start">
                          <p className="mb-2 border-b border-white/[0.06] pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Assigned Steps ({u.assignedStages.length})
                          </p>
                          {u.assignedStages.length > 0 ? (
                            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                              {u.assignedStages.map((s) => (
                                <div
                                  key={s}
                                  className="rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1.5 text-[11px] font-medium text-cyan-300"
                                >
                                  {s}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500">No steps assigned.</p>
                          )}
                        </PopoverContent>
                      </Popover>
                    </td>

                    <td className="px-4 py-3.5">
                      <InviteStatus user={u} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-white"
                          title="Copy sign-in link"
                          onClick={() => handleCopyLoginLink(u)}
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-white/[0.085] bg-[#10151d] text-slate-200">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400 text-[11px]">
                                Are you sure you want to remove <strong>{u.full_name}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-white/[0.08] bg-white/[0.02] text-slate-300">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-rose-500 font-bold text-white hover:bg-rose-600"
                                onClick={() => handleDeleteUser(u.id, u.full_name)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>

      <RoleAuditTrail />
    </div>
  );
}