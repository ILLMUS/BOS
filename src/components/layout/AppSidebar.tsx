import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

import {
  canAccessPath,
  AUTHORITY_LABELS,
} from "@/lib/authority";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  cn,
} from "@/lib/utils";

import {
  NAV_SECTIONS,
} from "@/lib/modules";

import {
  ROLE_LABELS,
} from "@/lib/constants";

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
   SIDEBAR DIMENSIONS

   Sidebar 1 = 72px

   Sidebar 2 = 270px

   Both open = 342px
============================================================ */

const SIDEBAR_ONE_WIDTH = 72;

const SIDEBAR_TWO_WIDTH = 270;

const TOTAL_SIDEBAR_WIDTH =
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
  collapsed: _collapsed,
  onToggleCollapse: _onToggleCollapse,
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

  const {
    pathname,
  } = useLocation();

  const navigate =
    useNavigate();


  /* ==========================================================
     SIDEBAR 1 HOVER

     Sidebar 1 normally stays at 72px.

     On hover:

     72px → 256px

     This expansion overlays Sidebar 2.

     It NEVER pushes Sidebar 2.

     It NEVER pushes the page.
  ========================================================== */

  const [
    sidebarOneHovered,
    setSidebarOneHovered,
  ] = useState(false);


  /* ==========================================================
     SIDEBAR 2 SELECTION

     No selected section:

     Page starts at 72px.

     Selected section:

     Sidebar 2 opens.

     Page starts at 342px.
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

      return NAV_SECTIONS
        .map((section, index) => {

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

        })
        .filter(
          (section) =>
            section.items.length > 0,
        );

    }, [
      authority,
      isAdmin,
    ]);


  /* ==========================================================
     ACTIVE SECTION
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
     COUNTERS
  ========================================================== */

  useEffect(() => {

    let cancelled =
      false;


    const loadCounts =
      async () => {

        const [
          jobsRes,
          approvalsRes,
          assignmentsRes,
          slaRes,
        ] = await Promise.all([

          /* JOBS */

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


          /* APPROVALS */

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


          /* ASSIGNMENTS */

          user
            ? supabase
                .from("job_stages")
                .select(
                  "id",
                  {
                    count: "exact",
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
              } as any),


          /* SLA */

          supabase
            .from("job_stages")
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


        const now =
          Date.now();


        const overdue =
          (
            (
              slaRes as any
            ).data || []
          ).filter(
            (stage: any) =>
              now >
              new Date(
                stage.sla_started_at,
              ).getTime() +
                stage.sla_deadline_hours *
                  3600_000,
          ).length;


        if (!cancelled) {

          setCounts({

            jobs:
              jobsRes.count ?? 0,

            approvals:
              approvalsRes.count ?? 0,

            assignments:
              (
                assignmentsRes as any
              ).count ?? 0,

            overdue,

          });

        }

      };


    loadCounts();


    return () => {

      cancelled =
        true;

    };

  }, [
    user,
  ]);


  /* ==========================================================
     USER INITIALS
  ========================================================== */

  const initials =
    (
      profile?.full_name ||
      "U"
    )
      .split(" ")
      .map(
        (part) =>
          part[0],
      )
      .slice(0, 2)
      .join("")
      .toUpperCase();


  /* ==========================================================
     SELECTED SIDEBAR 2 SECTION
  ========================================================== */

  const selectedSection =
    visibleSections.find(
      (section) =>
        section.sectionKey ===
        selectedSectionKey,
    );


  /* ==========================================================
     SIDEBAR 2 OPEN STATE
  ========================================================== */

  const sidebarTwoOpen =
    Boolean(
      selectedSection,
    );


  /* ==========================================================
     PAGE OFFSET

     Sidebar 2 CLOSED:

     Page starts after Sidebar 1.

     72px


     Sidebar 2 OPEN:

     Page starts after Sidebar 1
     + Sidebar 2.

     72 + 270 = 342px
  ========================================================== */

  const pageOffset =
    sidebarTwoOpen
      ? TOTAL_SIDEBAR_WIDTH
      : SIDEBAR_ONE_WIDTH;


  /* ==========================================================
     MAIN SECTION CLICK

     Clicking a main section:

     • Opens Sidebar 2.

     Clicking the same section:

     • Closes Sidebar 2.

     The page automatically moves:

     72px ↔ 342px
  ========================================================== */

  const handleMainSectionClick = (
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

     • Navigate to page.
     • Sidebar 2 remains open.
     • Sidebar 1 collapses.
  ========================================================== */

  const handleSubNavigationClick = (
    to: string,
  ) => {

    setSidebarOneHovered(
      false,
    );

    navigate(to);

  };


  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>

      {/* ====================================================
          PAGE SPACER

          THIS IS THE IMPORTANT PART.

          The spacer takes up real layout space.

          CLOSED:
          72px

          OPEN:
          342px

          This pushes the page content.

          Sidebar 1 and Sidebar 2 themselves
          remain fixed.

          IMPORTANT:

          Your application layout should use:

          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1">
              ...
            </main>
          </div>
      ==================================================== */}

      <div
        className={cn(

          "hidden lg:block",

          "h-screen shrink-0",

          "transition-[width] duration-300 ease-out",

        )}
        style={{
          width: `${pageOffset}px`,
        }}
        aria-hidden="true"
      />


      {/* ====================================================
          MOBILE BACKDROP
      ==================================================== */}

      {open && (

        <div
          className="
            fixed inset-0 z-40
            bg-foreground/30
            backdrop-blur-[2px]
            lg:hidden
          "
          onClick={onClose}
        />

      )}


      {/* ====================================================
          FIXED SIDEBAR SYSTEM

          The actual sidebars are fixed.

          The spacer above reserves the space
          for the page.

          Therefore:

          Sidebar 1 hover expansion
          DOES NOT affect page position.

          Sidebar 2 selection
          DOES affect page position.
      ==================================================== */}

      <div
        className={cn(

          "fixed left-0 top-0 z-50",

          "h-full",

          "transition-transform",
          "duration-300",
          "ease-out",

          "lg:translate-x-0",

          open
            ? "translate-x-0"
            : "-translate-x-full",

        )}
      >


        {/* ==================================================
            SIDEBAR 1
        ================================================== */}

        <aside
          className={cn(

            /*
             Sidebar 1 is above Sidebar 2.

             z-[70]
            */

            "absolute left-0 top-0 z-[70]",

            "flex h-full flex-col",

            "overflow-hidden",

            "bg-sidebar",
            "text-sidebar-foreground",

            "border-r",
            "border-sidebar-border",

            "shadow-[8px_0_30px_rgba(0,0,0,0.15)]",


            /*
             Normal:

             72px

             Hover:

             256px

             This overlays Sidebar 2.
            */

            sidebarOneHovered
              ? "w-64"
              : "w-[72px]",


            "transition-[width]",
            "duration-300",
            "ease-out",

          )}

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


          {/* ================================================
              BACKGROUND EFFECT
          ================================================ */}

          <div
            className="
              pointer-events-none
              absolute inset-0 z-0
              opacity-60
            "
            style={{
              background:
                "radial-gradient(ellipse at 0% 0%, hsl(var(--gradient-yellow) / 0.22) 0%, transparent 40%), radial-gradient(ellipse at 100% 100%, hsl(var(--gradient-green) / 0.18) 0%, transparent 40%), radial-gradient(ellipse at 0% 100%, hsl(var(--gradient-white) / 0.10) 0%, transparent 40%)",
            }}
            aria-hidden="true"
          />


          {/* ================================================
              BRAND
          ================================================ */}

          <div
            className={cn(

              "relative z-10",

              "flex h-16 shrink-0 items-center",


              sidebarOneHovered
                ? "gap-2.5 px-4"
                : "justify-center px-0",

            )}
          >

            <div
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center

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


            <div
              className={cn(

                "min-w-0 overflow-hidden",

                "transition-all",
                "duration-200",


                sidebarOneHovered
                  ? "max-w-[180px] opacity-100"
                  : "max-w-0 opacity-0",

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


          {/* ================================================
              PRIMARY NAVIGATION
          ================================================ */}

          <nav
            className="
              thin-scroll

              relative z-10

              flex-1

              overflow-y-auto

              px-3 py-4
            "
          >

            <div
              className="
                space-y-1.5
              "
            >

              {
                visibleSections.map(
                  (
                    section,
                    index,
                  ) => {


                    /* ======================================
                        ICON
                    ====================================== */

                    const SectionIcon =

                      SECTION_ICONS[
                        section.label ?? ""
                      ]

                      ??

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
                      ][index]

                      ??

                      Boxes;


                    /* ======================================
                        ACTIVE
                    ====================================== */

                    const isActive =

                      activeSectionKeys.has(
                        section.sectionKey,
                      );


                    /* ======================================
                        SELECTED
                    ====================================== */

                    const isSelected =

                      selectedSectionKey ===
                      section.sectionKey;


                    /* ======================================
                        COUNTS
                    ====================================== */

                    const totalCount =

                      section.items.reduce(

                        (
                          sum,
                          item,
                        ) =>

                          sum +

                          (
                            item.count
                              ? counts[item.count]
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

                          "flex w-full",

                          "items-center",
                          "gap-0",

                          "rounded-xl",

                          "transition-all",

                          "duration-200",


                          sidebarOneHovered
                            ? "gap-3 px-3 py-2.5"
                            : "justify-center px-0 py-3",


                          isSelected

                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm pl-3"

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
                          !sidebarOneHovered
                            ? section.label
                            : undefined
                        }
                      >


                        {/* ACTIVE INDICATOR */}

                        <span
                          className={cn(

                            "absolute",

                            "left-0",

                            "top-1/2",

                            "h-5",

                            "w-[3px]",

                            "-translate-y-1/2",

                            "rounded-r-full",

                            "transition-opacity",

                            "duration-200",


                            isSelected

                              ? "bg-sidebar-primary-foreground opacity-100"

                              : isActive

                                ? "bg-sidebar-primary opacity-100"

                                : "opacity-0",

                          )}
                        />


                        {/* ICON */}

                        <SectionIcon
                          className="
                            h-[18px]
                            w-[18px]

                            shrink-0

                            transition-transform
                            duration-200

                            group-hover:scale-105
                          "
                          strokeWidth={1.9}
                        />


                        {/* LABEL */}

                        <span
                          className={cn(

                            "min-w-0",

                            "flex-1",

                            "truncate",

                            "text-left",

                            "text-[12px]",

                            "font-semibold",

                            "uppercase",

                            "tracking-[0.055em]",

                            "transition-all",

                            "duration-200",


                            sidebarOneHovered

                              ? "translate-x-0 opacity-100"

                              : "-translate-x-2 opacity-0",

                          )}
                        >
                          {
                            section.label
                          }
                        </span>


                        {/* COUNTS */}

                        {
                          sidebarOneHovered &&
                          totalCount > 0 && (

                            <span
                              className={cn(

                                "rounded-full",

                                "px-1.5 py-0.5",

                                "text-[10px]",

                                "font-bold",


                                isSelected

                                  ? "bg-white/15 text-white"

                                  : "bg-sidebar-primary/20 text-sidebar-primary-foreground",

                              )}
                            >
                              {
                                totalCount
                              }
                            </span>

                          )
                        }


                        {/* ARROW */}

                        {
                          sidebarOneHovered && (

                            <ChevronRight
                              className={cn(

                                "h-3.5",

                                "w-3.5",

                                "shrink-0",

                                "transition-transform",

                                "duration-200",


                                isSelected

                                  ? "translate-x-0.5"

                                  : "opacity-40 group-hover:opacity-100",

                              )}

                              strokeWidth={2}
                            />

                          )
                        }

                      </button>

                    );

                  },
                )
              }

            </div>

          </nav>


          {/* ================================================
              USER
          ================================================ */}

          <button
            type="button"

            onClick={() =>
              navigate("/settings")
            }

            title="Edit your profile"

            aria-label="Edit your profile"

            className={cn(

              "relative z-10",

              "flex w-full",

              "shrink-0",

              "items-center",

              "border-t",

              "border-sidebar-border",

              "transition-colors",

              "hover:bg-sidebar-accent/50",


              sidebarOneHovered
                ? "gap-3 px-3 py-3"
                : "justify-center px-0 py-3",

            )}
          >


            {/* AVATAR */}

            <div
              className="
                flex

                h-9 w-9

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
              {initials}
            </div>


            {/* USER INFORMATION */}

            <div
              className={cn(

                "min-w-0",

                "flex-1",

                "overflow-hidden",

                "text-left",

                "transition-all",

                "duration-200",


                sidebarOneHovered

                  ? "max-w-[170px] opacity-100"

                  : "max-w-0 opacity-0",

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
                    ? ` · ${ROLE_LABELS[
                        roles[0]
                      ]}`
                    : ""
                }

              </p>

            </div>


            {
              sidebarOneHovered && (

                <MoreVertical
                  className="
                    h-4 w-4

                    shrink-0

                    text-sidebar-foreground/30
                  "
                />

              )
            }

          </button>

        </aside>


        {/* ==================================================
            SIDEBAR 2

            Always positioned after the
            72px Sidebar 1.

            It does NOT move when Sidebar 1
            expands.

            Sidebar 1 overlays it because:

            Sidebar 1 = z-[70]
            Sidebar 2 = z-[60]
        ================================================== */}

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


            "transition-[opacity,transform]",

            "duration-300",

            "ease-out",


            sidebarTwoOpen

              ? "translate-x-0 opacity-100"

              : "pointer-events-none -translate-x-2 opacity-0",

          )}
        >


          {
            selectedSection && (

              <div
                className="
                  flex h-full flex-col
                "
              >


                {/* ==========================================
                    SIDEBAR 2 HEADER
                ========================================== */}

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


                {/* ==========================================
                    SECONDARY NAVIGATION
                ========================================== */}

                <nav
                  className="
                    thin-scroll

                    flex-1

                    overflow-y-auto

                    px-3

                    py-4
                  "
                >

                  <div
                    className="
                      space-y-1
                    "
                  >

                    {
                      selectedSection.items.map(

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

                              key={
                                `${selectedSection.sectionKey}-${item.label}-${index}`
                              }

                              to={
                                item.to
                              }

                              end={
                                item.end
                              }

                              onClick={() =>
                                handleSubNavigationClick(
                                  item.to,
                                )
                              }

                              className={(
                                {
                                  isActive,
                                },
                              ) =>

                                cn(

                                  "group",

                                  "relative",

                                  "flex",

                                  "items-center",

                                  "gap-3",

                                  "rounded-xl",

                                  "px-3",

                                  "py-2.5",

                                  "transition-all",

                                  "duration-200",


                                  isActive

                                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"

                                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-white",

                                )

                              }
                            >

                              {
                                (
                                  {
                                    isActive,
                                  },
                                ) => (

                                  <>


                                    {/* ACTIVE MARKER */}

                                    <span
                                      className={cn(

                                        "absolute",

                                        "left-0",

                                        "top-1/2",

                                        "h-5",

                                        "w-[3px]",

                                        "-translate-y-1/2",

                                        "rounded-r-full",

                                        "transition-opacity",


                                        isActive

                                          ? "bg-sidebar-primary-foreground opacity-100"

                                          : "opacity-0",

                                      )}
                                    />


                                    {/* ICON */}

                                    {
                                      ItemIcon

                                        ? (

                                          <ItemIcon

                                            className="
                                              h-4 w-4

                                              shrink-0

                                              transition-transform

                                              duration-200

                                              group-hover:scale-105
                                            "

                                            strokeWidth={
                                              1.9
                                            }

                                          />

                                        )

                                        : (

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

                                        )
                                    }


                                    {/* LABEL */}

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


                                    {/* COUNT */}

                                    {
                                      count > 0 && (

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

                                      )
                                    }


                                    {/* ARROW */}

                                    <ChevronRight

                                      className={cn(

                                        "h-3.5",

                                        "w-3.5",

                                        "shrink-0",

                                        "transition-all",

                                        "duration-200",


                                        isActive

                                          ? "translate-x-0 opacity-80"

                                          : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-50",

                                      )}

                                      strokeWidth={
                                        1.8
                                      }

                                    />

                                  </>

                                )
                              }

                            </NavLink>

                          );

                        },

                      )
                    }

                  </div>

                </nav>

              </div>

            )
          }

        </aside>

      </div>

    </>
  );
}