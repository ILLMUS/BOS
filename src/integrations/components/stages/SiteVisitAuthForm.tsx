import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function SiteVisitAuthForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Authorize and schedule the site visit.</p>
      <StageField type="checkbox" label="Site visit authorized" required readOnly={readOnly}
        checked={!!formData.authorized} onChange={(v) => update("authorized", v)}
        description="Management has approved the site visit"
      />
      <StageField type="date" label="Scheduled Visit Date" required readOnly={readOnly}
        value={formData.visit_date || ""} onChange={(v) => update("visit_date", v)}
      />
      <StageField type="text" label="Assigned Assessor" readOnly={readOnly}
        value={formData.assigned_assessor || ""} onChange={(v) => update("assigned_assessor", v)}
        placeholder="Name of person conducting site visit"
      />
      <StageField type="textarea" label="Special Instructions" readOnly={readOnly}
        value={formData.special_instructions || ""} onChange={(v) => update("special_instructions", v)}
        placeholder="Any access requirements, safety gear needed, etc."
      />
    </div>
  );
}
