import {
  LayoutDashboard,
  Megaphone,
  Handshake,
  Factory,
  Workflow,
  Users,
  Wallet,
  BarChart3,
  ShieldCheck,
  Briefcase,
  ClipboardList,
  UserCog,
  Settings,
  FileText,
  Receipt,
  Building2,
  Contact,
  Target,
  Activity,
  CheckSquare,
  MessageSquare,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  Percent,
  Share2,
  LayoutList,
  GitBranch,
  ListChecks,
  BadgeCheck,
  Timer,
  FormInput,
  Files,
  FileBarChart,
  CreditCard,
  Banknote,
  Package,
  LifeBuoy,
  Wrench,
  Star,
  Gauge,
  History,
  UsersRound,
  Plug,
  Rocket,
  SlidersHorizontal,
} from "lucide-react";

export interface ModuleLink {
  to: string;
  label: string;
  icon?: React.ElementType;
  adminOnly?: boolean;
}

export interface ModuleGroup {
  key: string;
  label: string;
  icon: React.ElementType;
  to: string;
  adminOnly?: boolean;
  children?: ModuleLink[];
}

export interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  end?: boolean;
  adminOnly?: boolean;
  count?: "jobs" | "approvals" | "assignments" | "overdue";
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/**
 * ============================================================
 * RST BUSINESS OS — PRIMARY NAVIGATION
 * ============================================================
 *
 * The sidebar follows the actual operating journey:
 *
 * WORKSPACE
 *     ↓
 * CLIENT ACQUISITION
 *     ↓
 * SALES PIPELINE
 *     ↓
 * WORK & SOP
 *     ↓
 * FINANCE
 *     ↓
 * CLIENT SUCCESS
 *     ↓
 * GROWTH
 *     ↓
 * MANAGEMENT
 *     ↓
 * ADMINISTRATION
 *
 * IMPORTANT:
 * This is intentionally a workflow-oriented hierarchy rather
 * than a department-oriented hierarchy.
 *
 * The objective is that a user can start at Campaigns and
 * progressively move through the business process without
 * having to search different departments for the next step.
 * ============================================================
 */

