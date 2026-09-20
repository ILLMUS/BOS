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
  Play,
  Rocket,
  Send,
  Settings2,
  ShieldCheck,
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
        id: "campaign",
        label: "Campaign",
        title: "1. Acquire the customer",
        description:
          "Launch multi-channel campaigns, build targeted prospect lists, run automated outreach sequences, and track response rates from a unified control deck.",
        icon: Send,
        color: "teal",
        status: "Campaign Active",
        metric: "1 Active Campaign",
        subtext: "Automated sequence running • 412 prospects queued",
      },
      {
        id: "lead",
        label: "Lead",
        title: "2. Qualify the opportunity",
        description:
          "Automatically capture incoming enquiries, score buy-intent, route leads to account executives, and schedule timely follow-ups before leads go cold.",
        icon: Target,
        color: "emerald",
        status: "Lead Qualified",
        metric: "Score: 92/100",
        subtext: "Routing rule matched • Assigned to Sales Team",
      },
      {
        id: "opportunity",
        label: "Opportunity",
        title: "3. Move the deal forward",
        description:
          "Manage active opportunities, generate customized commercial proposals, track decision-maker interactions, and forecast sales pipeline revenue.",
        icon: BriefcaseBusiness,
        color: "teal",
        status: "Proposal Sent",
        metric: "Value: E8,500",
        subtext: "Commercial terms approved • Contract pending",
      },
      {
        id: "client",
        label: "Client",
        title: "4. Onboard the customer",
        description:
          "Seamlessly convert closed-won deals into verified client records, trigger automated kickoffs, provision user credentials, and transition to operations.",
        icon: UserCheck,
        color: "cyan",
        status: "Client Onboarded",
        metric: "Status: Active",
        subtext: "SLA agreement active • Account manager assigned",
      },
      {
        id: "work",
        label: "Work",
        title: "5. Execute the operation",
        description:
          "Execute standardized SOP workflows with real-time assignment routing, SLA tracking, required milestone approvals, and built-in quality control checks.",
        icon: Workflow,
        color: "sky",
        status: "Work in Progress",
        metric: "SLA: On Track",
        subtext: "Step 3 of 5 completed • Quality check pending",
      },
      {
        id: "finance",
        label: "Finance",
        title: "6. Invoice and collect",
        description:
          "Connect project milestones directly to invoicing, record incoming payments, log billable operational expenses, and maintain live audit trails.",
        icon: CircleDollarSign,
        color: "emerald",
        status: "Payment Cleared",
        metric: "Collected: E4,250",
        subtext: "Receipt issued • Ledger updated in real-time",
      },
    ],
    []
  );

  const terminalLines = useMemo(
    () => [
      "campaign.create(name='Mbabane Expansion')",
      "prospects.import(source='LinkedIn', count=412)",
      "outreach.sequence.start(id='seq_091')",
      "lead.qualify(intent_score=92)",
      "opportunity.create(value=8500, currency='SZL')",
      "proposal.generate_pdf(template='v2_enterprise')",
      "deal.status = 'closed_won'",
      "client.activate(account_id='acc_9920')",
      "workflow.start('Website Development SOP')",
      "sla.monitor(target='72h', status='green')",
      "invoice.issue(amount=4250, terms='Net 30')",
      "payment.record(amount=4250, ref='tx_910283')",
    ],
    []
  );

  // Auto-advance active lifecycle flow step
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFlow((prev) => (prev + 1) % flowSteps.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [flowSteps.length]);

  // Auto-advance live terminal output lines
  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalLine((prev) => (prev + 1) % terminalLines.length);
    }, 1800);

    return () => clearInterval(timer);
  }, [terminalLines.length]);

  const currentStep = flowSteps[activeFlow];
  const CurrentIcon = currentStep.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030d12] text-white selection:bg-teal-500/30 selection:text-white">
      {/* =========================================================
          BACKGROUND SYSTEM
      ========================================================== */}
      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        {/* Top central gradient glow */}
        <div className="absolute left-1/2 top-[-280px] h-[650px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.28),rgba(16,185,129,0.16),rgba(6,24,38,0)_68%)] blur-3xl" />

        {/* Left teal ambient accent */}
        <div className="absolute left-[-350px] top-[15%] h-[850px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.24),rgba(15,118,110,0.12),transparent_70%)] blur-3xl" />

        {/* Right emerald ambient accent */}
        <div className="absolute right-[-350px] top-[28%] h-[850px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.25),rgba(4,120,87,0.12),transparent_70%)] blur-3xl" />

        {/* Lower cyan/teal deep glow */}
        <div className="absolute bottom-[-400px] left-1/2 h-[800px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,116,144,0.18),rgba(6,24,38,0.12),transparent_70%)] blur-3xl" />

        {/* Grid pattern overlay */}
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

        {/* Animated horizon light pulse */}
        <div className="absolute left-1/2 top-0 h-[1px] w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-teal-400/70 to-transparent animate-pulse" />
      </div>

      {/* =========================================================
          NAVIGATION BAR
      ========================================================== */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030d12]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-teal-400/30 bg-gradient-to-br from-teal-600 to-emerald-600 shadow-lg shadow-teal-950/40">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
              <Workflow className="relative h-5 w-5 text-white" />
            </div>

            <div>
              <div className="text-[15px] font-bold tracking-tight">
                RST <span className="text-teal-400">BOS</span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500">
                Business Operating System
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#platform" className="transition-colors hover:text-white">
              Platform
            </a>
            <a href="#workflow" className="transition-colors hover:text-white">
              How it works
            </a>
            <a href="#modules" className="transition-colors hover:text-white">
              Modules
            </a>
            <a href="#developers" className="transition-colors hover:text-white">
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
              className="rounded-lg border border-teal-400/30 bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-950/40 hover:from-teal-500 hover:to-emerald-500"
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
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-white/[0.07] bg-[#05131a] px-4 py-5 md:hidden">
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
                  className="rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600"
                >
                  <Link to="/login">Start free</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================
          HERO SECTION
      ========================================================== */}
      <main>
        <section className="relative isolate overflow-hidden bg-[#020b0e]">
          {/* Desktop Hero Background Graphic */}
          <div className="pointer-events-none absolute inset-0 hidden md:block">
            <img
              src="/hero-bos.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020b0e]/65 via-[#020b0e]/25 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#020b0e]/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020b0e] to-transparent" />
            <div className="absolute left-[5%] top-[20%] h-72 w-72 rounded-full bg-teal-600/10 blur-[130px]" />
            <div className="absolute right-[20%] top-[15%] h-72 w-72 rounded-full bg-emerald-500/10 blur-[140px]" />
          </div>

          {/* Mobile Hero Graphic Panel */}
          <div className="relative mt-0 z-10 h-[330px] w-full overflow-hidden md:hidden">
            <img
              src="/hero-bos-mobile.png"
              alt="BOS business operating system"
              className="absolute inset-0 h-full w-full object-cover object-right"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020b0e] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#020b0e]/30 to-transparent" />
          </div>

          {/* Hero Main Copy */}
          <div className="relative z-30 mx-auto flex w-full max-w-[1500px] items-start px-6 pb-16 pt-4 md:min-h-[calc(100vh-72px)] md:px-8 md:pb-20 md:pt-12 lg:min-h-[820px] lg:px-12 lg:pt-12 xl:px-16">
            <div className="w-full max-w-[570px] lg:max-w-[580px]">
              {/* Eyebrow Badge */}
              <div className="mb-6 inline-flex animate-[fadeInUp_.7s_ease-out_both] items-center gap-2 rounded-full border border-teal-400/30 bg-teal-950/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200 shadow-lg shadow-teal-950/20 backdrop-blur-md sm:text-[11px]">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                </span>
                <span>Automate</span>
                <span className="text-teal-400">•</span>
                <span>Operate</span>
                <span className="text-teal-400">•</span>
                <span>Grow</span>
              </div>

              {/* Title */}
              <h1 className="max-w-[560px] animate-[fadeInUp_.8s_.1s_ease-out_both] text-[34px] font-extrabold leading-[1.02] tracking-[-0.045em] text-white drop-shadow-2xl sm:text-[40px] lg:text-[46px] xl:text-[50px]">
                Automate your
                <br />
                system and take a
                <br />
                <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                  vacation.
                </span>
              </h1>

              {/* Pitch */}
              <p className="mt-6 max-w-[525px] animate-[fadeInUp_.8s_.2s_ease-out_both] text-sm leading-6 text-white/85 drop-shadow-lg sm:text-base sm:leading-7">
                BOS connects your campaigns, customers, sales, operations,
                SOPs, finance and customer success — so your business keeps
                running, even when you&apos;re away.
              </p>

              {/* Value Highlights */}
              <div className="mt-7 flex max-w-[570px] flex-wrap items-center gap-y-4 animate-[fadeInUp_.8s_.3s_ease-out_both]">
                <div className="flex items-center gap-2.5 pr-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-950/60 text-teal-400 backdrop-blur-md">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Automated</p>
                    <p className="text-[10px] text-white/60">workflows</p>
                  </div>
                </div>

                <div className="hidden h-8 w-px bg-white/20 sm:block" />

                <div className="flex items-center gap-2.5 px-0 sm:px-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-950/60 text-teal-400 backdrop-blur-md">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Real-time</p>
                    <p className="text-[10px] text-white/60">visibility</p>
                  </div>
                </div>

                <div className="hidden h-8 w-px bg-white/20 sm:block" />

                <div className="flex items-center gap-2.5 px-0 sm:px-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-950/60 text-teal-400 backdrop-blur-md">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Less manual</p>
                    <p className="text-[10px] text-white/60">work</p>
                  </div>
                </div>

                <div className="hidden h-8 w-px bg-white/20 sm:block" />

                <div className="flex items-center gap-2.5 px-0 sm:pl-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-950/60 text-teal-400 backdrop-blur-md">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">More time</p>
                    <p className="text-[10px] text-white/60">for what matters</p>
                  </div>
                </div>
              </div>

              {/* Call to Actions */}
              <div className="mt-8 flex animate-[fadeInUp_.8s_.4s_ease-out_both] flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="group h-12 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 px-6 text-sm font-semibold text-white shadow-2xl shadow-teal-950/50 transition-all duration-300 hover:-translate-y-0.5 hover:from-teal-500 hover:via-emerald-500 hover:to-teal-400 sm:text-base"
                >
                  <Link to="/login">
                    Start building your workspace
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="group h-12 rounded-xl border-white/25 bg-black/30 px-6 text-sm text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-400/50 hover:bg-white/10 sm:text-base"
                >
                  <a href="#workflow">
                    <Play className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    See how it works
                  </a>
                </Button>
              </div>

              {/* Footer Breadcrumbs */}
              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 animate-[fadeInUp_.8s_.5s_ease-out_both] text-[9px] font-medium uppercase tracking-[0.18em] text-white/60 sm:text-[10px]">
                <span>CRM</span>
                <span className="text-teal-400">•</span>
                <span>Operations</span>
                <span className="text-teal-400">•</span>
                <span>SOPs</span>
                <span className="text-teal-400">•</span>
                <span>Finance</span>
                <span className="text-teal-400">•</span>
                <span>Customer Success</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            HOW IT WORKS & LIVE INTERACTIVE SIMULATION SECTION
        ========================================================== */}
        <section
          id="workflow"
          className="relative border-t border-white/[0.06] bg-gradient-to-b from-[#020b0e] via-[#05151c] to-[#030d12] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28"
        >
          {/* Subtle teal accent background glows */}
          <div className="pointer-events-none absolute left-1/2 top-10 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[120px]" />
          <div className="pointer-events-none absolute right-10 top-1/3 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />

          <div className="mx-auto max-w-6xl">
            {/* Section Header */}
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-300">
                <Workflow className="h-3.5 w-3.5 text-teal-400" />
                How It Works
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                One fluid operational engine,
                <br />
                <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                  from lead to revenue.
                </span>
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
                Click through the interactive lifecycle below to explore how
                RST BOS automates handover between sales, fulfillment, and accounting.
              </p>
            </div>

            {/* LIVE SIMULATION APPLICATION CONTAINER */}
            <div className="relative overflow-hidden rounded-xl border border-teal-500/20 bg-[#071318]/90 shadow-2xl shadow-teal-950/40 sm:rounded-2xl backdrop-blur-md">
              {/* App Titlebar Header */}
              <div className="flex h-10 items-center justify-between border-b border-white/[0.07] bg-white/[0.025] px-3 sm:h-11 sm:px-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>

                <div className="hidden items-center gap-2 rounded-md border border-teal-400/20 bg-black/40 px-3 py-1 text-[10px] text-slate-300 sm:flex font-mono">
                  <ShieldCheck className="h-3 w-3 text-teal-400" />
                  https://app.rstbos.com/live-workspace
                </div>

                <div className="flex items-center gap-2 text-[9px] font-medium text-teal-400 sm:text-[10px]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  RST BOS v2.4 Active
                </div>
              </div>

              {/* App Core Container */}
              <div className="grid min-h-[auto] lg:min-h-[520px] lg:grid-cols-[220px_1fr]">
                {/* Desktop Application Sidebar */}
                <aside className="hidden border-r border-white/[0.07] bg-black/20 p-4 lg:block">
                  <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-teal-400/20 bg-teal-500/10 p-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                      <Workflow className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">RST Workspace</span>
                      <p className="text-[9px] text-slate-400">Enterprise Edition</p>
                    </div>
                  </div>

                  <div className="space-y-5 text-[11px]">
                    <div>
                      <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-widest text-teal-400/70">
                        Overview
                      </p>
                      <div className="rounded-lg border border-teal-400/30 bg-teal-500/15 px-2.5 py-2 font-medium text-teal-200">
                        Live Simulation
                      </div>
                      <div className="mt-1 px-2.5 py-1.5 text-slate-400 hover:text-white cursor-pointer">
                        Executive Dashboard
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-widest text-teal-400/70">
                        Commercial
                      </p>
                      {["Prospects & Sequences", "Qualifying Leads", "Active Pipeline", "Client Accounts"].map(
                        (item, i) => (
                          <div
                            key={item}
                            className={`px-2.5 py-1.5 transition-colors ${
                              activeFlow === i
                                ? "font-semibold text-teal-300"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {item}
                          </div>
                        )
                      )}
                    </div>

                    <div>
                      <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-widest text-teal-400/70">
                        Fulfillment
                      </p>
                      {["SOP Engine", "Job Assignments", "SLA Monitoring", "Invoicing & Revenue"].map(
                        (item, i) => (
                          <div
                            key={item}
                            className={`px-2.5 py-1.5 transition-colors ${
                              activeFlow === i + 2
                                ? "font-semibold text-teal-300"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </aside>

                {/* Main Interactive Stage */}
                <div className="relative min-w-0 p-4 sm:p-6 lg:p-8">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.12),transparent_40%)]" />

                  <div className="relative">
                    {/* Active Interactive Stage Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div>
                        <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-teal-400 sm:text-[10px]">
                          Automated Customer Journey
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                          Lifecycle Phase {activeFlow + 1}: {currentStep.label}
                        </h3>
                      </div>

                      <div className="flex w-fit items-center gap-2 rounded-full border border-teal-400/30 bg-teal-950/60 px-3.5 py-1.5 text-[10px] text-teal-200">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-teal-400" />
                        Automated State Sync
                      </div>
                    </div>

                    {/* Interactive Horizontal Navigation Rail */}
                    <div className="mt-6 border-y border-white/[0.08] bg-black/20 py-3 backdrop-blur-md">
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:gap-3">
                        {flowSteps.map((step, index) => {
                          const Icon = step.icon;
                          const isActive = activeFlow === index;
                          const isPassed = index < activeFlow;

                          return (
                            <button
                              key={step.id}
                              onClick={() => setActiveFlow(index)}
                              className={`group relative flex flex-col items-center rounded-xl border p-2.5 text-center transition-all ${
                                isActive
                                  ? "border-teal-400 bg-gradient-to-b from-teal-500/25 to-emerald-500/10 text-white shadow-lg shadow-teal-950/50"
                                  : isPassed
                                  ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300 hover:bg-emerald-500/10"
                                  : "border-white/[0.07] bg-white/[0.02] text-slate-400 hover:border-teal-500/30 hover:text-slate-200"
                              }`}
                            >
                              <div
                                className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
                                  isActive
                                    ? "bg-teal-400 text-black font-bold"
                                    : isPassed
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-white/[0.05] text-slate-400"
                                }`}
                              >
                                {isPassed ? (
                                  <Check className="h-4 w-4 stroke-[3]" />
                                ) : (
                                  <Icon className="h-4 w-4" />
                                )}
                              </div>
                              <span className="text-[10px] font-semibold tracking-wide">
                                {step.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step Detail Card + Live Code Terminal */}
                    <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
                      {/* Active Phase Focus Box */}
                      <div className="flex flex-col justify-between rounded-xl border border-teal-500/20 bg-gradient-to-br from-white/[0.04] to-teal-950/20 p-5 sm:p-6">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="rounded-md border border-teal-400/30 bg-teal-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-teal-300">
                              Phase {activeFlow + 1} of 6
                            </span>
                            <CurrentIcon className="h-6 w-6 text-teal-400" />
                          </div>

                          <h4 className="mt-4 text-xl font-bold text-white sm:text-2xl">
                            {currentStep.title}
                          </h4>

                          <p className="mt-3 text-xs leading-6 text-slate-300 sm:text-sm">
                            {currentStep.description}
                          </p>
                        </div>

                        <div className="mt-6 border-t border-white/[0.08] pt-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                              Status: {currentStep.status}
                            </span>
                            <span className="text-[11px] font-mono text-teal-300">
                              {currentStep.metric}
                            </span>
                          </div>
                          <p className="mt-2 text-[10px] text-slate-400 italic">
                            {currentStep.subtext}
                          </p>
                        </div>
                      </div>

                      {/* Live System Execution Terminal */}
                      <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#02090d]">
                        <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/40 px-4 py-2.5">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <Terminal className="h-3.5 w-3.5 text-teal-400" />
                            execution-stream.log
                          </div>
                          <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[8px] font-mono text-teal-300">
                            LIVE SYNC
                          </span>
                        </div>

                        <div className="flex-1 p-4 font-mono text-[10px] leading-6">
                          {terminalLines
                            .slice(Math.max(0, terminalLine - 5), terminalLine + 1)
                            .map((line, idx) => (
                              <div
                                key={`${line}-${idx}`}
                                className={`transition-opacity ${
                                  idx === Math.min(5, terminalLine)
                                    ? "text-teal-300 font-bold"
                                    : "text-slate-500"
                                }`}
                              >
                                <span className="mr-2 text-teal-600">&gt;</span>
                                {line}
                              </div>
                            ))}

                          <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-2 text-[9px] text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                            Workflow state synchronized to database
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lifecycle Progress Indicator */}
                    <div className="mt-6">
                      <div className="mb-2 flex justify-between text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                        <span>Overall Lifecycle Automation</span>
                        <span className="text-teal-400">
                          {Math.round(((activeFlow + 1) / flowSteps.length) * 100)}% Completed
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400 transition-all duration-700 shadow-md shadow-teal-500/50"
                          style={{
                            width: `${((activeFlow + 1) / flowSteps.length) * 100}%`,
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
            PLATFORM ARCHITECTURE STATEMENT
        ========================================================== */}
        <section
          id="platform"
          className="border-y border-white/[0.06] bg-white/[0.015] px-4 py-24 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <div>
                <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-400">
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
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/[0.06]">
                    <Zap className="h-4 w-4 text-teal-400" />
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

              <div className="rounded-2xl border border-white/[0.08] bg-[#051219] p-5">
                <div className="mb-4 flex items-center justify-between border-b border-white/[0.07] pb-4">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <GitBranch className="h-4 w-4 text-teal-400" />
                    business-lifecycle
                  </div>

                  <span className="text-[9px] text-slate-600">main</span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {[
                    ["01", "campaign"],
                    ["02", "lead"],
                    ["03", "opportunity"],
                    ["04", "proposal"],
                    ["05", "deal"],
                    ["06", "client"],
                    ["07", "workflow"],
                    ["08", "invoice"],
                    ["09", "payment"],
                    ["10", "renewal"],
                  ].map(([number, name], index) => (
                    <div
                      key={name}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.035]"
                    >
                      <span className="w-5 text-slate-700">{number}</span>

                      <div className="flex items-center">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            index === 8 ? "bg-emerald-400" : "bg-teal-400"
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
            MODULES SHOWCASE
        ========================================================== */}
        <section id="modules" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-400">
                Platform Architecture
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
                  items: ["Quotes", "Invoices", "Payments", "Expenses"],
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
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-teal-400/20 hover:bg-white/[0.035]"
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-teal-600/10 blur-3xl transition-opacity group-hover:opacity-100" />

                    <div className="relative">
                      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-teal-400/15 bg-teal-400/[0.06]">
                        <Icon className="h-5 w-5 text-teal-400" />
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
                            <CheckCircle2 className="h-3 w-3 text-teal-400/70" />
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
            OPERATIONAL CONTROL / SLA SECTION
        ========================================================== */}
        <section className="border-y border-white/[0.06] bg-white/[0.015] px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                <Clock3 className="h-4 w-4" />
                Operational Control
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Don't just track work.
                <br />
                <span className="text-teal-400">Control how it gets done.</span>
              </h2>

              <p className="mt-5 text-sm leading-7 text-slate-400">
                Define the workflow. Assign responsibility. Set deadlines.
                Require approvals. Capture evidence. Run quality control. Know
                what is late before the customer knows.
              </p>

              <div className="mt-7 space-y-3">
                {[
                  "Standardize repeatable processes with SOPs",
                  "Assign every operational step to an owner",
                  "Monitor deadlines and SLA risk",
                  "Require approval before critical stages",
                  "Complete QC before client handover",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/10">
                      <Check className="h-3 w-3 text-teal-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-teal-600/10 blur-3xl" />

              <div className="relative rounded-2xl border border-white/[0.08] bg-[#051219] p-5 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-600">
                      SLA Monitor
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
                  <div key={name} className="border-t border-white/[0.06] py-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{name}</span>
                      <span
                        className={
                          status === "Completed" || status === "Approved"
                            ? "text-emerald-400"
                            : status === "In progress"
                            ? "text-teal-400"
                            : "text-slate-600"
                        }
                      >
                        {status}
                      </span>
                    </div>

                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
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
            <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-teal-950/20 via-[#051219] to-cyan-950/20 p-7 sm:p-10 lg:p-14">
              <div className="grid gap-12 lg:grid-cols-[1fr_.9fr] lg:items-center">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-cyan-400/15 bg-cyan-400/[0.05] px-2.5 py-1.5 text-[9px] uppercase tracking-widest text-cyan-300">
                    <Code2 className="h-3.5 w-3.5" />
                    Built for modern teams
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Your processes become
                    <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                      {" "}
                      executable workflows.
                    </span>
                  </h2>

                  <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                    BOS is designed around the idea that a business process
                    should be more than a document. It should be something your
                    team can actually execute, monitor and improve.
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
                        <Icon className="h-4 w-4 text-teal-400" />
                        <span className="text-xs text-slate-300">
                          {label as string}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#02090d] shadow-2xl">
                  <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
                    <Terminal className="h-4 w-4 text-teal-400" />
                    <span className="text-[10px] text-slate-500">
                      workflow.engine
                    </span>
                  </div>

                  <div className="p-5 font-mono text-[10px] leading-7">
                    <div className="text-slate-600">// customer lifecycle</div>

                    <div>
                      <span className="text-teal-400">workflow</span>
                      <span className="text-slate-400">.</span>
                      <span className="text-cyan-300">execute</span>
                      <span className="text-slate-500">{"("}</span>
                    </div>

                    <div className="pl-5 text-slate-500">
                      lead <span className="text-teal-400">{" → "}</span> opportunity
                    </div>
                    <div className="pl-5 text-slate-500">
                      opportunity <span className="text-teal-400">{" → "}</span> deal
                    </div>
                    <div className="pl-5 text-slate-500">
                      deal <span className="text-teal-400">{" → "}</span> client
                    </div>
                    <div className="pl-5 text-slate-500">
                      client <span className="text-teal-400">{" → "}</span> work
                    </div>
                    <div className="pl-5 text-slate-500">
                      work <span className="text-teal-400">{" → "}</span> invoice
                    </div>
                    <div className="pl-5 text-slate-500">
                      invoice <span className="text-teal-400">{" → "}</span> payment
                    </div>

                    <div className="text-slate-500">{");"}</div>

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
            FINAL CALL TO ACTION
        ========================================================== */}
        <section className="relative overflow-hidden border-t border-white/[0.06] px-4 py-28 sm:px-6 lg:px-8">
          <div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.18),rgba(16,185,129,0.08),transparent_65%)] blur-3xl" />

          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-400/20 bg-teal-400/[0.07]">
              <Rocket className="h-5 w-5 text-teal-400" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Stop managing the business
              <br />
              <span className="text-teal-400">from scattered tools.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
              Build your workspace, define how your business operates and connect
              the journey from customer acquisition to delivery and payment.
            </p>

            <div className="mt-8">
              <Button
                size="lg"
                asChild
                className="h-12 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-8 text-base font-semibold shadow-xl shadow-teal-950/30 hover:from-teal-500 hover:to-emerald-500"
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
      <footer className="border-t border-white/[0.06] bg-[#02090d] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-600">
              <Workflow className="h-4 w-4 text-white" />
            </div>

            <div>
              <div className="text-sm font-bold">
                RST <span className="text-teal-400">BOS</span>
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