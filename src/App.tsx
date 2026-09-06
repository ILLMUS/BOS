import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PageSkeleton from "@/components/ui/page-skeleton";

// Eager: entry points the user hits before anything else.
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

// Lazy: heavy or rarely-first screens, kept out of the initial bundle so the
// app opens fast on field phones.
const Jobs = lazy(() => import("@/pages/Jobs"));
const NewJob = lazy(() => import("@/pages/NewJob"));
const JobDetail = lazy(() => import("@/pages/JobDetail"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminAssignments = lazy(() => import("@/pages/AdminAssignments"));
const AdminSopBuilder = lazy(() => import("@/pages/AdminSopBuilder"));
const AdminRoles = lazy(() => import("@/pages/AdminRoles"));
const Configuration = lazy(() => import("@/pages/admin/Configuration"));
const Integrations = lazy(() => import("@/pages/admin/Integrations"));
const Settings = lazy(() => import("@/pages/Settings"));
const Reports = lazy(() => import("@/pages/Reports"));
const TrackJob = lazy(() => import("@/pages/TrackJob"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Outreach = lazy(() => import("@/pages/modules/Outreach"));
const CaptureForms = lazy(() => import("@/pages/outreach/CaptureForms"));
const OutreachInbox = lazy(() => import("@/pages/outreach/Inbox"));
const Campaigns = lazy(() => import("@/pages/outreach/Campaigns"));
const CampaignDetail = lazy(() => import("@/pages/outreach/CampaignDetail"));
const OutreachTimeline = lazy(() => import("@/pages/outreach/Timeline"));
const SalesWinLoss = lazy(() => import("@/pages/sales/WinLoss"));
const SalesForecast = lazy(() => import("@/pages/sales/Forecast"));
const SalesProposals = lazy(() => import("@/pages/sales/Proposals"));
const PublicForm = lazy(() => import("@/pages/PublicForm"));
const Sales = lazy(() => import("@/pages/modules/Sales"));
const Operations = lazy(() => import("@/pages/modules/Operations"));
const OperationsSchedule = lazy(() => import("@/pages/operations/Schedule"));
const OperationsAllocation = lazy(() => import("@/pages/operations/Allocation"));
const OperationsQC = lazy(() => import("@/pages/operations/QualityControl"));
const Clients = lazy(() => import("@/pages/modules/Clients"));
const PortalAccess = lazy(() => import("@/pages/clients/PortalAccess"));
const SupportTickets = lazy(() => import("@/pages/clients/SupportTickets"));
const ClientFeedbackPage = lazy(() => import("@/pages/clients/Feedback"));
const ClientReminders = lazy(() => import("@/pages/clients/Reminders"));
const Finance = lazy(() => import("@/pages/modules/Finance"));
const Accounts = lazy(() => import("@/pages/crm/Accounts"));
const AccountDetail = lazy(() => import("@/pages/crm/AccountDetail"));
const CrmContacts = lazy(() => import("@/pages/crm/Contacts"));
const CrmLeads = lazy(() => import("@/pages/crm/Leads"));
const CrmOpportunities = lazy(() => import("@/pages/crm/Opportunities"));
const CrmDeals = lazy(() => import("@/pages/crm/Deals"));
const CrmActivities = lazy(() => import("@/pages/crm/Activities"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));


const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/track" element={<TrackJob />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />

            <Route path="/f/:slug" element={<PublicForm />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<Home />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/outreach" element={<Outreach />} />
              <Route path="/outreach/forms" element={<CaptureForms />} />
              <Route path="/outreach/inbox" element={<OutreachInbox />} />
              <Route path="/outreach/campaigns" element={<Campaigns />} />
              <Route path="/outreach/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/outreach/timeline" element={<OutreachTimeline />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales/win-loss" element={<SalesWinLoss />} />
              <Route path="/sales/forecast" element={<SalesForecast />} />
              <Route path="/sales/proposals" element={<SalesProposals />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/operations/schedule" element={<OperationsSchedule />} />
              <Route path="/operations/allocation" element={<OperationsAllocation />} />
              <Route path="/operations/qc" element={<OperationsQC />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/portal" element={<PortalAccess />} />
              <Route path="/clients/tickets" element={<SupportTickets />} />
              <Route path="/clients/feedback" element={<ClientFeedbackPage />} />
              <Route path="/clients/reminders" element={<ClientReminders />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/crm/accounts" element={<Accounts />} />
              <Route path="/crm/accounts/:id" element={<AccountDetail />} />
              <Route path="/crm/contacts" element={<CrmContacts />} />
              <Route path="/crm/leads" element={<CrmLeads />} />
              <Route path="/crm/opportunities" element={<CrmOpportunities />} />
              <Route path="/crm/deals" element={<CrmDeals />} />
              <Route path="/crm/activities" element={<CrmActivities />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/new" element={<NewJob />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/assignments" element={<AdminAssignments />} />
              <Route path="/admin/sop" element={<AdminSopBuilder />} />
              <Route path="/admin/roles" element={<AdminRoles />} />
              <Route path="/admin/configuration" element={<Configuration />} />
              <Route path="/admin/integrations" element={<Integrations />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
