import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function LeadEntryForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Verify and confirm client details captured at job creation.</p>
      <StageField type="select" label="Lead Source" required readOnly={readOnly}
        value={formData.lead_source || ""} onChange={(v) => update("lead_source", v)}
        options={[
          { label: "Walk-in", value: "walk_in" },
          { label: "Referral", value: "referral" },
          { label: "Phone Call", value: "phone" },
          { label: "Website", value: "website" },
          { label: "Social Media", value: "social" },
          { label: "Other", value: "other" },
        ]}
      />
      <StageField type="select" label="Urgency Level" required readOnly={readOnly}
        value={formData.urgency || ""} onChange={(v) => update("urgency", v)}
        options={[
          { label: "Low", value: "low" },
          { label: "Medium", value: "medium" },
          { label: "High", value: "high" },
          { label: "Urgent", value: "urgent" },
        ]}
      />
      <StageField type="textarea" label="Initial Requirements" readOnly={readOnly}
        value={formData.initial_requirements || ""} onChange={(v) => update("initial_requirements", v)}
        placeholder="Brief description of what the client needs..."
      />
    </div>
  );
}