export const NAV_SECTIONS: NavSection[] = [
  // ==========================================================
  // WORKSPACE
  // ==========================================================
  {
    label: "WORKSPACE",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        to: "/dashboard",
        end: true,
      },
      {
        label: "My Work",
        icon: CheckSquare,
        to: "/jobs",
        count: "jobs",
      },
    ],
  },

  // ==========================================================
  // CLIENT ACQUISITION
  // ==========================================================
  {
    label: "CLIENT ACQUISITION",
    items: [
      {
        label: "Campaigns",
        icon: Megaphone,
        to: "/outreach/campaigns",
      },
      {
        label: "Contacts",
        icon: Contact,
        to: "/crm/contacts",
      },
      {
        label: "Accounts",
        icon: Building2,
        to: "/crm/accounts",
      },
      {
        label: "Activities",
        icon: Activity,
        to: "/crm/activities",
      },
      {
        label: "Tasks & Follow-ups",
        icon: ListChecks,
        to: "/crm/activities",
      },
    ],
  },

  // ==========================================================
  // SALES PIPELINE
  // ==========================================================
  {
    label: "SALES PIPELINE",
    items: [
      {
        label: "Leads",
        icon: Target,
        to: "/crm/leads",
      },
      {
        label: "Opportunities",
        icon: Handshake,
        to: "/crm/opportunities",
      },
      {
        label: "Proposals",
        icon: FileSignature,
        to: "/sales/proposals",
      },
      {
        label: "Deals",
        icon: BadgeCheck,
        to: "/crm/deals",
      },
      {
        label: "Win / Loss Analytics",
        icon: BarChart3,
        to: "/sales/win-loss",
      },
      {
        label: "Sales Forecast",
        icon: Gauge,
        to: "/sales/forecast",
      },
    ],
  },

  // ==========================================================
  // WORK & SOP
  // ==========================================================
  {
    label: "WORK & SOP",
    items: [
      {
        label: "SOP Templates",
        icon: Workflow,
        to: "/admin/sop",
      },
      {
        label: "Workflows",
        icon: GitBranch,
        to: "/admin/sop",
      },
      {
        label: "Jobs / Projects",
        icon: Briefcase,
        to: "/jobs",
        count: "jobs",
      },
      {
        label: "My Assignments",
        icon: ClipboardList,
        to: "/admin/assignments",
        count: "assignments",
      },
      {
        label: "Team Allocation",
        icon: UsersRound,
        to: "/operations/allocation",
      },
      {
        label: "Scheduling",
        icon: CalendarDays,
        to: "/operations/schedule",
      },
      {
        label: "Approvals",
        icon: ClipboardCheck,
        to: "/operations",
        count: "approvals",
      },
      {
        label: "SLA Monitor",
        icon: Timer,
        to: "/operations",
        count: "overdue",
      },
      {
        label: "Forms",
        icon: FormInput,
        to: "/admin/sop",
      },
      {
        label: "Documents",
        icon: Files,
        to: "/operations",
      },
      {
        label: "QC & Handover",
        icon: BadgeCheck,
        to: "/operations/qc",
      },
    ],
  },

  // ==========================================================
  // FINANCE
  // ==========================================================
  {
    label: "FINANCE",
    items: [
      {
        label: "Quotes",
        icon: FileText,
        to: "/finance",
      },
      {
        label: "Invoices",
        icon: Receipt,
        to: "/finance",
      },
      {
        label: "Payments",
        icon: CreditCard,
        to: "/finance",
      },
      {
        label: "Expenses",
        icon: Banknote,
        to: "/finance",
      },
      {
        label: "Products & Services",
        icon: Package,
        to: "/finance",
      },
    ],
  },

  // ==========================================================
  // CLIENT SUCCESS
  // ==========================================================
  {
    label: "CLIENT SUCCESS",
    items: [
      {
        label: "Clients",
        icon: Users,
        to: "/clients",
      },
      {
        label: "Client Portal Access",
        icon: Share2,
        to: "/clients/portal",
      },
      {
        label: "Support Tickets",
        icon: LifeBuoy,
        to: "/clients/tickets",
      },
      {
        label: "Renewals & Maintenance",
        icon: Wrench,
        to: "/clients/reminders",
      },
      {
        label: "Feedback",
        icon: Star,
        to: "/clients/feedback",
      },
    ],
  },

  // ==========================================================
  // GROWTH
  // ==========================================================
  {
    label: "GROWTH",
    items: [
      {
        label: "Partners & Referrals",
        icon: Share2,
        to: "/outreach",
      },
      {
        label: "Reports",
        icon: FileBarChart,
        to: "/reports",
      },
    ],
  },

  // ==========================================================
  // MANAGEMENT
  // ==========================================================
  {
    label: "MANAGEMENT",
    items: [
      {
        label: "Reports & Analytics",
        icon: BarChart3,
        to: "/admin/reports",
        adminOnly: true,
      },
      {
        label: "Performance",
        icon: Gauge,
        to: "/admin/reports",
        adminOnly: true,
      },
      {
        label: "Audit Trail",
        icon: History,
        to: "/admin/reports",
        adminOnly: true,
      },
    ],
  },

  // ==========================================================
  // ADMINISTRATION
  // ==========================================================
  {
    label: "ADMINISTRATION",
    items: [
      {
        label: "Users & Roles",
        icon: UserCog,
        to: "/admin/users",
        adminOnly: true,
      },
      {
        label: "Teams",
        icon: UsersRound,
        to: "/admin/roles",
        adminOnly: true,
      },
      {
        label: "Business Configuration",
        icon: SlidersHorizontal,
        to: "/admin/configuration",
        adminOnly: true,
      },
      {
        label: "Integrations",
        icon: Plug,
        to: "/admin/integrations",
        adminOnly: true,
      },
      {
        label: "Settings",
        icon: Settings,
        to: "/settings",
      },
    ],
  },
];

/**
 * ============================================================
 * ROUTE TITLES
 * ============================================================
 *
 * These titles/subtitles are used by the application shell
 * when displaying the current page.
 *
 * The descriptions reinforce the same operating sequence
 * represented by the sidebar.
 * ============================================================
 */

