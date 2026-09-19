import type { Database } from "@/integrations/supabase/types";

export type JobStageEnum = Database["public"]["Enums"]["job_stage"];

export interface StageFormProps {
  formData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  readOnly: boolean;
  jobId: string;
  stageId: string;
  /** Optional callback for Quotation Prep to signal the user has confirmed the synced quote. */
  onQuoteConfirm?: (confirmed: boolean) => void;
  /** Controlled PDF preview dialog (owned by the stage action bar). */
  pdfOpen?: boolean;
  onPdfOpenChange?: (open: boolean) => void;
}


