import StageField from "./StageField";
import FileUploadField from "./FileUploadField";
import type { StageFormProps } from "./types";

export default function SiteAssessmentForm({ formData, onChange, readOnly, jobId }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Record site measurements, conditions, and photos. All measurement fields are required.</p>
      <StageField type="text" label="Site Dimensions (L x W x H)" required readOnly={readOnly}
        value={formData.dimensions || ""} onChange={(v) => update("dimensions", v)}
        placeholder="e.g., 5m x 3m x 2.4m"
      />
      <StageField type="select" label="Surface / Ground Condition" required readOnly={readOnly}
        value={formData.ground_condition || ""} onChange={(v) => update("ground_condition", v)}
        options={[
          { label: "Concrete", value: "concrete" },
          { label: "Paved", value: "paved" },
          { label: "Soil / Earth", value: "soil" },
          { label: "Mixed", value: "mixed" },
          { label: "Other", value: "other" },
        ]}
      />
      <StageField type="textarea" label="Existing Structures / Obstacles" readOnly={readOnly}
        value={formData.obstacles || ""} onChange={(v) => update("obstacles", v)}
        placeholder="Note any walls, pipes, trees, or structures that affect the job..."
      />
      <FileUploadField label="Site Photos *" readOnly={readOnly} jobId={jobId} folder="site-assessment"
        value={formData.photos || []} onChange={(v) => update("photos", v)}
        accept="image/*"
      />
      <StageField type="textarea" label="Assessment Notes" required readOnly={readOnly}
        value={formData.assessment_notes || ""} onChange={(v) => update("assessment_notes", v)}
        placeholder="Detailed observations from the site visit..."
        rows={4}
      />
      <StageField type="checkbox" label="Access confirmed for installation" readOnly={readOnly}
        checked={!!formData.access_confirmed} onChange={(v) => update("access_confirmed", v)}
        description="Vehicle / equipment access to site is confirmed"
      />
    </div>
  );
}