export const ROUTE_TITLES: Array<{
  path: string;
  title: string;
  subtitle: string;
}> = [
  // ----------------------------------------------------------
  // WORKSPACE
  // ----------------------------------------------------------
  {
    path: "/dashboard",
    title: "Dashboard",
    subtitle: "See what is happening across your business.",
  },
  {
    path: "/my-work",
    title: "My Work",
    subtitle: "See the work, assignments and follow-ups that need your attention.",
  },

  // ----------------------------------------------------------
  // CLIENT ACQUISITION
  // ----------------------------------------------------------
  {
    path: "/outreach/campaigns",
    title: "Campaigns",
    subtitle: "Create campaigns that generate new business opportunities.",
  },
  {
    path: "/outreach/forms",
    title: "Lead Capture Forms",
    subtitle: "Capture enquiries directly into your acquisition pipeline.",
  },
  {
    path: "/outreach/inbox",
    title: "Inbound Inbox",
    subtitle: "Manage enquiries coming into your business.",
  },
  {
    path: "/crm/contacts",
    title: "Contacts",
    subtitle: "Manage the people connected to your business relationships.",
  },
  {
    path: "/crm/accounts",
    title: "Accounts",
    subtitle: "Manage businesses and organisations throughout their lifecycle.",
  },
  {
    path: "/crm/activities",
    title: "Activities & Follow-ups",
    subtitle: "Record conversations, tasks, meetings and the next action.",
  },
  {
    path: "/outreach",
    title: "Outreach & CRM",
    subtitle: "Manage acquisition activity and customer relationships.",
  },

  // ----------------------------------------------------------
  // SALES PIPELINE
  // ----------------------------------------------------------
  {
    path: "/crm/leads",
    title: "Leads",
    subtitle: "Qualify enquiries and convert the right opportunities.",
  },
  {
    path: "/crm/opportunities",
    title: "Opportunities",
    subtitle: "Manage qualified business opportunities through your sales pipeline.",
  },
  {
    path: "/sales/proposals",
    title: "Proposal Templates",
    subtitle: "Create professional proposals from qualified opportunities.",
  },
  {
    path: "/crm/deals",
    title: "Deals",
    subtitle: "Close opportunities and move won business into delivery.",
  },
  {
    path: "/sales/win-loss",
    title: "Win / Loss Analytics",
    subtitle: "Understand why opportunities are won or lost.",
  },
  {
    path: "/sales/forecast",
    title: "Sales Forecast",
    subtitle: "Forecast revenue from your active sales pipeline.",
  },
  {
    path: "/sales",
    title: "Sales",
    subtitle: "Manage leads, opportunities, proposals and deals.",
  },

  // ----------------------------------------------------------
  // WORK & SOP
  // ----------------------------------------------------------
  {
    path: "/admin/sop",
    title: "SOP Builder",
    subtitle: "Design the workflows and operating procedures your business runs on.",
  },
  {
    path: "/jobs/new",
    title: "New Job",
    subtitle: "Start a work item from one of your workflows.",
  },
  {
    path: "/jobs",
    title: "Jobs / Projects",
    subtitle: "Every active work item running through your SOP engine.",
  },
  {
    path: "/operations",
    title: "Operations",
    subtitle: "Run delivery, approvals, SLAs and operational execution.",
  },
  {
    path: "/operations/allocation",
    title: "Team Allocation",
    subtitle: "Assign responsibility for live operational work.",
  },
  {
    path: "/operations/schedule",
    title: "Scheduling",
    subtitle: "Plan workload and schedule work against operational deadlines.",
  },
  {
    path: "/operations/qc",
    title: "QC & Handover",
    subtitle: "Complete quality checks, approvals and client handover.",
  },
  {
    path: "/admin/assignments",
    title: "Stage Assignments",
    subtitle: "Manage responsibility defaults for workflow stages.",
  },

  // ----------------------------------------------------------
  // FINANCE
  // ----------------------------------------------------------
  {
    path: "/finance",
    title: "Finance",
    subtitle: "Manage quotes, invoices, payments, expenses and financial records.",
  },

  // ----------------------------------------------------------
  // CLIENT SUCCESS
  // ----------------------------------------------------------
  {
    path: "/clients",
    title: "Clients",
    subtitle: "Manage active clients, relationships and ongoing work.",
  },
  {
    path: "/clients/portal",
    title: "Client Portal Access",
    subtitle: "Give clients secure access to their work and progress.",
  },
  {
    path: "/clients/tickets",
    title: "Support Tickets",
    subtitle: "Manage client issues, support requests and service cases.",
  },
  {
    path: "/clients/reminders",
    title: "Renewals & Maintenance",
    subtitle: "Manage recurring services, renewals and maintenance.",
  },
  {
    path: "/clients/feedback",
    title: "Client Feedback",
    subtitle: "Capture reviews, ratings, complaints and client feedback.",
  },

  // ----------------------------------------------------------
  // GROWTH
  // ----------------------------------------------------------
  {
    path: "/reports",
    title: "Reports",
    subtitle: "Monitor business activity and commercial performance.",
  },

  // ----------------------------------------------------------
  // MANAGEMENT
  // ----------------------------------------------------------
  {
    path: "/admin/reports",
    title: "Reports & Analytics",
    subtitle: "Measure performance across the entire business operation.",
  },

  // ----------------------------------------------------------
  // ADMINISTRATION
  // ----------------------------------------------------------
  {
    path: "/admin/users",
    title: "Users & Roles",
    subtitle: "Manage workspace users and access permissions.",
  },
  {
    path: "/admin/roles",
    title: "Roles & Teams",
    subtitle: "Define responsibilities and team structures.",
  },
  {
    path: "/admin/configuration",
    title: "Business Configuration",
    subtitle: "Define how your Business OS operates.",
  },
  {
    path: "/admin/integrations",
    title: "Integration Center",
    subtitle: "Connect your workspace with external tools and services.",
  },
  {
    path: "/settings",
    title: "Settings",
    subtitle: "Manage your profile, appearance, notifications and preferences.",
  },
];

