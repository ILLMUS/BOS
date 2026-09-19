import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Boxes,
  Briefcase,
  ChevronRight,
  Compass,
  Cpu,
  CreditCard,
  Layers,
  LayoutGrid,
  MoreVertical,
  Rocket,
  ShieldCheck,
  Target,
  Users2,
  Zap,
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

// Enhanced, vivid communicative icons for primary sections
const SECTION_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Workspace: {
    icon: LayoutGrid,
    color: "text-sky-400 group-hover:text-sky-300",
    bg: "bg-sky-500/10 group-hover:bg-sky-500/20",
  },
  "Client Acquisition": {
    icon: Target,
    color: "text-amber-400 group-hover:text-amber-300",
    bg: "bg-amber-500/10 group-hover:bg-amber-500/20",
  },
  "Sales Pipeline": {
    icon: Zap,
    color: "text-emerald-400 group-hover:text-emerald-300",
    bg: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
  },
  "Work & SOP": {
    icon: Layers,
    color: "text-indigo-400 group-hover:text-indigo-300",
    bg: "bg-indigo-500/10 group-hover:bg-indigo-500/20",
  },
  Finance: {
    icon: CreditCard,
    color: "text-teal-400 group-hover:text-teal-300",
    bg: "bg-teal-500/10 group-hover:bg-teal-500/20",
  },
  "Client Success": {
    icon: Users2,
    color: "text-violet-400 group-hover:text-violet-300",
    bg: "bg-violet-500/10 group-hover:bg-violet-500/20",
  },
  Growth: {
    icon: Rocket,
    color: "text-rose-400 group-hover:text-rose-300",
    bg: "bg-rose-500/10 group-hover:bg-rose-500/20",
  },
  Management: {
    icon: Activity,
    color: "text-cyan-400 group-hover:text-cyan-300",
    bg: "bg-cyan-500/10 group-hover:bg-cyan-500/20",
  },
  Administration: {
    icon: ShieldCheck,
    color: "text-orange-400 group-hover:text-orange-300",
    bg: "bg-orange-500/10 group-hover:bg-orange-500/20",
  },
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
      {/* Mobile Drawer Overlay with Futuristic Blur Fade */}
      {open && (
        <Button
          type="button"
          variant="ghost"
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md transition-all duration-300 xl:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full w-[342px] shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] xl:relative xl:z-30 xl:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          secondaryOpen ? "xl:w-[342px]" : "xl:w-[72px]",
        )}
        aria-label="Business OS navigation"
      >
        {/* Primary Rail */}
        <aside
          className={cn(
            "absolute inset-y-0 left-0 z-[70] flex w-[72px] flex-col overflow-hidden border-r border-sidebar-border/80 bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl shadow-2xl transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
          {/* Brand Header */}
          <div className="flex h-[76px] shrink-0 items-center gap-3.5 border-b border-sidebar-border/60 px-4">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/25 transition-transform duration-300 hover:scale-105">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
              ) : (
                <Cpu className="h-5 w-5 animate-pulse text-sidebar-primary-foreground" strokeWidth={2.2} />
              )}
            </div>
            <div
              className={cn(
                "min-w-0 max-w-0 translate-x-2 overflow-hidden opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                sidebarOneExpanded && "max-w-[176px] translate-x-0 opacity-100",
              )}
            >
              <p className="truncate font-heading text-sm font-bold tracking-tight text-sidebar-accent-foreground">
                {organization?.name ?? "RST Business OS"}
              </p>
              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-widest text-sidebar-primary">
                Next-Gen OS
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="thin-scroll flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-2 py-4" aria-label="Primary sections">
            {visibleSections.map((section) => {
              const config = SECTION_ICONS[section.label] ?? {
                icon: Boxes,
                color: "text-sidebar-foreground",
                bg: "bg-sidebar-accent/50",
              };
              const Icon = config.icon;
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
                    "group relative flex h-11 w-full items-center justify-start gap-3 overflow-hidden rounded-xl px-2.5 transition-all duration-200 hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground shadow-inner",
                  )}
                >
                  {/* Glowing Active Indicator Bar */}
                  <span
                    className={cn(
                      "absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary shadow-[0_0_12px_rgba(var(--sidebar-primary),0.8)] opacity-0 transition-all duration-300",
                      active && "opacity-100",
                    )}
                    aria-hidden="true"
                  />

                  {/* Icon with Vivid Background Container */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110",
                      config.bg,
                      active && "bg-sidebar-primary/20 shadow-sm",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 transition-colors duration-200", config.color)} strokeWidth={2} aria-hidden="true" />
                  </div>

                  {/* Section Label */}
                  <span
                    className={cn(
                      "min-w-0 flex-1 translate-x-2 truncate text-left text-xs font-bold uppercase tracking-wider opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] text-sidebar-foreground/80 group-hover:text-sidebar-accent-foreground",
                      sidebarOneExpanded && "translate-x-0 opacity-100",
                      active && "text-sidebar-accent-foreground font-extrabold",
                    )}
                  >
                    {section.label}
                  </span>

                  {/* Count Badge */}
                  {sidebarOneExpanded && count > 0 && (
                    <span className="min-w-5 rounded-full bg-sidebar-primary/20 px-1.5 py-0.5 text-center text-[10px] font-black text-sidebar-primary border border-sidebar-primary/30 shadow-sm">
                      {count}
                    </span>
                  )}

                  {sidebarOneExpanded && (
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-sidebar-accent-foreground",
                        active && "rotate-90 text-sidebar-primary",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </Button>
              );
            })}
          </nav>

          {/* User Profile Action */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              navigate("/settings");
              handleNavigate();
            }}
            aria-label="Open profile settings"
            title={sidebarOneExpanded ? undefined : "Profile settings"}
            className="h-[72px] w-full shrink-0 justify-start gap-3 overflow-hidden rounded-none border-t border-sidebar-border/60 px-3.5 text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sidebar-primary to-indigo-500 text-xs font-black text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
            </div>
            <div
              className={cn(
                "min-w-0 max-w-0 translate-x-2 overflow-hidden text-left opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                sidebarOneExpanded && "max-w-[160px] translate-x-0 opacity-100",
              )}
            >
              <span className="block truncate text-xs font-bold text-sidebar-accent-foreground">
                {profile?.full_name ?? "User"}
              </span>
              <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {AUTHORITY_LABELS[authority]}
                {roles[0] ? ` · ${ROLE_LABELS[roles[0]]}` : ""}
              </span>
            </div>
            {sidebarOneExpanded && <MoreVertical className="h-4 w-4 shrink-0 text-sidebar-foreground/40" aria-hidden="true" />}
          </Button>
        </aside>

        {/* Secondary Sub-navigation Panel with Slide-and-Fade reveal */}
        <aside
          className={cn(
            "absolute inset-y-0 left-[72px] z-[60] flex w-[270px] flex-col border-r border-sidebar-border/80 bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl shadow-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            secondaryOpen ? "translate-x-0 opacity-100" : "-translate-x-4 pointer-events-none opacity-0 scale-95",
          )}
          aria-hidden={!secondaryOpen}
        >
          {selectedSection && (
            <>
              <header className="min-h-[126px] shrink-0 border-b border-sidebar-border/60 px-5 pb-4 pt-6 bg-gradient-to-b from-sidebar-accent/30 to-transparent">
                <div className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-sidebar-primary animate-spin-slow" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-sidebar-primary">Business OS</p>
                </div>
                <h2 className="mt-2 font-heading text-lg font-extrabold tracking-tight text-sidebar-accent-foreground">
                  {selectedSection.label}
                </h2>
                <p className="mt-1 text-xs leading-5 text-sidebar-foreground/60">
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
                      className={({ isActive }) =>
                        cn(
                          "group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                          (isActive || isItemActive) &&
                            "bg-sidebar-primary/15 text-sidebar-primary hover:bg-sidebar-primary/20 hover:text-sidebar-primary font-bold shadow-sm",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 text-sidebar-primary" strokeWidth={2} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <span className="min-w-5 rounded-full bg-sidebar-primary/20 px-1.5 py-0.5 text-center text-[10px] font-black text-sidebar-primary border border-sidebar-primary/30">
                          {count}
                        </span>
                      )}
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5",
                          isItemActive && "opacity-100 text-sidebar-primary",
                        )}
                        aria-hidden="true"
                      />
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