import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function JobScopingForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Define the full scope of work based on site assessment findings.</p>
      <StageField type="textarea" label="Scope of Work" required readOnly={readOnly}
        value={formData.scope_description || ""} onChange={(v) => update("scope_description", v)}
        placeholder="Detailed description of all work to be performed..."
        rows={5}
      />
      <StageField type="textarea" label="Materials Required" required readOnly={readOnly}
        value={formData.materials_list || ""} onChange={(v) => update("materials_list", v)}
        placeholder="List of materials (steel type, dimensions, quantities)..."
        rows={4}
      />
      <StageField type="text" label="Estimated Duration" required readOnly={readOnly}
        value={formData.estimated_duration || ""} onChange={(v) => update("estimated_duration", v)}
        placeholder="e.g., 5 working days"
      />
      <StageField type="number" label="Team Size Required" readOnly={readOnly}
        value={formData.team_size || ""} onChange={(v) => update("team_size", v)}
        placeholder="Number of workers"
      />
      <StageField type="textarea" label="Special Requirements" readOnly={readOnly}
        value={formData.special_requirements || ""} onChange={(v) => update("special_requirements", v)}
        placeholder="Crane hire, welding certification, permits, etc."
      />
    </div>
  );
}
