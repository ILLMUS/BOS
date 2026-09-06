import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AUTHORITY, AUTHORITY_LABELS, MANAGER_ROLES, type AuthorityLevel } from "@/lib/authority";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  job_prefix: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null; org_id: string | null } | null;
  organization: Organization | null;
  orgId: string | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  /** Position in the workspace chain of command (0 none .. 4 owner). */
  authority: AuthorityLevel;
  authorityLabel: string;
  isBoard: boolean;
  isManager: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isOrgAdminRole, setIsOrgAdminRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Validate and repair the active workspace before loading the profile.
      // This prevents a stale/missing profiles.org_id from briefly assigning
      // an existing workspace member "No workspace standing".
      const { error: workspaceError } = await supabase.rpc("ensure_my_workspace");
      if (workspaceError) {
        console.warn("Unable to validate workspace membership:", workspaceError.message);
      }

      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.rpc("get_user_roles", { _user_id: userId }),
      ]);

      let profileRow = profileRes.data;

      // Self-heal: a sign-in without a profile row would leave the app with no user context.
      if (!profileRow) {
        const { data: authUser } = await supabase.auth.getUser();
        const meta = authUser?.user;
        if (meta?.email) {
          const { data: created } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              email: meta.email,
              full_name: (meta.user_metadata?.full_name as string) || meta.email,
            })
            .select()
            .maybeSingle();
          profileRow = created ?? null;
        }
      }

      setRoles((rolesRes.data as AppRole[] | null) ?? []);

      // Self-heal: an invited member can end up with a membership row but no
      // org on their profile, which would leave them with no workspace standing.
      if (profileRow && !profileRow.org_id) {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (membership?.org_id) {
          await supabase.from("profiles").update({ org_id: membership.org_id }).eq("id", userId);
          profileRow = { ...profileRow, org_id: membership.org_id };
        }
      }

      setProfile(profileRow ?? null);

      const orgId = profileRow?.org_id ?? null;

      if (orgId) {
        const { data: orgRoleRows } = await supabase
          .from("user_org_roles")
          .select("org_role_id, org_roles(is_admin)")
          .eq("user_id", userId)
          .eq("org_id", orgId);
        setIsOrgAdminRole(
          (orgRoleRows || []).some((r: any) => r.org_roles?.is_admin === true)
        );

        const { data: org } = await supabase
          .from("organizations")
          .select("id, name, slug, logo_url, brand_color, job_prefix")
          .eq("id", orgId)
          .maybeSingle();
        setOrganization((org as Organization) ?? null);
      } else {
        setOrganization(null);
        setIsOrgAdminRole(false);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock. Keep loading until the
          // profile and roles are in, so admin-only routes do not bounce.
          setTimeout(async () => {
            if (event === "SIGNED_IN") {
              await supabase
                .from("profiles")
                .update({ last_sign_in_at: new Date().toISOString() })
                .eq("id", session.user.id);
            }
            await fetchUserData(session.user.id);
            setIsLoading(false);
          }, 0);

        } else {
          setProfile(null);
          setOrganization(null);
          setRoles([]);
          setIsOrgAdminRole(false);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOrganization(null);
    setRoles([]);
    setIsOrgAdminRole(false);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = roles.includes("super_admin") || roles.includes("owner_director") || isOrgAdminRole;

  // Chain of command: authority is granted downward from the Super Admin.
  const authority: AuthorityLevel = !profile?.org_id
    ? AUTHORITY.NONE
    : roles.includes("super_admin")
    ? AUTHORITY.OWNER
    : roles.includes("owner_director") || isOrgAdminRole
    ? AUTHORITY.BOARD
    : roles.some((r) => (MANAGER_ROLES as readonly string[]).includes(r))
    ? AUTHORITY.MANAGER
    : AUTHORITY.FIELD;
  const refreshProfile = async () => {
    if (user?.id) await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        organization,
        orgId: profile?.org_id ?? null,
        roles,
        isLoading,
        isAdmin,
        authority,
        authorityLabel: AUTHORITY_LABELS[authority],
        isBoard: authority >= AUTHORITY.BOARD,
        isManager: authority >= AUTHORITY.MANAGER,
        signIn,
        signOut,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
