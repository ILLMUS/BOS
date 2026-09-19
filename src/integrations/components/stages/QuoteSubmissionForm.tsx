import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function QuoteSubmissionForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Record how and when the quote was delivered to the client.</p>
      <StageField type="select" label="Submission Method" required readOnly={readOnly}
        value={formData.submission_method || ""} onChange={(v) => update("submission_method", v)}
        options={[
          { label: "Email", value: "email" },
          { label: "Hand Delivered", value: "hand_delivered" },
          { label: "WhatsApp", value: "whatsapp" },
          { label: "Post / Courier", value: "post" },
        ]}
      />
      <StageField type="date" label="Date Submitted" required readOnly={readOnly}
        value={formData.submission_date || ""} onChange={(v) => update("submission_date", v)}
      />
      <StageField type="text" label="Submitted To (Contact Name)" required readOnly={readOnly}
        value={formData.submitted_to || ""} onChange={(v) => update("submitted_to", v)}
        placeholder="Client contact who received the quote"
      />
      <StageField type="date" label="Follow-up Date" readOnly={readOnly}
        value={formData.followup_date || ""} onChange={(v) => update("followup_date", v)}
      />
      <StageField type="textarea" label="Submission Notes" readOnly={readOnly}
        value={formData.submission_notes || ""} onChange={(v) => update("submission_notes", v)}
        placeholder="Any feedback or queries from the client at submission..."
      />
    </div>
  );
}
