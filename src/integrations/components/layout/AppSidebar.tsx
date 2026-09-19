import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  Handshake,
  LayoutDashboard,
  Megaphone,
  MoreVertical,
  Share2,
  ShieldCheck,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AUTHORITY_LABELS, canAccessPath } from "@/lib/authority";
import { ROLE_LABELS } from "@/lib/constants";
import { NAV_SECTIONS, type NavItem, type NavSection } from "@/lib/modules";
import { useCopy } from "@/contexts/CopyContext";
import { useBranding } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

type CountKey = "jobs" | "approvals" | "assignments" | "overdue";
type Counts = Record<CountKey, number>;
type VisibleSection = NavSection & { key: string; label: string; items: NavItem[] };

const SECTION_ICONS: Record<string, React.ElementType> = {
  Workspace: LayoutDashboard,
  "Client Acquisition": Megaphone,
  "Sales Pipeline": Handshake,
  "Work & SOP": Workflow,
  Finance: Wallet,
  "Client Success": Users,
  Growth: Share2,
  Management: BarChart3,
  Administration: ShieldCheck,
};

const SECTION_DESCRIPTIONS: Record<string, string> = {
  Workspace: "Your command centre for daily work.",
  "Client Acquisition": "Generate prospects, capture relationships and manage follow-ups.",
  "Sales Pipeline": "Move qualified prospects from lead to closed deal.",
  "Work & SOP": "Turn won business into structured, accountable delivery.",
  Finance: "Create commercial records and track money coming in and out.",
  "Client Success": "Manage clients, support, renewals and ongoing relationships.",
  Growth: "Turn successful customers and relationships into new business.",
  Management: "Measure performance, activity and operational health.",
  Administration: "Control users, permissions, configuration and integrations.",
};

const EMPTY_COUNTS: Counts = { jobs: 0, approvals: 0, assignments: 0, overdue: 0 };

