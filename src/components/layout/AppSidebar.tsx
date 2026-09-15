import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPath, AUTHORITY_LABELS } from "@/lib/authority";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/modules";
import { ROLE_LABELS } from "@/lib/constants";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
} from "lucide-react";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type Counts = Record<"jobs" | "approvals" | "assignments" | "overdue", number>;


export default function AppSidebar({ open, onClose, collapsed, onToggleCollapse }: AppSidebarProps) {
  const { isAdmin, organization, profile, roles, user, authority } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts>({ jobs: 0, approvals: 0, assignments: 0, overdue: 0 });
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // Determine which sections are active based on the current route.
  const activeSectionKeys = useMemo(() => {
    const active = new Set<string>();
    NAV_SECTIONS.forEach((section, si) => {
      const key = section.label ?? `top-${si}`;
      const visibleItems = section.items.filter((i) => (!i.adminOnly || isAdmin) && canAccessPath(authority, i.to));
      if (visibleItems.some((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))) {
        active.add(key);
      }
    });
    return active;
  }, [pathname, isAdmin, authority]);

  // Initialise and keep active sections open; preserve manual overrides.
  useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      activeSectionKeys.forEach((k) => next.add(k));
      return next;
    });
  }, [activeSectionKeys]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [jobsRes, approvalsRes, mineRes, slaRes] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("job_stages").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
        user
          ? supabase
              .from("job_stages")
              .select("id", { count: "exact", head: true })
              .in("status", ["active", "pending_approval"])
              .or(`primary_owner_id.eq.${user.id},secondary_owner_id.eq.${user.id}`)
          : Promise.resolve({ count: 0 } as any),
        supabase
          .from("job_stages")
          .select("sla_started_at, sla_deadline_hours")
          .eq("status", "active")
          .not("sla_started_at", "is", null)
          .not("sla_deadline_hours", "is", null),
      ]);

      const now = Date.now();
      const overdue = ((slaRes as any).data || []).filter(
        (s: any) => now > new Date(s.sla_started_at).getTime() + s.sla_deadline_hours * 3600_000
      ).length;

      if (!cancelled) {
        setCounts({
          jobs: jobsRes.count ?? 0,
          approvals: approvalsRes.count ?? 0,
          assignments: (mineRes as any).count ?? 0,
          overdue,
        });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();


  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "relative fixed left-0 top-0 z-50 flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 lg:static lg:translate-x-0",
          collapsed ? "w-[76px]" : "w-64",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar edge gradient */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-60"
          style={{
            background: `radial-gradient(ellipse at 0% 0%, hsl(var(--gradient-yellow) / 0.22) 0%, transparent 40%),
                         radial-gradient(ellipse at 100% 100%, hsl(var(--gradient-green) / 0.18) 0%, transparent 40%),
                         radial-gradient(ellipse at 0% 100%, hsl(var(--gradient-white) / 0.10) 0%, transparent 40%)`,
          }}
          aria-hidden="true"
        />
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Boxes className="h-4.5 w-4.5 text-sidebar-primary-foreground" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <span className="truncate font-heading text-[17px] font-extrabold tracking-tight text-white">
              {organization?.name ?? "Workspace"}
            </span>
          )}
        </div>

        {/* Workspace switcher */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Workspace
            </p>
            <button className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-2.5 py-2 text-left text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
              <Boxes className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60" />
              <span className="flex-1 truncate">{organization?.name ?? "Workspace"}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="thin-scroll flex-1 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section, si) => {
            const sectionKey = section.label ?? `top-${si}`;
            const items = section.items.filter((i) => (!i.adminOnly || isAdmin) && canAccessPath(authority, i.to));
            if (items.length === 0) return null;
            const hasLabel = Boolean(section.label);
            const isExpanded = collapsed || openSections.has(sectionKey);
            const isActiveSection = activeSectionKeys.has(sectionKey);
            const totalCount = items.reduce((sum, item) => sum + (item.count ? counts[item.count] : 0), 0);

            return (
              <div key={sectionKey} className={cn(si > 0 && "mt-5")}>
                {/* Collapsed state: just a divider for labelled groups */}
                {hasLabel && collapsed && <div className="mx-2 mb-2 border-t border-sidebar-border" />}

                {/* Section header / dropdown toggle */}
                {hasLabel && !collapsed && (
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className={cn(
                      "mb-1.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-widest transition-colors",
                      isActiveSection
                        ? "bg-sidebar-primary/20 text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                    aria-expanded={isExpanded}
                  >
                    <span className="truncate">{section.label}</span>
                    <span className="flex items-center gap-1.5">
                      {totalCount > 0 && (
                        <span className="rounded-full bg-sidebar-primary/25 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {totalCount}
                        </span>
                      )}
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </span>
                  </button>
                )}

                {/* Items */}
                <div
                  className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-200",
                    hasLabel && !collapsed && !isExpanded && "max-h-0 opacity-0",
                    hasLabel && !collapsed && isExpanded && "max-h-[800px] opacity-100"
                  )}
                >
                  {items.map((item, idx) => {
                    const count = item.count ? counts[item.count] : 0;
                    return (
                      <NavLink
                        key={`${sectionKey}-${item.label}-${idx}`}
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                            collapsed && "justify-center px-0",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && count > 0 && (
                          <span className="rounded-full bg-sidebar-primary/25 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {count}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Collapse */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "hidden shrink-0 items-center gap-2.5 px-5 py-3 text-[13px] font-medium text-sidebar-foreground/60 transition-colors hover:text-white lg:flex",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && "Collapse Menu"}
        </button>

        {/* User */}
        <button
          type="button"
          onClick={() => navigate("/settings")}
          title="Edit your profile"
          aria-label="Edit your profile"
          className={cn(
            "flex w-full shrink-0 items-center gap-2.5 border-t border-sidebar-border px-4 py-3 text-left transition-colors hover:bg-sidebar-accent/40",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{profile?.full_name ?? "User"}</p>
                <p className="truncate text-[11px] text-sidebar-foreground/50">
                  {AUTHORITY_LABELS[authority]}
                  {roles.length > 0 ? ` · ${ROLE_LABELS[roles[0]]}` : ""}
                </p>
              </div>
              <MoreVertical className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
            </>
          )}
        </button>
      </aside>
    </>
  );
}
