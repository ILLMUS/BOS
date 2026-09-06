import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-accent" />
        <h1 className="font-heading text-2xl font-bold">Roles</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create a role</CardTitle>
          <CardDescription>
            Name the roles your business actually uses — "Case Manager", "Head Chef", "Field Tech" — then use
            them when building your SOP steps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Role name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Site Supervisor" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role is responsible for"
              />
            </div>
          </div>
          <Button onClick={addRole} disabled={adding || !name.trim()}>
            {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add Role
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Who does what</CardTitle>
          <CardDescription>Tick the roles each team member holds.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {roles.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Create your first role above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Member</th>
                    {roles.map((r) => (
                      <th key={r.id} className="px-4 py-3 text-left font-medium">
                        <div className="flex items-center gap-2">
                          <span>{r.name}</span>
                          {!r.is_admin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
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
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </td>
                      {roles.map((r) => (
                        <td key={r.id} className="px-4 py-3">
                          <Checkbox
                            checked={(assignments[m.id] || []).includes(r.id)}
                            onCheckedChange={(v) => toggleAssignment(m.id, r.id, !!v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-2">Tip</Badge>
        Roles drive automatic step ownership — whoever holds a step's role gets notified when it goes live.
      </p>
    </div>
  );
}