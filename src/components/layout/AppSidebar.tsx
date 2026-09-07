import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

import {
  canAccessPath,
  AUTHORITY_LABELS,
} from "@/lib/authority";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/modules";
import { ROLE_LABELS } from "@/lib/constants";

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

/* ============================================================
   TYPES
============================================================ */

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type Counts = Record<
  "jobs" | "approvals" | "assignments" | "overdue",
  number
>;

/* ============================================================
   DIMENSIONS

   Desktop:

   Sidebar 1 = 72px

   Sidebar 2 = 270px

   Total when Sidebar 2 is open:

   72px + 270px = 342px
============================================================ */

const SIDEBAR_ONE_WIDTH = 72;
const SIDEBAR_TWO_WIDTH = 270;

const SIDEBAR_TOTAL_WIDTH =
  SIDEBAR_ONE_WIDTH +
  SIDEBAR_TWO_WIDTH;

/* ============================================================
   PRIMARY SECTION ICONS
============================================================ */

const SECTION_ICONS: Record<
  string,
  React.ElementType
> = {
  WORKSPACE: LayoutDashboard,

  "CLIENT ACQUISITION":
    Megaphone,

  "SALES PIPELINE":
    Handshake,

  "WORK & SOP":
    Workflow,

  FINANCE:
    Wallet,

  "CLIENT SUCCESS":
    Users,

  GROWTH:
    Share2,

  MANAGEMENT:
    BarChart3,

  ADMINISTRATION:
    ShieldCheck,
};

/* ============================================================
   SECTION DESCRIPTIONS
============================================================ */

function getSectionDescription(
  label?: string,
): string {
  switch (label) {
    case "WORKSPACE":
      return "Your command centre for daily work.";

    case "CLIENT ACQUISITION":
      return "Generate prospects, capture relationships and manage follow-ups.";

    case "SALES PIPELINE":
      return "Move qualified prospects from lead to closed deal.";

    case "WORK & SOP":
      return "Turn won business into structured, accountable delivery.";

    case "FINANCE":
      return "Create commercial records and track money coming in and out.";

    case "CLIENT SUCCESS":
      return "Manage clients, support, renewals and ongoing relationships.";

    case "GROWTH":
      return "Turn successful customers and relationships into new business.";

    case "MANAGEMENT":
      return "Measure performance, activity and operational health.";

    case "ADMINISTRATION":
      return "Control users, permissions, configuration and integrations.";

    default:
      return "Navigate your Business OS.";
  }
}

/* ============================================================
   APP SIDEBAR
============================================================ */

