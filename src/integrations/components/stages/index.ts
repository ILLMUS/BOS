import type { StageFormProps, JobStageEnum } from "./types";
import LeadEntryForm from "./LeadEntryForm";
import LeadQualificationForm from "./LeadQualificationForm";
import SiteVisitAuthForm from "./SiteVisitAuthForm";
import SiteAssessmentForm from "./SiteAssessmentForm";
import JobScopingForm from "./JobScopingForm";
import CostingForm from "./CostingForm";
import QuotationPrepForm from "./QuotationPrepForm";
import QuoteSubmissionForm from "./QuoteSubmissionForm";
import ClientApprovalForm from "./ClientApprovalForm";
import FabricationOrderForm from "./FabricationOrderForm";
import FabInstallForm from "./FabInstallForm";
import ProjectClosureForm from "./ProjectClosureForm";
import PreFlightCheckForm from "./PreFlightCheckForm";
import FlightExecutionForm from "./FlightExecutionForm";
import PostFlightLogForm from "./PostFlightLogForm";
import InvoicingForm from "./InvoicingForm";

const STAGE_FORM_MAP: Record<JobStageEnum, React.ComponentType<StageFormProps>> = {
  lead_entry: LeadEntryForm,
  lead_qualification: LeadQualificationForm,
  site_visit_authorization: SiteVisitAuthForm,
  site_assessment: SiteAssessmentForm,
  job_scoping: JobScopingForm,
  costing: CostingForm,
  quotation_preparation: QuotationPrepForm,
  quote_submission: QuoteSubmissionForm,
  client_approval: ClientApprovalForm,
  fabrication_order: FabricationOrderForm,
  fabrication_installation: FabInstallForm,
  project_closure: ProjectClosureForm,
  pre_flight_check: PreFlightCheckForm,
  flight_execution: FlightExecutionForm,
  post_flight_log: PostFlightLogForm,
  invoicing: InvoicingForm,
};

export function getStageForm(stage: JobStageEnum): React.ComponentType<StageFormProps> {
  return STAGE_FORM_MAP[stage];
}

export { type StageFormProps, type JobStageEnum };
