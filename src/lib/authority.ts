/**
 * Chain of command.
 *
 * Authority in the workspace flows down from the Owner (Super Admin). Every
 * level below only holds power that was delegated to it, and nobody can act
 * outside their own field of responsibility.
 *
 *   4  Owner            Super Admin. Source of all authority.
 *   3  Administration   Owner/Director and workspace administrators. Full access,
 *      board            delegated by the Owner.
 *   2  Manager          Operations, client, accounts and workshop managers.
 *                       Runs the day-to-day sections, cannot govern the workspace.
 *   1  Field member     Only the work assigned to them.
 *   0  No standing      Signed in, not part of the workspace.
 */
export type AuthorityLevel = 0 | 1 | 2 | 3 | 4;

export const AUTHORITY = {
  NONE: 0,
  FIELD: 1,
  MANAGER: 2,
  BOARD: 3,
  OWNER: 4,
} as const;

export const AUTHORITY_LABELS: Record<AuthorityLevel, string> = {
  0: "No workspace standing",
  1: "Field member",
  2: "Manager",
  3: "Administration board",
  4: "Owner (Super Admin)",
};

export const AUTHORITY_DESCRIPTIONS: Record<AuthorityLevel, string> = {
  0: "Not attached to a workspace yet.",
  1: "Can open and complete only the work steps assigned to them.",
  2: "Runs day-to-day sections and can edit records in their field.",
  3: "Full access across the workspace, delegated by the Owner.",
  4: "Holds and delegates all authority in the workspace.",
};

/** Manager-grade system roles. Everything above them is board level. */
export const MANAGER_ROLES = [
  "operations_manager",
  "client_manager",
  "accounts_admin",
  "workshop_manager",
] as const;

/** Route prefixes and the minimum authority required to open them. Longest match wins. */
const ROUTE_AUTHORITY: { prefix: string; min: AuthorityLevel }[] = [
  { prefix: "/admin", min: AUTHORITY.BOARD },
  { prefix: "/reports", min: AUTHORITY.MANAGER },
  { prefix: "/finance", min: AUTHORITY.MANAGER },
  { prefix: "/sales", min: AUTHORITY.MANAGER },
  { prefix: "/crm", min: AUTHORITY.MANAGER },
  { prefix: "/outreach", min: AUTHORITY.MANAGER },
  { prefix: "/clients", min: AUTHORITY.MANAGER },
  { prefix: "/operations", min: AUTHORITY.MANAGER },
  { prefix: "/jobs/new", min: AUTHORITY.OWNER },
  { prefix: "/jobs", min: AUTHORITY.FIELD },
  { prefix: "/dashboard", min: AUTHORITY.FIELD },
  // Always reachable: a signed-in user must be able to manage their own account.
  { prefix: "/settings", min: AUTHORITY.NONE },
];

export function minAuthorityForPath(path: string): AuthorityLevel {
  const match = ROUTE_AUTHORITY.filter((r) => path === r.prefix || path.startsWith(r.prefix + "/") || path.startsWith(r.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.min : AUTHORITY.FIELD;
}

export function canAccessPath(level: AuthorityLevel, path: string) {
  return level >= minAuthorityForPath(path);
}

/** Editing records in a section requires manager standing; governing requires the board. */
export function canEditSection(level: AuthorityLevel, path: string) {
  const required = minAuthorityForPath(path);
  return level >= Math.max(required, AUTHORITY.MANAGER as AuthorityLevel);
}

/**
 * A work step may only be edited by the person it was handed to, or by
 * managers and the board. Locked and approved steps stay closed to everyone.
 */
export function canEditStage(
  level: AuthorityLevel,
  stage: { status: string; primary_owner_id: string | null; secondary_owner_id: string | null } | null,
  userId: string | undefined
) {
  if (!stage || !userId) return false;
  if (stage.status === "locked" || stage.status === "approved") return false;
  if (level >= AUTHORITY.MANAGER) return true;
  return stage.primary_owner_id === userId || stage.secondary_owner_id === userId;
}

/** Roles that would grant a given standing, for use in access diagnostics. */
export const ROLES_GRANTING_AUTHORITY: Record<AuthorityLevel, string[]> = {
  0: [],
  1: ["any workspace role"],
  2: [...MANAGER_ROLES],
  3: ["owner_director", "any role flagged as workspace admin"],
  4: ["super_admin"],
};

export type AccessDiagnostic = {
  /** Machine-readable cause of the block. */
  code: "no_workspace_link" | "insufficient_role" | "unknown_route";
  /** One-line plain explanation of exactly what is missing. */
  reason: string;
  /** Concrete action the user (or their admin) must take. */
  nextStep: string;
  required: AuthorityLevel;
  current: AuthorityLevel;
  /** Roles that would unlock the section. */
  missingRoles: string[];
};

export function diagnoseAccess(params: {
  path: string;
  authority: AuthorityLevel;
  roles: string[];
  orgId: string | null;
  orgName?: string | null;
}): AccessDiagnostic {
  const required = minAuthorityForPath(params.path);
  const missingRoles = ROLES_GRANTING_AUTHORITY[required] ?? [];

  if (!params.orgId) {
    return {
      code: "no_workspace_link",
      reason:
        "Your account is signed in but not linked to any workspace, so no workspace permissions could be loaded for it.",
      nextStep:
        "Set up your own workspace, or ask the Super Admin who invited you to re-send the invitation so your account is attached to theirs.",
      required,
      current: params.authority,
      missingRoles,
    };
  }

  if (params.roles.length === 0) {
    return {
      code: "insufficient_role",
      reason: `You belong to ${params.orgName || "this workspace"} but no role has been assigned to your account yet, so you only hold ${AUTHORITY_LABELS[params.authority]} standing.`,
      nextStep: `Ask your Super Admin to assign you one of: ${missingRoles.join(", ") || "a workspace role"} in Admin → Users.`,
      required,
      current: params.authority,
      missingRoles,
    };
  }

  return {
    code: "insufficient_role",
    reason: `This section needs ${AUTHORITY_LABELS[required]} standing. Your roles (${params.roles.join(", ")}) only grant ${AUTHORITY_LABELS[params.authority]} standing.`,
    nextStep: `Ask your Super Admin or the administration board to add one of these roles to your account: ${missingRoles.join(", ") || "a higher role"} (Admin → Users → edit your user).`,
    required,
    current: params.authority,
    missingRoles,
  };
}
