import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Loader2, UserPlus, Trash2, Link as LinkIcon } from "lucide-react";
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

// Edge functions return a JSON body with the real reason; the SDK only surfaces
// "non-2xx status code", so read the response body when present.
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
  let className = "bg-muted text-muted-foreground border-transparent";

  if (user.last_sign_in_at) {
    label = "Active";
    className = "bg-accent/10 text-accent border-accent/20";
  } else if (user.invite_email_status === "sent") {
    label = "Invite emailed";
    className = "bg-primary/10 text-primary border-primary/20";
  } else if (user.invite_email_status === "link_only") {
    label = "Link only";
    className = "bg-muted text-foreground border-border";
  } else if (user.invite_email_status === "failed") {
    label = "Email failed";
    className = "bg-destructive/10 text-destructive border-destructive/20";
  } else if (user.invited_at) {
    label = "Invited";
    className = "bg-muted text-foreground border-border";
  }

  return (
    <div className="space-y-1">
      <Badge variant="outline" className={`text-xs ${className}`}>{label}</Badge>
      <p className="text-[11px] text-muted-foreground">
        {emailedAt
          ? `Last email ${emailedAt}`
          : signedInAt
            ? `Signed in ${signedInAt}`
            : invitedAt
              ? `Invited ${invitedAt}`
              : "No email sent yet"}
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
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "" as string, accessLevel: "none" as string });
  const [inviteMode, setInviteMode] = useState(true);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string>("");


  useEffect(() => {
    if (isAdmin && orgId) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, orgId]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const fetchUsers = async () => {
    // Membership is the source of truth: a member may keep a different primary org_id on their profile.
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 py-4 sm:py-6">
      <AccessRequestsQueue />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold sm:text-2xl">User Management</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {workflowName ? `Roles and steps from "${workflowName}"` : "Invite members and assign workflow roles"}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg">{inviteMode ? "Invite Team Member" : "Create New User"}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inviteMode ? "default" : "outline"}
                  onClick={() => setInviteMode(true)}
                >
                  Send invite email
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!inviteMode ? "default" : "outline"}
                  onClick={() => setInviteMode(false)}
                >
                  Set a password
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => setNewUser((u) => ({ ...u, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                  required
                />
              </div>
              {!inviteMode && (
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser((u) => ({ ...u, role: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={orgRoles.length ? "Select role..." : "No roles defined yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orgRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {orgRoles.length
                    ? `Your own roles${workflowName ? ` — used by "${workflowName}"` : ""}. Manage them in Roles.`
                    : "Create roles in Admin → Roles first, then assign them here."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Access level</Label>
                <Select
                  value={newUser.accessLevel}
                  onValueChange={(v) => setNewUser((u) => ({ ...u, accessLevel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Team member (no admin access)</SelectItem>
                    <SelectItem value="operations_manager">Operations Manager</SelectItem>
                    <SelectItem value="accounts_admin">Accounts / Admin</SelectItem>
                    <SelectItem value="owner_director">Owner / Director (admin)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Invited members can never be made Super Admin here — that level is granted afterwards from the
                  Edit menu by an existing Super Admin.
                </p>
              </div>
              {(inviteLink || tempPassword) && (
                <div className="space-y-2 rounded-sm border border-accent/30 bg-accent/5 p-3 sm:col-span-2">
                  <p className="text-xs font-medium">
                    {emailSent
                      ? `Invite emailed to ${invitedEmail}. You can also share these details directly:`
                      : "Email sending isn't set up yet — share these sign-in details with the new member:"}
                  </p>
                  {tempPassword && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input readOnly value={tempPassword} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(tempPassword);
                          toast.success("Password copied");
                        }}
                      >
                        Copy password
                      </Button>
                    </div>
                  )}
                  {inviteLink && (
                  <div className="flex flex-col gap-2 sm:flex-row">

                    <Input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        toast.success("Link copied");
                      }}
                    >
                      Copy link
                    </Button>
                  </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    They can sign in with their email and this password, or use the one-time link.
                  </p>
                </div>

              )}
              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-end">
                <Button
                  type="submit"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
                  disabled={creating}
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {inviteMode ? "Send Invite" : "Create User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
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

          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {/* Mobile: stacked cards */}
          <div className="divide-y lg:hidden">
            {users.map((u) => (
              <div key={u.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title="Copy sign-in link"
                    onClick={() => handleCopyLoginLink(u)}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove <strong>{u.full_name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Roles</p>
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

                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Workflow roles</p>
                  <div className="flex flex-wrap gap-1">
                    {u.orgRoleNames.length > 0 ? (
                      u.orgRoleNames.map((n) => (
                        <Badge key={n} variant="outline" className="text-xs">
                          {n}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Assigned steps</p>
                  <div className="flex flex-wrap gap-1">
                    {u.assignedStages.length > 0 ? (
                      u.assignedStages.map((s) => (
                        <Badge key={s} className="border-accent/20 bg-accent/10 text-xs text-accent">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No steps</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Invite status</p>
                  <InviteStatus user={u} />
                </div>

              </div>
            ))}
            {users.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No members yet.</p>
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Roles</th>
                <th className="px-4 py-3 text-left font-medium">Workflow Roles</th>
                <th className="px-4 py-3 text-left font-medium">Assigned Steps</th>
                <th className="px-4 py-3 text-left font-medium">Invite Status</th>
                <th className="w-20 px-4 py-3 text-right font-medium">Actions</th>

              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b align-top">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.orgRoleNames.length > 0 ? (
                        u.orgRoleNames.map((n) => (
                          <Badge key={n} variant="outline" className="text-xs">
                            {n}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.assignedStages.length > 0 ? (
                        u.assignedStages.map((s) => (
                          <Badge key={s} className="bg-accent/10 text-accent border-accent/20 text-xs">
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No steps</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <InviteStatus user={u} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Copy sign-in link"
                      onClick={() => handleCopyLoginLink(u)}
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove <strong>{u.full_name}</strong>? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      <RoleAuditTrail />
    </div>
  );
}
