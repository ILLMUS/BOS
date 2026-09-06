import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Code2,
  FileCheck2,
  GitBranch,
  Layers3,
  Menu,
  MessageSquare,
  Play,
  Rocket,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  UserCheck,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFlow, setActiveFlow] = useState(0);
  const [terminalLine, setTerminalLine] = useState(0);

  const flowSteps = useMemo(
    () => [
      {
        label: "Campaign",
        title: "Acquire the customer",
        description:
          "Launch campaigns, build target lists, manage sequences and track outreach from one workspace.",
        icon: Send,
        color: "purple",
        status: "Campaign active",
        metric: "1 campaign",
      },
      {
        label: "Lead",
        title: "Qualify the opportunity",
        description:
          "Turn enquiries into structured leads, assign ownership, schedule follow-ups and qualify before conversion.",
        icon: Target,
        color: "blue",
        status: "Lead qualified",
        metric: "Qualified",
      },
      {
        label: "Opportunity",
        title: "Move the deal forward",
        description:
          "Manage opportunities, proposals, deal values, forecasts and the commercial pipeline.",
        icon: BriefcaseBusiness,
        color: "indigo",
        status: "Opportunity active",
        metric: "E8,500",
      },
      {
        label: "Client",
        title: "Onboard the customer",
        description:
          "Convert won business into a client record and move directly into delivery and customer success.",
        icon: UserCheck,
        color: "violet",
        status: "Client active",
        metric: "Onboarding",
      },
      {
        label: "Work",
        title: "Execute the operation",
        description:
          "Run jobs through workflows, SOPs, assignments, schedules, approvals, SLA monitoring and QC.",
        icon: Workflow,
        color: "cyan",
        status: "Work in progress",
        metric: "SLA active",
      },
      {
        label: "Finance",
        title: "Invoice and collect",
        description:
          "Connect the commercial outcome to quotes, invoices, payments, expenses and financial records.",
        icon: CircleDollarSign,
        color: "emerald",
        status: "Payment received",
        metric: "E4,250",
      },
    ],
    []
  );

  const terminalLines = [
    "campaign.create()",
    "account.attach('Mbabane Growth Solutions')",
    "contact.link('Thabo Dlamini')",
    "outreach.sequence.start()",
    "lead.status = 'qualified'",
    "opportunity.create(value=8500)",
    "proposal.send()",
    "deal.status = 'won'",
    "client.activate()",
    "workflow.start('Website Development')",
    "invoice.issue(amount=4250)",
    "payment.record(amount=4250)",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFlow((prev) => (prev + 1) % flowSteps.length);
    }, 4200);

    return () => clearInterval(timer);
  }, [flowSteps.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalLine((prev) => (prev + 1) % terminalLines.length);
    }, 1700);

    return () => clearInterval(timer);
  }, [terminalLines.length]);

  const currentStep = flowSteps[activeFlow];
  const CurrentIcon = currentStep.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050611] text-white selection:bg-purple-500/30 selection:text-white">
      {/* =========================================================
          BACKGROUND SYSTEM
      ========================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        {/* Main top glow */}
        <div className="absolute left-1/2 top-[-280px] h-[650px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.28),rgba(37,99,235,0.16),rgba(15,23,42,0)_68%)] blur-3xl" />

        {/* Left purple edge */}
        <div className="absolute left-[-350px] top-[15%] h-[850px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.24),rgba(76,29,149,0.12),transparent_70%)] blur-3xl" />

        {/* Right blue edge */}
        <div className="absolute right-[-350px] top-[28%] h-[850px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.25),rgba(30,58,138,0.12),transparent_70%)] blur-3xl" />

        {/* Lower navy/purple glow */}
        <div className="absolute bottom-[-400px] left-1/2 h-[800px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.18),rgba(15,23,42,0.12),transparent_70%)] blur-3xl" />

        {/* Developer grid */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "linear-gradient(to bottom, black 0%, rgba(0,0,0,.8) 45%, transparent 100%)",
          }}
        />

        {/* Moving light beam */}
        <div className="absolute left-1/2 top-0 h-[1px] w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-purple-400/70 to-transparent animate-pulse" />
      </div>

      {/* =========================================================
          NAVIGATION
      ========================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050611]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-900/30">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
              <Workflow className="relative h-5 w-5 text-white" />
            </div>

            <div>
              <div className="text-[15px] font-bold tracking-tight">
                RST <span className="text-purple-400">BOS</span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500">
                Business Operating System
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a
              href="#platform"
              className="transition-colors hover:text-white"
            >
              Platform
            </a>

            <a
              href="#workflow"
              className="transition-colors hover:text-white"
            >
              How it works
            </a>

            <a
              href="#modules"
              className="transition-colors hover:text-white"
            >
              Modules
            </a>

            <a
              href="#developers"
              className="transition-colors hover:text-white"
            >
              Developers
            </a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              asChild
              className="rounded-lg text-slate-300 hover:bg-white/[0.05] hover:text-white"
            >
              <Link to="/dashboard">Dashboard</Link>
            </Button>

            <Button
              asChild
              className="rounded-lg border border-purple-400/30 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-blue-500"
            >
              <Link to="/login">
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/[0.07] bg-[#070812] px-4 py-5 md:hidden">
            <div className="flex flex-col gap-4 text-sm text-slate-300">
              <a href="#platform" onClick={() => setMobileMenuOpen(false)}>
                Platform
              </a>

              <a href="#workflow" onClick={() => setMobileMenuOpen(false)}>
                How it works
              </a>

              <a href="#modules" onClick={() => setMobileMenuOpen(false)}>
                Modules
              </a>

              <a href="#developers" onClick={() => setMobileMenuOpen(false)}>
                Developers
              </a>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" asChild className="rounded-lg">
                  <Link to="/login">Sign in</Link>
                </Button>

                <Button
                  asChild
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  <Link to="/login">Start free</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================
          HERO
      ========================================================== */}

      <main>
        <section className="relative px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
          <div className="mx-auto max-w-6xl text-center">
            <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/[0.07] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
              </span>
              Business Operating System
            </div>

            <h1 className="mx-auto max-w-5xl text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Run your entire business
              <br />
              <span className="bg-gradient-to-r from-white via-purple-200 to-blue-300 bg-clip-text text-transparent">
                from one operating system.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              From the first campaign and customer enquiry to sales,
              operations, SOP execution, invoicing, payment and retention —
              BOS connects the workflow behind your business.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-7 text-base font-semibold text-white shadow-xl shadow-purple-900/30 hover:from-purple-500 hover:to-blue-500 sm:w-auto"
              >
                <Link to="/login">
                  Start building your workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 w-full rounded-xl border-white/10 bg-white/[0.02] px-7 text-base text-slate-200 hover:bg-white/[0.06] sm:w-auto"
              >
                <a href="#workflow">
                  <Play className="mr-2 h-4 w-4" />
                  See the workflow
                </a>
              </Button>
            </div>

            {/* Trust/positioning line */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-slate-600">
              <span>CRM</span>
              <span>•</span>
              <span>Operations</span>
              <span>•</span>
              <span>SOPs</span>
              <span>•</span>
              <span>Finance</span>
              <span>•</span>
              <span>Customer Success</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            SYSTEM PREVIEW
        ========================================================== */}

        <section id="workflow" className="relative px-4 pb-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080914]/90 shadow-2xl shadow-purple-950/20">
              {/* Browser bar */}
              <div className="flex h-11 items-center justify-between border-b border-white/[0.07] bg-white/[0.025] px-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                </div>

                <div className="hidden items-center gap-2 rounded-md border border-white/[0.06] bg-black/20 px-3 py-1 text-[10px] text-slate-600 sm:flex">
                  <ShieldCheck className="h-3 w-3" />
                  app.rstbos.com/workspace
                </div>

                <div className="text-[10px] text-slate-600">
                  RST BOS
                </div>
              </div>

              <div className="grid min-h-[480px] lg:grid-cols-[210px_1fr]">
                {/* Fake sidebar */}
                <aside className="hidden border-r border-white/[0.07] bg-black/10 p-4 lg:block">
                  <div className="mb-7 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
                      <Workflow className="h-4 w-4 text-purple-400" />
                    </div>
                    <span className="text-xs font-bold">BOS</span>
                  </div>

                  <div className="space-y-5 text-[11px]">
                    <div>
                      <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                        Workspace
                      </p>

                      <div className="rounded-lg bg-purple-500/10 px-2.5 py-2 text-purple-300">
                        Dashboard
                      </div>

                      <div className="mt-1 px-2.5 py-2 text-slate-500">
                        My Work
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                        Outreach & CRM
                      </p>

                      {[
                        "Prospects",
                        "Campaigns",
                        "Leads",
                        "Opportunities",
                        "Activities",
                        "Proposals",
                        "Deals",
                      ].map((item) => (
                        <div
                          key={item}
                          className="px-2.5 py-1.5 text-slate-500"
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                        Operations
                      </p>

                      {[
                        "Jobs / Projects",
                        "SOP Templates",
                        "Approvals",
                        "Scheduling",
                        "QC & Handover",
                      ].map((item) => (
                        <div
                          key={item}
                          className="px-2.5 py-1.5 text-slate-500"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>

                {/* Main simulation */}
                <div className="relative p-5 sm:p-7 lg:p-9">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.10),transparent_35%)]" />

                  <div className="relative">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-purple-400">
                          Live workspace simulation
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">
                          Customer lifecycle
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] text-emerald-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        System operational
                      </div>
                    </div>

                    {/* Lifecycle rail */}
                    <div className="mt-8 overflow-x-auto pb-3">
                      <div className="flex min-w-[760px] items-center">
                        {flowSteps.map((step, index) => {
                          const Icon = step.icon;
                          const active = activeFlow === index;
                          const complete = index < activeFlow;

                          return (
                            <div
                              key={step.label}
                              className="flex flex-1 items-center"
                            >
                              <button
                                onClick={() => setActiveFlow(index)}
                                className={`group flex min-w-[95px] flex-col items-center gap-2 transition-all ${
                                  active
                                    ? "text-white"
                                    : "text-slate-600 hover:text-slate-300"
                                }`}
                              >
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                                    active
                                      ? "border-purple-400/40 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-300 shadow-lg shadow-purple-900/20"
                                      : complete
                                      ? "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-400"
                                      : "border-white/[0.07] bg-white/[0.02]"
                                  }`}
                                >
                                  {complete ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Icon className="h-4 w-4" />
                                  )}
                                </div>

                                <span className="text-[10px] font-medium">
                                  {step.label}
                                </span>
                              </button>

                              {index < flowSteps.length - 1 && (
                                <div className="mx-1 h-px flex-1 bg-gradient-to-r from-white/[0.10] to-white/[0.04]" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active workflow panel */}
                    <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-purple-400/15 bg-purple-400/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-purple-300">
                              Phase {activeFlow + 1}
                            </div>

                            <h3 className="text-2xl font-bold tracking-tight">
                              {currentStep.title}
                            </h3>
                          </div>

                          <CurrentIcon className="h-6 w-6 text-purple-400" />
                        </div>

                        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
                          {currentStep.description}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2">
                          <span className="rounded-md border border-white/[0.07] bg-black/20 px-2.5 py-1.5 text-[10px] text-slate-400">
                            {currentStep.status}
                          </span>

                          <span className="rounded-md border border-white/[0.07] bg-black/20 px-2.5 py-1.5 text-[10px] text-slate-400">
                            {currentStep.metric}
                          </span>

                          <span className="rounded-md border border-emerald-400/10 bg-emerald-400/[0.04] px-2.5 py-1.5 text-[10px] text-emerald-300">
                            Real-time
                          </span>
                        </div>
                      </div>

                      {/* Activity terminal */}
                      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#04050b]">
                        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <Terminal className="h-3.5 w-3.5 text-purple-400" />
                            Activity stream
                          </div>

                          <span className="text-[9px] text-emerald-400">
                            LIVE
                          </span>
                        </div>

                        <div className="p-4 font-mono text-[10px] leading-6">
                          {terminalLines
                            .slice(
                              Math.max(0, terminalLine - 5),
                              terminalLine + 1
                            )
                            .map((line, index) => (
                              <div
                                key={`${line}-${index}`}
                                className={`transition-opacity ${
                                  index ===
                                  Math.min(
                                    5,
                                    terminalLine
                                  )
                                    ? "text-purple-300"
                                    : "text-slate-600"
                                }`}
                              >
                                <span className="mr-2 text-slate-700">
                                  $
                                </span>
                                {line}
                              </div>
                            ))}

                          <div className="mt-2 flex items-center gap-2 text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            workflow synchronized
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-6">
                      <div className="mb-2 flex justify-between text-[9px] uppercase tracking-widest text-slate-600">
                        <span>Customer lifecycle</span>
                        <span>
                          {Math.round(
                            ((activeFlow + 1) / flowSteps.length) * 100
                          )}
                          %
                        </span>
                      </div>

                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 transition-all duration-700"
                          style={{
                            width: `${
                              ((activeFlow + 1) / flowSteps.length) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            PLATFORM STATEMENT
        ========================================================== */}

        <section id="platform" className="border-y border-white/[0.06] bg-white/[0.015] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <div>
                <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-400">
                  <Code2 className="h-4 w-4" />
                  Built around execution
                </div>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Your business shouldn't live in
                  <span className="text-slate-500"> disconnected tools.</span>
                </h2>

                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                  BOS creates a connected operational layer between the
                  customer you acquire, the work your team performs, and the
                  money your business collects.
                </p>

                <div className="mt-7 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-400/20 bg-purple-400/[0.06]">
                    <Zap className="h-4 w-4 text-purple-400" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      One connected lifecycle
                    </p>
                    <p className="text-xs text-slate-500">
                      Capture → sell → execute → collect → retain
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#080914] p-5">
                <div className="mb-4 flex items-center justify-between border-b border-white/[0.07] pb-4">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <GitBranch className="h-4 w-4 text-purple-400" />
                    business-lifecycle
                  </div>

                  <span className="text-[9px] text-slate-600">
                    main
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {[
                    ["01", "campaign", "purple"],
                    ["02", "lead", "blue"],
                    ["03", "opportunity", "indigo"],
                    ["04", "proposal", "violet"],
                    ["05", "deal", "purple"],
                    ["06", "client", "blue"],
                    ["07", "workflow", "cyan"],
                    ["08", "invoice", "indigo"],
                    ["09", "payment", "emerald"],
                    ["10", "renewal", "purple"],
                  ].map(([number, name], index) => (
                    <div
                      key={name}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.035]"
                    >
                      <span className="w-5 text-slate-700">{number}</span>

                      <div className="flex items-center">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            index === 8
                              ? "bg-emerald-400"
                              : "bg-purple-400"
                          }`}
                        />

                        {index < 9 && (
                          <div className="absolute ml-[3px] mt-6 h-3 w-px bg-white/[0.08]" />
                        )}
                      </div>

                      <span className="text-slate-400 group-hover:text-white">
                        {name}
                      </span>

                      {index === 8 && (
                        <span className="ml-auto text-[9px] text-emerald-400">
                          collected
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            MODULES
        ========================================================== */}

        <section id="modules" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-400">
                Platform
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything connected to the work
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                BOS brings your commercial, operational and customer
                workflows into one environment.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Target,
                  title: "Outreach & CRM",
                  text: "Prospects, campaigns, sequences, leads, opportunities, activities, proposals, deals and referrals.",
                  items: [
                    "Campaigns",
                    "Lead qualification",
                    "Pipeline",
                    "Follow-ups",
                  ],
                },
                {
                  icon: Workflow,
                  title: "SOP & Operations",
                  text: "Turn your way of working into repeatable workflows with ownership, deadlines and approvals.",
                  items: [
                    "SOP templates",
                    "Jobs & projects",
                    "Assignments",
                    "SLA monitoring",
                  ],
                },
                {
                  icon: CircleDollarSign,
                  title: "Finance",
                  text: "Follow the commercial lifecycle into quotes, invoices, payments, expenses and accounting records.",
                  items: [
                    "Quotes",
                    "Invoices",
                    "Payments",
                    "Expenses",
                  ],
                },
                {
                  icon: Users,
                  title: "Customer Success",
                  text: "Keep the relationship alive after the sale with client access, support, renewals and feedback.",
                  items: [
                    "Client portal",
                    "Support",
                    "Renewals",
                    "Feedback",
                  ],
                },
                {
                  icon: BarChart3,
                  title: "Management",
                  text: "Give owners and managers visibility into performance, activity, revenue and operational execution.",
                  items: [
                    "Reports",
                    "Analytics",
                    "Performance",
                    "Audit trail",
                  ],
                },
                {
                  icon: Settings2,
                  title: "Administration",
                  text: "Configure the business, teams, permissions, integrations and operating environment.",
                  items: [
                    "Users & roles",
                    "Teams",
                    "Configuration",
                    "Integrations",
                  ],
                },
              ].map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-purple-400/20 hover:bg-white/[0.035]"
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-purple-600/10 blur-3xl transition-opacity group-hover:opacity-100" />

                    <div className="relative">
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/15 bg-purple-400/[0.06]">
                        <Icon className="h-5 w-5 text-purple-400" />
                      </div>

                      <h3 className="text-base font-semibold">
                        {feature.title}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {feature.text}
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        {feature.items.map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-2 text-[10px] text-slate-500"
                          >
                            <CheckCircle2 className="h-3 w-3 text-purple-400/70" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            SLA / SOP SECTION
        ========================================================== */}

        <section className="border-y border-white/[0.06] bg-white/[0.015] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">
                <Clock3 className="h-4 w-4" />
                Operational control
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Don't just track work.
                <br />
                <span className="text-purple-400">
                  Control how it gets done.
                </span>
              </h2>

              <p className="mt-5 text-sm leading-7 text-slate-400">
                Define the workflow. Assign responsibility. Set deadlines.
                Require approvals. Capture evidence. Run quality control.
                Know what is late before the customer knows.
              </p>

              <div className="mt-7 space-y-3">
                {[
                  "Standardize repeatable processes with SOPs",
                  "Assign every operational step to an owner",
                  "Monitor deadlines and SLA risk",
                  "Require approval before critical stages",
                  "Complete QC before client handover",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/10">
                      <Check className="h-3 w-3 text-purple-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-purple-600/10 blur-3xl" />

              <div className="relative rounded-2xl border border-white/[0.08] bg-[#080914] p-5 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-600">
                      SLA monitor
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      Website Development
                    </p>
                  </div>

                  <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-2 py-1 text-[9px] text-emerald-400">
                    On track
                  </span>
                </div>

                {[
                  ["Requirements", "Completed", "100%"],
                  ["Design", "Approved", "100%"],
                  ["Development", "In progress", "68%"],
                  ["Internal QA", "Waiting", "0%"],
                  ["Client Review", "Waiting", "0%"],
                ].map(([name, status, percentage], index) => (
                  <div
                    key={name}
                    className="border-t border-white/[0.06] py-4"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{name}</span>
                      <span
                        className={
                          status === "Completed" ||
                          status === "Approved"
                            ? "text-emerald-400"
                            : status === "In progress"
                            ? "text-purple-400"
                            : "text-slate-600"
                        }
                      >
                        {status}
                      </span>
                    </div>

                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                        style={{ width: percentage }}
                      />
                    </div>

                    {index === 2 && (
                      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-600">
                        <Clock3 className="h-3 w-3" />
                        SLA deadline monitored
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            DEVELOPER SECTION
        ========================================================== */}

        <section id="developers" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-purple-950/20 via-[#080914] to-blue-950/20 p-7 sm:p-10 lg:p-14">
              <div className="grid gap-12 lg:grid-cols-[1fr_.9fr] lg:items-center">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-blue-400/15 bg-blue-400/[0.05] px-2.5 py-1.5 text-[9px] uppercase tracking-widest text-blue-300">
                    <Code2 className="h-3.5 w-3.5" />
                    Built for modern teams
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Your processes become
                    <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                      {" "}
                      executable workflows.
                    </span>
                  </h2>

                  <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                    BOS is designed around the idea that a business process
                    should be more than a document. It should be something
                    your team can actually execute, monitor and improve.
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Workflow engine", Layers3],
                      ["Assignments", Users],
                      ["Approvals", FileCheck2],
                      ["Audit trail", ShieldCheck],
                    ].map(([label, Icon]) => (
                      <div
                        key={label as string}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
                      >
                        <Icon className="h-4 w-4 text-purple-400" />
                        <span className="text-xs text-slate-300">
                          {label as string}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#03040a] shadow-2xl">
                  <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
                    <Terminal className="h-4 w-4 text-purple-400" />
                    <span className="text-[10px] text-slate-500">
                      workflow.engine
                    </span>
                  </div>

                  <div className="p-5 font-mono text-[10px] leading-7">
                    <div className="text-slate-600">
                      // customer lifecycle
                    </div>

                    <div>
                      <span className="text-purple-400">workflow</span>
                      <span className="text-slate-400">.</span>
                      <span className="text-blue-300">
                        execute
                      </span>
                      <span className="text-slate-500">
                        {"("}
                      </span>
                    </div>

                    <div className="pl-5 text-slate-500">
                      lead
                      <span className="text-purple-400">
                        {" → "}
                      </span>
                      opportunity
                    </div>

                    <div className="pl-5 text-slate-500">
                      opportunity
                      <span className="text-purple-400">
                        {" → "}
                      </span>
                      deal
                    </div>

                    <div className="pl-5 text-slate-500">
                      deal
                      <span className="text-purple-400">
                        {" → "}
                      </span>
                      client
                    </div>

                    <div className="pl-5 text-slate-500">
                      client
                      <span className="text-purple-400">
                        {" → "}
                      </span>
                      work
                    </div>

                    <div className="pl-5 text-slate-500">
                      work
                      <span className="text-purple-400">
                        {" → "}
                      </span>
                      invoice
                    </div>

                    <div className="pl-5 text-slate-500">
                      invoice
                      <span className="text-purple-400">
                        {" → "}
                      </span>
                      payment
                    </div>

                    <div className="text-slate-500">
                      {");"}
                    </div>

                    <div className="mt-5 border-t border-white/[0.06] pt-4 text-emerald-400">
                      ✓ workflow synchronized
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================== */}

        <section className="relative overflow-hidden border-t border-white/[0.06] px-4 py-28 sm:px-6 lg:px-8">
          <div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18),rgba(37,99,235,0.08),transparent_65%)] blur-3xl" />

          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/[0.07]">
              <Rocket className="h-5 w-5 text-purple-400" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Stop managing the business
              <br />
              <span className="text-purple-400">from scattered tools.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
              Build your workspace, define how your business operates and
              connect the journey from customer acquisition to delivery and
              payment.
            </p>

            <div className="mt-8">
              <Button
                size="lg"
                asChild
                className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 text-base font-semibold shadow-xl shadow-purple-900/30 hover:from-purple-500 hover:to-blue-500"
              >
                <Link to="/login" className="flex items-center gap-1">
                  Create your workspace
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <p className="mt-4 text-[10px] uppercase tracking-widest text-slate-700">
              Built for businesses that want control
            </p>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
      ========================================================== */}

      <footer className="border-t border-white/[0.06] bg-[#04050b] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
              <Workflow className="h-4 w-4 text-white" />
            </div>

            <div>
              <div className="text-sm font-bold">
                RST <span className="text-purple-400">BOS</span>
              </div>
              <div className="text-[9px] uppercase tracking-widest text-slate-600">
                Business Operating System
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-[10px] uppercase tracking-widest text-slate-600">
            <a href="#platform" className="hover:text-slate-300">
              Platform
            </a>

            <a href="#workflow" className="hover:text-slate-300">
              Workflow
            </a>

            <a href="#modules" className="hover:text-slate-300">
              Modules
            </a>

            <a href="#developers" className="hover:text-slate-300">
              Developers
            </a>
          </div>

          <p className="text-[10px] text-slate-700">
            © {new Date().getFullYear()} RST BOS
          </p>
        </div>
      </footer>
    </div>
  );
}