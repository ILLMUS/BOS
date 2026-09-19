import StageField from "./StageField";
import FileUploadField from "./FileUploadField";
import type { StageFormProps } from "./types";

export default function ClientApprovalForm({ formData, onChange, readOnly, jobId }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Record the client's decision and any deposit payment.</p>
      <StageField type="select" label="Client Decision" required readOnly={readOnly}
        value={formData.client_decision || ""} onChange={(v) => update("client_decision", v)}
        options={[
          { label: "Approved — Proceed", value: "approved" },
          { label: "Approved with Changes", value: "approved_changes" },
          { label: "Declined", value: "declined" },
          { label: "Pending", value: "pending" },
        ]}
      />
      <StageField type="date" label="Approval Date" readOnly={readOnly}
        value={formData.approval_date || ""} onChange={(v) => update("approval_date", v)}
      />
      <StageField type="checkbox" label="Deposit Received" required readOnly={readOnly}
        checked={!!formData.deposit_received} onChange={(v) => update("deposit_received", v)}
        description="A deposit must be received before production can begin"
      />
      <StageField type="currency" label="Deposit Amount" readOnly={readOnly}
        value={formData.deposit_amount || ""} onChange={(v) => update("deposit_amount", v)} placeholder="0.00"
      />
      <StageField type="text" label="Payment Reference" readOnly={readOnly}
        value={formData.payment_ref || ""} onChange={(v) => update("payment_ref", v)}
        placeholder="EFT reference or receipt number"
      />
      <FileUploadField label="Signed Quote / PO" readOnly={readOnly} jobId={jobId} folder="client-approval"
        value={formData.signed_docs || []} onChange={(v) => update("signed_docs", v)}
        accept=".pdf,.jpg,.jpeg,.png"
      />
      <StageField type="textarea" label="Client Feedback / Changes Requested" readOnly={readOnly}
        value={formData.client_feedback || ""} onChange={(v) => update("client_feedback", v)}
        placeholder="Any modifications requested by the client..."
      />
    </div>
  );
}
