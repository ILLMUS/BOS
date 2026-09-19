import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function LeadQualificationForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Assess whether this lead is viable and worth pursuing.</p>
      <StageField type="checkbox" label="Client budget discussed" readOnly={readOnly}
        checked={!!formData.budget_discussed} onChange={(v) => update("budget_discussed", v)}
        description="Has the client indicated a budget range?"
      />
      <StageField type="currency" label="Estimated Budget" readOnly={readOnly}
        value={formData.estimated_budget || ""} onChange={(v) => update("estimated_budget", v)}
        placeholder="0.00"
      />
      <StageField type="checkbox" label="Service is within our scope" required readOnly={readOnly}
        checked={!!formData.in_scope} onChange={(v) => update("in_scope", v)}
        description="Can we deliver what the client is asking for?"
      />
      <StageField type="checkbox" label="Location is serviceable" required readOnly={readOnly}
        checked={!!formData.location_serviceable} onChange={(v) => update("location_serviceable", v)}
        description="Is the client's location within our service area?"
      />
      <StageField type="select" label="Qualification Decision" required readOnly={readOnly}
        value={formData.decision || ""} onChange={(v) => update("decision", v)}
        options={[
          { label: "Qualified — Proceed", value: "qualified" },
          { label: "Not Qualified — Decline", value: "not_qualified" },
          { label: "Needs More Info", value: "pending" },
        ]}
      />
      <StageField type="textarea" label="Qualification Notes" readOnly={readOnly}
        value={formData.qualification_notes || ""} onChange={(v) => update("qualification_notes", v)}
        placeholder="Reasoning for qualification decision..."
      />
    </div>
  );
}