export default function AppSidebar({
  open,
  onClose,
}: AppSidebarProps) {

  /* ==========================================================
     AUTH
  ========================================================== */

  const {
    isAdmin,
    organization,
    profile,
    roles,
    user,
    authority,
  } = useAuth();

  /* ==========================================================
     ROUTER
  ========================================================== */

  const { pathname } =
    useLocation();

  const navigate =
    useNavigate();

  /* ==========================================================
     SIDEBAR 1 HOVER

     IMPORTANT:

     This is ONLY used visually on desktop.

     Mobile and tablet DO NOT expand
     Sidebar 1 on hover.
  ========================================================== */

  const [
    sidebarOneHovered,
    setSidebarOneHovered,
  ] = useState(false);

  /* ==========================================================
     SIDEBAR 2

     Selected primary navigation section.
  ========================================================== */

  const [
    selectedSectionKey,
    setSelectedSectionKey,
  ] = useState<string | null>(
    null,
  );

  /* ==========================================================
     COUNTS
  ========================================================== */

  const [
    counts,
    setCounts,
  ] = useState<Counts>({
    jobs: 0,

    approvals: 0,

    assignments: 0,

    overdue: 0,
  });

  /* ==========================================================
     VISIBLE NAVIGATION
  ========================================================== */

  const visibleSections =
    useMemo(() => {

      return NAV_SECTIONS.map(
        (
          section,
          index,
        ) => {

          const sectionKey =
            section.label ??
            `top-${index}`;

          const items =
            section.items.filter(
              (item) =>
                (!item.adminOnly ||
                  isAdmin) &&
                canAccessPath(
                  authority,
                  item.to,
                ),
            );

          return {
            ...section,

            sectionKey,

            items,
          };
        },
      ).filter(
        (section) =>
          section.items.length > 0,
      );

    }, [
      authority,
      isAdmin,
    ]);

  /* ==========================================================
     ACTIVE SECTIONS
  ========================================================== */

  const activeSectionKeys =
    useMemo(() => {

      const active =
        new Set<string>();

      visibleSections.forEach(
        (section) => {

          const sectionIsActive =
            section.items.some(
              (item) => {

                if (item.end) {

                  return (
                    pathname ===
                    item.to
                  );

                }

                return (
                  pathname ===
                    item.to ||
                  pathname.startsWith(
                    `${item.to}/`,
                  )
                );

              },
            );

          if (sectionIsActive) {

            active.add(
              section.sectionKey,
            );

          }

        },
      );

      return active;

    }, [
      pathname,
      visibleSections,
    ]);

  /* ==========================================================
     VALIDATE SELECTED SECTION
  ========================================================== */

  useEffect(() => {

    if (
      selectedSectionKey &&
      !visibleSections.some(
        (section) =>
          section.sectionKey ===
          selectedSectionKey,
      )
    ) {

      setSelectedSectionKey(
        null,
      );

    }

  }, [
    selectedSectionKey,
    visibleSections,
  ]);

  /* ==========================================================
     LOAD COUNTS

     IMPORTANT FIX:

     Supabase errors will NOT break
     the sidebar or render.

     401 errors simply result in
     count = 0.
  ========================================================== */

  useEffect(() => {

    let cancelled = false;

    const loadCounts =
      async () => {

        try {

          const [
            jobsRes,
            approvalsRes,
            assignmentsRes,
            slaRes,
          ] =
            await Promise.all([
              supabase
                .from("jobs")
                .select(
                  "id",
                  {
                    count: "exact",
                    head: true,
                  },
                )
                .eq(
                  "status",
                  "active",
                ),

              supabase
                .from("job_stages")
                .select(
                  "id",
                  {
                    count: "exact",
                    head: true,
                  },
                )
                .eq(
                  "status",
                  "pending_approval",
                ),

              user
                ? supabase
                    .from(
                      "job_stages",
                    )
                    .select(
                      "id",
                      {
                        count:
                          "exact",

                        head: true,
                      },
                    )
                    .in(
                      "status",
                      [
                        "active",

                        "pending_approval",
                      ],
                    )
                    .or(
                      `primary_owner_id.eq.${user.id},secondary_owner_id.eq.${user.id}`,
                    )

                : Promise.resolve({
                    count: 0,

                    data: [],
                  }),

              supabase
                .from(
                  "job_stages",
                )
                .select(
                  "sla_started_at, sla_deadline_hours",
                )
                .eq(
                  "status",
                  "active",
                )
                .not(
                  "sla_started_at",
                  "is",
                  null,
                )
                .not(
                  "sla_deadline_hours",
                  "is",
                  null,
                ),
            ]);

          /*
            If Supabase is unauthorized,
            safely use empty data.
          */

          const slaData =
            slaRes?.data ?? [];

          const now =
            Date.now();

          const overdue =
            slaData.filter(
              (stage: any) => {

                if (
                  !stage.sla_started_at ||
                  !stage.sla_deadline_hours
                ) {
                  return false;
                }

                const startTime =
                  new Date(
                    stage.sla_started_at,
                  ).getTime();

                const deadline =
                  startTime +
                  Number(
                    stage.sla_deadline_hours,
                  ) *
                    3600_000;

                return (
                  now >
                  deadline
                );

              },
            ).length;

          if (!cancelled) {

            setCounts({
              jobs:
                jobsRes?.count ??
                0,

              approvals:
                approvalsRes?.count ??
                0,

              assignments:
                assignmentsRes?.count ??
                0,

              overdue,
            });

          }

        } catch (error) {

          /*
            IMPORTANT:

            Do not allow a failed
            Supabase request to break
            the entire UI.
          */

          console.warn(
            "Unable to load sidebar counts:",
            error,
          );

          if (!cancelled) {

            setCounts({
              jobs: 0,

              approvals: 0,

              assignments: 0,

              overdue: 0,
            });

          }

        }

      };

    loadCounts();

    return () => {

      cancelled = true;

    };

  }, [
    user,
  ]);

  /* ==========================================================
     USER INITIALS
  ========================================================== */

  const initials =
    (profile?.full_name || "U")
      .split(" ")
      .map(
        (part) =>
          part.charAt(0),
      )
      .slice(0, 2)
      .join("")
      .toUpperCase();

  /* ==========================================================
     SELECTED SECTION
  ========================================================== */

  const selectedSection =
    visibleSections.find(
      (section) =>
        section.sectionKey ===
        selectedSectionKey,
    ) ?? null;

  /* ==========================================================
     PRIMARY SECTION CLICK
  ========================================================== */

  const handleMainSectionClick =
    (
      sectionKey: string,
    ) => {

      setSelectedSectionKey(
        (current) =>

          current === sectionKey
            ? null
            : sectionKey,
      );

    };

  /* ==========================================================
     SUB NAVIGATION CLICK
  ========================================================== */

  const handleSubNavigationClick =
    (
      to: string,
    ) => {

      setSidebarOneHovered(
        false,
      );

      navigate(to);

      /*
        On mobile/tablet,
        close the drawer.

        Desktop is unaffected
        because the parent
        layout controls it.
      */

      onClose();

    };

  /* ==========================================================
     SIDEBAR 1 WIDTH

     Hover expansion is applied
     ONLY at xl breakpoint.
  ========================================================== */

  const sidebarOneWidthClass =
    sidebarOneHovered
      ? "xl:w-64"
      : "xl:w-[72px]";

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>

      {/* ======================================================
          MOBILE + TABLET BACKDROP

          Hidden on desktop.
      ====================================================== */}

      {open && (

        <div
          className="
            fixed
            inset-0
            z-40

            bg-foreground/30

            backdrop-blur-[2px]

            xl:hidden
          "
          onClick={onClose}
        />

      )}

      {/* ======================================================
          SIDEBAR CONTAINER

          MOBILE + TABLET:

          Fixed overlay.

          Width:
          342px

          DESKTOP:

          Participates in flex layout.

          Initial:
          72px

          Sidebar 2 open:
          342px

          This is what pushes
          page content.
      ====================================================== */}

      <div
        className={cn(

          /*
            MOBILE + TABLET
          */

          "fixed",
          "left-0",
          "top-0",
          "z-50",

          "h-screen",

          "w-[342px]",

          "max-w-[90vw]",

          "transition-transform",
          "duration-300",
          "ease-out",

          open
            ? "translate-x-0"
            : "-translate-x-full",


          /*
            DESKTOP
          */

          "xl:relative",

          "xl:left-auto",

          "xl:top-auto",

          "xl:z-auto",

          "xl:h-screen",

          "xl:max-w-none",

          "xl:translate-x-0",

          "xl:shrink-0",

          "xl:transition-[width]",

          "xl:duration-300",

          "xl:ease-out",


          /*
            DESKTOP WIDTH

            Sidebar 2 closed:

            72px

            Sidebar 2 open:

            342px
          */

          selectedSection
            ? "xl:w-[342px]"
            : "xl:w-[72px]",
        )}
      >

        {/* ====================================================
            SIDEBAR 1
        ==================================================== */}

        <aside
          className={cn(

            "absolute",
            "left-0",
            "top-0",

            "z-[70]",

            "flex",
            "h-full",

            "flex-col",

            "overflow-hidden",

            "border-r",

            "border-sidebar-border",

            "bg-sidebar",

            "text-sidebar-foreground",

            "shadow-[8px_0_30px_rgba(0,0,0,0.15)]",


            /*
              MOBILE + TABLET

              Always 72px.

              NO hover expansion.
            */

            "w-[72px]",


            /*
              DESKTOP

              Hover expansion.
            */

            sidebarOneWidthClass,

            "xl:transition-[width]",

            "xl:duration-300",

            "xl:ease-out",
          )}


          /*
            IMPORTANT:

            Hover is desktop only.

            We still listen for events,
            but only apply expansion
            using xl classes.
          */

          onMouseEnter={() =>
            setSidebarOneHovered(
              true,
            )
          }

          onMouseLeave={() =>
            setSidebarOneHovered(
              false,
            )
          }
        >

          {/* ==================================================
              BACKGROUND EFFECT
          ================================================== */}

          <div
            className="
              pointer-events-none

              absolute
              inset-0

              z-0

              opacity-60
            "
            style={{
              background:
                "radial-gradient(ellipse at 0% 0%, hsl(var(--gradient-yellow) / 0.22) 0%, transparent 40%), radial-gradient(ellipse at 100% 100%, hsl(var(--gradient-green) / 0.18) 0%, transparent 40%), radial-gradient(ellipse at 0% 100%, hsl(var(--gradient-white) / 0.10) 0%, transparent 40%)",
            }}
            aria-hidden="true"
          />


          {/* ==================================================
              BRAND
          ================================================== */}

          <div
            className={cn(

              "relative",
              "z-10",

              "flex",

              "h-16",

              "shrink-0",

              "items-center",


              /*
                Mobile / tablet
              */

              "justify-center",

              "px-0",


              /*
                Desktop hover
              */

              sidebarOneHovered &&
                "xl:justify-start xl:gap-2.5 xl:px-4",
            )}
          >

            <div
              className="
                flex

                h-9
                w-9

                shrink-0

                items-center
                justify-center

                rounded-xl

                bg-sidebar-primary

                shadow-sm
              "
            >

              <Boxes
                className="
                  h-[18px]
                  w-[18px]
                "
                strokeWidth={2.2}
              />

            </div>


            {/* Desktop only expanded brand */}

            <div
              className={cn(

                "hidden",

                "min-w-0",

                "overflow-hidden",


                sidebarOneHovered &&
                  "xl:block",
              )}
            >

              <p
                className="
                  truncate

                  font-heading

                  text-[15px]

                  font-extrabold

                  tracking-tight

                  text-white
                "
              >
                {
                  organization?.name ??
                  "RST Business OS"
                }
              </p>

              <p
                className="
                  truncate

                  text-[10px]

                  font-medium

                  uppercase

                  tracking-[0.14em]

                  text-sidebar-foreground/40
                "
              >
                Business Operating System
              </p>

            </div>

          </div>


          {/* ==================================================
              PRIMARY NAVIGATION
          ================================================== */}

          <nav
            className="
              thin-scroll

              relative
              z-10

              flex-1

              overflow-y-auto

              px-3
              py-4
            "
          >

            <div className="space-y-1.5">

              {visibleSections.map(
                (
                  section,
                  index,
                ) => {

                  const SectionIcon =
                    SECTION_ICONS[
                      section.label ??
                      ""
                    ] ??
                    [
                      LayoutDashboard,
                      Megaphone,
                      Handshake,
                      Workflow,
                      Wallet,
                      Users,
                      Share2,
                      BarChart3,
                      ShieldCheck,
                    ][index] ??
                    Boxes;


                  const isActive =
                    activeSectionKeys.has(
                      section.sectionKey,
                    );


                  const isSelected =
                    selectedSectionKey ===
                    section.sectionKey;


                  const totalCount =
                    section.items.reduce(
                      (
                        sum,
                        item,
                      ) =>
                        sum +
                        (
                          item.count
                            ? counts[
                                item.count
                              ]
                            : 0
                        ),

                      0,
                    );


                  return (

                    <button
                      key={
                        section.sectionKey
                      }

                      type="button"

                      onClick={() =>
                        handleMainSectionClick(
                          section.sectionKey,
                        )
                      }

                      className={cn(

                        "group",

                        "relative",

                        "flex",

                        "w-full",

                        "items-center",

                        "rounded-xl",


                        /*
                          Default mobile/tablet
                        */

                        "justify-center",

                        "px-0",

                        "py-3",


                        /*
                          Desktop
                        */

                        "xl:transition-all",

                        "xl:duration-200",


                        sidebarOneHovered &&
                          "xl:justify-start xl:gap-3 xl:px-3 xl:py-2.5",


                        isSelected

                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"

                          : isActive

                            ? "bg-sidebar-accent text-white"

                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/80 hover:text-white",
                      )}

                      aria-label={
                        section.label ??
                        "Navigation"
                      }

                      aria-expanded={
                        isSelected
                      }

                      title={
                        section.label
                      }
                    >

                      {/* Active indicator */}

                      <span
                        className={cn(

                          "absolute",

                          "left-0",

                          "top-1/2",

                          "h-5",

                          "w-[3px]",

                          "-translate-y-1/2",

                          "rounded-r-full",


                          isSelected

                            ? "bg-sidebar-primary-foreground opacity-100"

                            : isActive

                              ? "bg-sidebar-primary opacity-100"

                              : "opacity-0",
                        )}
                      />


                      {/* Icon */}

                      <SectionIcon
                        className="
                          h-[18px]

                          w-[18px]

                          shrink-0

                          xl:transition-transform

                          xl:duration-200

                          xl:group-hover:scale-105
                        "
                        strokeWidth={1.9}
                      />


                      {/* Label */}

                      <span
                        className={cn(

                          "hidden",

                          "min-w-0",

                          "flex-1",

                          "truncate",

                          "text-left",

                          "text-[12px]",

                          "font-semibold",

                          "uppercase",

                          "tracking-[0.055em]",


                          sidebarOneHovered &&
                            "xl:block",
                        )}
                      >
                        {
                          section.label
                        }
                      </span>


                      {/* Count */}

                      {sidebarOneHovered &&
                        totalCount > 0 && (

                          <span
                            className="
                              hidden

                              xl:block

                              rounded-full

                              px-1.5
                              py-0.5

                              text-[10px]
                              font-bold

                              bg-sidebar-primary/20

                              text-sidebar-primary-foreground
                            "
                          >
                            {
                              totalCount
                            }
                          </span>

                        )}


                      {/* Arrow */}

                      {sidebarOneHovered && (

                        <ChevronRight
                          className="
                            hidden

                            xl:block

                            h-3.5
                            w-3.5

                            shrink-0

                            opacity-40
                          "
                          strokeWidth={2}
                        />

                      )}

                    </button>

                  );

                },
              )}

            </div>

          </nav>


          {/* ==================================================
              USER PROFILE
          ================================================== */}

          <button
            type="button"

            onClick={() =>
              navigate(
                "/settings",
              )
            }

            title="Edit your profile"

            aria-label="Edit your profile"

            className={cn(

              "relative",

              "z-10",

              "flex",

              "w-full",

              "shrink-0",

              "items-center",

              "border-t",

              "border-sidebar-border",

              "hover:bg-sidebar-accent/50",


              /*
                Default
              */

              "justify-center",

              "px-0",

              "py-3",


              /*
                Desktop hover
              */

              sidebarOneHovered &&
                "xl:justify-start xl:gap-3 xl:px-3",
            )}
          >

            <div
              className="
                flex

                h-9
                w-9

                shrink-0

                items-center
                justify-center

                rounded-full

                bg-sidebar-primary

                text-[11px]

                font-bold

                shadow-sm
              "
            >
              {
                initials
              }
            </div>


            <div
              className={cn(

                "hidden",

                "min-w-0",

                "flex-1",

                "overflow-hidden",

                "text-left",


                sidebarOneHovered &&
                  "xl:block",
              )}
            >

              <p
                className="
                  truncate

                  text-[12px]

                  font-semibold

                  text-white
                "
              >
                {
                  profile?.full_name ??
                  "User"
                }
              </p>


              <p
                className="
                  truncate

                  text-[10px]

                  text-sidebar-foreground/45
                "
              >
                {
                  AUTHORITY_LABELS[
                    authority
                  ]
                }

                {
                  roles.length > 0
                    ? ` · ${
                        ROLE_LABELS[
                          roles[0]
                        ]
                      }`
                    : ""
                }
              </p>

            </div>


            {sidebarOneHovered && (

              <MoreVertical
                className="
                  hidden

                  xl:block

                  h-4
                  w-4

                  shrink-0

                  text-sidebar-foreground/30
                "
              />

            )}

          </button>

        </aside>


        {/* ====================================================
            SIDEBAR 2
        ==================================================== */}

        <aside
          className={cn(

            "absolute",

            "left-[72px]",

            "top-0",

            "z-[60]",

            "h-full",

            "w-[270px]",

            "overflow-hidden",

            "border-r",

            "border-sidebar-border",

            "bg-sidebar/95",

            "text-sidebar-foreground",

            "backdrop-blur-xl",

            "shadow-[12px_0_35px_rgba(0,0,0,0.08)]",


            /*
              Animation ONLY desktop
            */

            "xl:transition-[opacity,transform]",

            "xl:duration-300",

            "xl:ease-out",


            selectedSection

              ? "translate-x-0 opacity-100"

              : "pointer-events-none -translate-x-2 opacity-0",
          )}
        >

          {selectedSection && (

            <div
              className="
                flex

                h-full

                flex-col
              "
            >


              {/* ==============================================
                  SIDEBAR 2 HEADER
              ============================================== */}

              <div
                className="
                  relative

                  shrink-0

                  border-b

                  border-sidebar-border

                  px-5

                  pb-4

                  pt-6
                "
              >

                <div
                  className="
                    mb-1

                    flex

                    items-center

                    gap-2
                  "
                >

                  <span
                    className="
                      h-1.5

                      w-1.5

                      rounded-full

                      bg-sidebar-primary
                    "
                  />

                  <span
                    className="
                      text-[9px]

                      font-bold

                      uppercase

                      tracking-[0.18em]

                      text-sidebar-foreground/35
                    "
                  >
                    Business OS
                  </span>

                </div>


                <h2
                  className="
                    font-heading

                    text-[15px]

                    font-bold

                    tracking-tight

                    text-white
                  "
                >
                  {
                    selectedSection.label
                  }
                </h2>


                <p
                  className="
                    mt-1

                    text-[11px]

                    leading-relaxed

                    text-sidebar-foreground/45
                  "
                >
                  {
                    getSectionDescription(
                      selectedSection.label,
                    )
                  }
                </p>

              </div>


              {/* ==============================================
                  SECONDARY NAVIGATION
              ============================================== */}

              <nav
                className="
                  thin-scroll

                  flex-1

                  overflow-y-auto

                  px-3

                  py-4
                "
              >

                <div className="space-y-1">

                  {selectedSection.items.map(
                    (
                      item,
                      index,
                    ) => {

                      const count =
                        item.count
                          ? counts[
                              item.count
                            ]
                          : 0;


                      const ItemIcon =
                        item.icon;


                      return (

                        <NavLink
                          key={`${selectedSection.sectionKey}-${item.label}-${index}`}

                          to={item.to}

                          end={item.end}

                          onClick={() =>
                            handleSubNavigationClick(
                              item.to,
                            )
                          }

                          className={({
                            isActive,
                          }) =>
                            cn(

                              "group",

                              "relative",

                              "flex",

                              "items-center",

                              "gap-3",

                              "rounded-xl",

                              "px-3",

                              "py-2.5",

                              "xl:transition-all",

                              "xl:duration-200",


                              isActive

                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"

                                : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-white",
                            )
                          }
                        >

                          {({
                            isActive,
                          }) => (

                            <>

                              {/* Active marker */}

                              <span
                                className={cn(

                                  "absolute",

                                  "left-0",

                                  "top-1/2",

                                  "h-5",

                                  "w-[3px]",

                                  "-translate-y-1/2",

                                  "rounded-r-full",


                                  isActive

                                    ? "bg-sidebar-primary-foreground opacity-100"

                                    : "opacity-0",
                                )}
                              />


                              {/* Icon */}

                              {ItemIcon ? (

                                <ItemIcon
                                  className="
                                    h-4

                                    w-4

                                    shrink-0

                                    xl:transition-transform

                                    xl:duration-200

                                    xl:group-hover:scale-105
                                  "
                                  strokeWidth={
                                    1.9
                                  }
                                />

                              ) : (

                                <span
                                  className={cn(

                                    "h-1.5",

                                    "w-1.5",

                                    "shrink-0",

                                    "rounded-full",


                                    isActive

                                      ? "bg-current"

                                      : "bg-sidebar-foreground/30",
                                  )}
                                />

                              )}


                              {/* Label */}

                              <span
                                className="
                                  min-w-0

                                  flex-1

                                  truncate

                                  text-[12px]

                                  font-medium
                                "
                              >
                                {
                                  item.label
                                }
                              </span>


                              {/* Count */}

                              {count > 0 && (

                                <span
                                  className={cn(

                                    "rounded-full",

                                    "px-1.5",

                                    "py-0.5",

                                    "text-[10px]",

                                    "font-bold",


                                    isActive

                                      ? "bg-white/15 text-white"

                                      : "bg-sidebar-primary/20 text-sidebar-primary-foreground",
                                  )}
                                >
                                  {
                                    count
                                  }
                                </span>

                              )}


                              {/* Arrow */}

                              <ChevronRight
                                className={cn(

                                  "h-3.5",

                                  "w-3.5",

                                  "shrink-0",


                                  "xl:transition-all",

                                  "xl:duration-200",


                                  isActive

                                    ? "translate-x-0 opacity-80"

                                    : "-translate-x-1 opacity-0 xl:group-hover:translate-x-0 xl:group-hover:opacity-50",
                                )}
                                strokeWidth={
                                  1.8
                                }
                              />

                            </>

                          )}

                        </NavLink>

                      );

                    },
                  )}

                </div>

              </nav>

            </div>

          )}

        </aside>

      </div>

    </>
  );
}