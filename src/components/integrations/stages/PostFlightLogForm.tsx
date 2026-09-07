import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function PostFlightLogForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Confirm post-job closure tasks.</p>
      <StageField type="checkbox" label="Equipment cleaned & stored" required readOnly={readOnly}
        checked={!!formData.equipment_cleaned} onChange={(v) => update("equipment_cleaned", v)} />
      <StageField type="checkbox" label="Inspection completed (no damage)" required readOnly={readOnly}
        checked={!!formData.inspection_passed} onChange={(v) => update("inspection_passed", v)} />
      <StageField type="checkbox" label="Job data submitted" required readOnly={readOnly}
        checked={!!formData.data_submitted} onChange={(v) => update("data_submitted", v)} />
      <StageField type="textarea" label="Inspection Notes" readOnly={readOnly}
        value={formData.inspection_notes || ""} onChange={(v) => update("inspection_notes", v)} rows={3} />
    </div>
  );
}