function routeMatches(pathname: string, item: NavItem) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { isAdmin, organization, profile, roles, user, authority } = useAuth();
  const { phrase } = useCopy();
  const { logoUrl } = useBranding();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOneHovered, setSidebarOneHovered] = useState(false);
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);

  const visibleSections = useMemo<VisibleSection[]>(
    () =>
      NAV_SECTIONS.map((section, index) => ({
        ...section,
        key: section.label ?? `section-${index}`,
        label: phrase(section.label ?? "Workspace"),
        items: section.items
          .filter((item) => (!item.adminOnly || isAdmin) && canAccessPath(authority, item.to))
          .map((item) => ({ ...item, label: phrase(item.label) })),
      })).filter((section) => section.items.length > 0),
    [authority, isAdmin, phrase],
  );

  const routeSectionKey = useMemo(
    () => visibleSections.find((section) => section.items.some((item) => routeMatches(pathname, item)))?.key ?? null,
    [pathname, visibleSections],
  );

  useEffect(() => {
    setSelectedSectionKey(routeSectionKey);
  }, [pathname, routeSectionKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      try {
        const [jobsRes, approvalsRes, mineRes, slaRes] = await Promise.all([
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("job_stages").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
          user
            ? supabase
                .from("job_stages")
                .select("id", { count: "exact", head: true })
                .in("status", ["active", "pending_approval"])
                .or(`primary_owner_id.eq.${user.id},secondary_owner_id.eq.${user.id}`)
            : Promise.resolve({ count: 0 }),
          supabase
            .from("job_stages")
            .select("sla_started_at, sla_deadline_hours")
            .eq("status", "active")
            .not("sla_started_at", "is", null)
            .not("sla_deadline_hours", "is", null),
        ]);

        const now = Date.now();
        const overdue = (slaRes.data ?? []).filter((stage) => {
          if (!stage.sla_started_at || stage.sla_deadline_hours == null) return false;
          return now > new Date(stage.sla_started_at).getTime() + stage.sla_deadline_hours * 3_600_000;
        }).length;

        if (!cancelled) {
          setCounts({
            jobs: jobsRes.count ?? 0,
            approvals: approvalsRes.count ?? 0,
            assignments: mineRes.count ?? 0,
            overdue,
          });
        }
      } catch {
        if (!cancelled) setCounts(EMPTY_COUNTS);
      }
    }

    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const selectedSection = visibleSections.find((section) => section.key === selectedSectionKey) ?? null;
  const secondaryOpen = selectedSection !== null;
  // The drawer initially exposes primary labels, then collapses to its 72px rail
  // after a section is chosen so all 270px of the secondary panel stays usable.
  const sidebarOneExpanded = sidebarOneHovered || (open && !secondaryOpen);
  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function sectionCount(section: VisibleSection) {
    return section.items.reduce((total, item) => total + (item.count ? counts[item.count] : 0), 0);
  }

  function toggleSection(key: string) {
    setSelectedSectionKey((current) => (current === key ? null : key));
  }

  function handleNavigate() {
    setSidebarOneHovered(false);
    onClose();
  }

  return (
    <>
      {open && (
        <Button
          type="button"
          variant="ghost"
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm xl:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full w-[342px] shrink-0 transition-transform duration-300 xl:relative xl:z-30 xl:translate-x-0 xl:transition-[width]",
          open ? "translate-x-0" : "-translate-x-full",
          secondaryOpen ? "xl:w-[342px]" : "xl:w-[72px]",
        )}
        aria-label="Business OS navigation"
      >
        <aside
          className={cn(
            "absolute inset-y-0 left-0 z-[70] flex w-[72px] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-[width] duration-300 ease-out",
            sidebarOneExpanded && "w-64",
          )}
          onMouseEnter={() => {
            if (window.matchMedia("(min-width: 1280px)").matches) setSidebarOneHovered(true);
          }}
          onMouseLeave={() => setSidebarOneHovered(false)}
          onFocusCapture={() => setSidebarOneHovered(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setSidebarOneHovered(false);
          }}
        >
          <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain p-1.5" /> : <Boxes className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />}
            </div>
            <div
              className={cn(
                "min-w-0 max-w-0 translate-x-1 overflow-hidden opacity-0 transition-all duration-200",
                sidebarOneExpanded && "max-w-[176px] translate-x-0 opacity-100",
              )}
            >
              <p className="truncate font-heading text-sm font-bold text-sidebar-accent-foreground">
                {organization?.name ?? "RST Business OS"}
              </p>
              <p className="mt-0.5 truncate text-[9px] font-semibold uppercase text-sidebar-foreground/50">
                Business Operating System
              </p>
            </div>
          </div>

          <nav className="thin-scroll flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-3" aria-label="Primary sections">
            {visibleSections.map((section) => {
              const Icon = SECTION_ICONS[section.label] ?? Boxes;
              const active = selectedSectionKey === section.key;
              const count = sectionCount(section);

              return (
                <Button
                  key={section.key}
                  type="button"
                  variant="ghost"
                  onClick={() => toggleSection(section.key)}
                  aria-label={`${section.label} section`}
                  aria-expanded={active}
                  title={sidebarOneExpanded ? undefined : section.label}
                  className={cn(
                    "group relative h-11 w-full justify-start gap-3 overflow-hidden rounded-lg px-3 text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-y-2 left-0 w-0.5 bg-sidebar-primary-foreground opacity-0",
                      active && "opacity-100",
                    )}
                    aria-hidden="true"
                  />
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                  <span
                    className={cn(
                      "min-w-0 flex-1 translate-x-1 truncate text-left text-xs font-semibold uppercase opacity-0 transition-all duration-200",
                      sidebarOneExpanded && "translate-x-0 opacity-100",
                    )}
                  >
                    {section.label}
                  </span>
                  {sidebarOneExpanded && count > 0 && (
                    <span className="min-w-5 rounded-full bg-sidebar-accent px-1.5 py-0.5 text-center text-[10px] font-bold text-sidebar-accent-foreground">
                      {count}
                    </span>
                  )}
                  {sidebarOneExpanded && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </Button>
              );
            })}
          </nav>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              navigate("/settings");
              handleNavigate();
            }}
            aria-label="Open profile settings"
            title={sidebarOneExpanded ? undefined : "Profile settings"}
            className="h-[72px] w-full shrink-0 justify-start gap-3 overflow-hidden rounded-none border-t border-sidebar-border px-4 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {initials}
            </span>
            <span
              className={cn(
                "min-w-0 max-w-0 flex-1 translate-x-1 overflow-hidden text-left opacity-0 transition-all duration-200",
                sidebarOneExpanded && "max-w-[160px] translate-x-0 opacity-100",
              )}
            >
              <span className="block truncate text-xs font-semibold text-sidebar-accent-foreground">
                {profile?.full_name ?? "User"}
              </span>
              <span className="mt-0.5 block truncate text-[10px] uppercase text-sidebar-foreground/50">
                {AUTHORITY_LABELS[authority]}
                {roles[0] ? ` · ${ROLE_LABELS[roles[0]]}` : ""}
              </span>
            </span>
            {sidebarOneExpanded && <MoreVertical className="h-4 w-4 shrink-0 text-sidebar-foreground/50" aria-hidden="true" />}
          </Button>
        </aside>

        <aside
          className={cn(
            "absolute inset-y-0 left-[72px] z-[60] flex w-[270px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition-all duration-300",
            secondaryOpen ? "translate-x-0 opacity-100" : "-translate-x-3 pointer-events-none opacity-0",
          )}
          aria-hidden={!secondaryOpen}
        >
          {selectedSection && (
            <>
              <header className="min-h-[126px] shrink-0 border-b border-sidebar-border px-5 pb-4 pt-6">
                <p className="text-[10px] font-bold uppercase text-sidebar-primary">Business OS</p>
                <h2 className="mt-2 font-heading text-lg font-bold text-sidebar-accent-foreground">{selectedSection.label}</h2>
                <p className="mt-1.5 text-xs leading-5 text-sidebar-foreground/55">
                  {phrase(SECTION_DESCRIPTIONS[selectedSection.label] ?? "Open the tools and records for this section.")}
                </p>
              </header>

              <nav className="thin-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={`${selectedSection.label} navigation`}>
                {selectedSection.items.map((item, index, items) => {
                  const count = item.count ? counts[item.count] : 0;
                  const activeIndex = items.findIndex((candidate) => routeMatches(pathname, candidate));
                  const isItemActive = index === activeIndex;
                  return (
                    <NavLink
                      key={`${item.label}-${item.to}-${index}`}
                      to={item.to}
                      end={item.end}
                      onClick={handleNavigate}
                      className={() =>
                        cn(
                          "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                          isItemActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                        )
                      }
                    >
                      {() => (
                        <>
                          <span
                            className={cn(
                              "absolute inset-y-2 left-0 w-0.5 bg-sidebar-primary-foreground opacity-0",
                              isItemActive && "opacity-100",
                            )}
                            aria-hidden="true"
                          />
                          <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {count > 0 && (
                            <span className="min-w-5 rounded-full bg-sidebar-accent px-1.5 py-0.5 text-center text-[10px] font-bold text-sidebar-accent-foreground">
                              {count}
                            </span>
                          )}
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
                              isItemActive && "opacity-100",
                            )}
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </>
          )}
        </aside>
      </div>
    </>
  );
}