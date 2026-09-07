import StageField from "./StageField";
import FileUploadField from "./FileUploadField";
import type { StageFormProps } from "./types";

export default function ProjectClosureForm({ formData, onChange, readOnly, jobId }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Finalize the job: confirm payment, sign-off, and close.</p>
      <StageField type="checkbox" label="Final payment received" required readOnly={readOnly}
        checked={!!formData.final_payment_received} onChange={(v) => update("final_payment_received", v)}
        description="All outstanding payments have been received"
      />
      <StageField type="currency" label="Final Payment Amount" readOnly={readOnly}
        value={formData.final_payment_amount || ""} onChange={(v) => update("final_payment_amount", v)} placeholder="0.00"
      />
      <StageField type="text" label="Payment Reference" readOnly={readOnly}
        value={formData.final_payment_ref || ""} onChange={(v) => update("final_payment_ref", v)}
        placeholder="EFT reference or receipt number"
      />
      <StageField type="checkbox" label="Client sign-off obtained" required readOnly={readOnly}
        checked={!!formData.client_signoff} onChange={(v) => update("client_signoff", v)}
        description="Client has signed off on completed work"
      />
      <FileUploadField label="Sign-off Document / Final Photos" readOnly={readOnly} jobId={jobId} folder="project-closure"
        value={formData.closure_docs || []} onChange={(v) => update("closure_docs", v)}
        accept="image/*,.pdf"
      />
      <StageField type="select" label="Client Satisfaction" readOnly={readOnly}
        value={formData.satisfaction || ""} onChange={(v) => update("satisfaction", v)}
        options={[
          { label: "Very Satisfied", value: "very_satisfied" },
          { label: "Satisfied", value: "satisfied" },
          { label: "Neutral", value: "neutral" },
          { label: "Dissatisfied", value: "dissatisfied" },
        ]}
      />
      <StageField type="textarea" label="Closure Notes" readOnly={readOnly}
        value={formData.closure_notes || ""} onChange={(v) => update("closure_notes", v)}
        placeholder="Warranty details, lessons learned, follow-up required..."
        rows={4}
      />
    </div>
  );
}