/**
 * ============================================================
 * LEGACY / MODULE DEFINITIONS
 * ============================================================
 *
 * Kept for compatibility with existing components that still
 * consume MODULES rather than NAV_SECTIONS.
 * ============================================================
 */

export const MODULES: ModuleGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/dashboard",
  },

  {
    key: "outreach",
    label: "Outreach",
    icon: Megaphone,
    to: "/outreach",
  },

  {
    key: "sales",
    label: "Sales",
    icon: Handshake,
    to: "/sales",
  },

  {
    key: "operations",
    label: "Operations",
    icon: Factory,
    to: "/operations",
    children: [
      {
        to: "/jobs",
        label: "Jobs",
        icon: Briefcase,
      },
      {
        to: "/admin/assignments",
        label: "Legacy Stages",
        icon: ClipboardList,
        adminOnly: true,
      },
    ],
  },

  {
    key: "sop",
    label: "SOP",
    icon: Workflow,
    to: "/admin/sop",
    adminOnly: true,
    children: [
      {
        to: "/admin/sop",
        label: "SOP Builder",
        icon: Workflow,
        adminOnly: true,
      },
      {
        to: "/admin/roles",
        label: "Roles",
        icon: UserCog,
        adminOnly: true,
      },
    ],
  },

  {
    key: "clients",
    label: "Clients",
    icon: Users,
    to: "/clients",
  },

  {
    key: "finance",
    label: "Finance",
    icon: Wallet,
    to: "/finance",
    children: [
      {
        to: "/finance",
        label: "Overview",
        icon: Receipt,
      },
    ],
  },

  {
    key: "reporting",
    label: "Reporting",
    icon: BarChart3,
    to: "/admin/reports",
    adminOnly: true,
  },

  {
    key: "admin",
    label: "Admin",
    icon: ShieldCheck,
    to: "/admin/users",
    adminOnly: true,
    children: [
      {
        to: "/admin/users",
        label: "User Management",
        icon: Users,
        adminOnly: true,
      },
      {
        to: "/settings",
        label: "Settings",
        icon: Settings,
      },
      {
        to: "/admin/reports",
        label: "Reports",
        icon: FileText,
        adminOnly: true,
      },
    ],
  },
];