import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function FlightExecutionForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Record the overall execution summary. Detailed entries are captured in the log panels below.
      </p>
      <StageField type="text" label="Execution Date" required readOnly={readOnly}
        value={formData.flight_date || ""} onChange={(v) => update("flight_date", v)} placeholder="YYYY-MM-DD" />
      <StageField type="text" label="Total Duration (minutes)" readOnly={readOnly}
        value={formData.total_duration || ""} onChange={(v) => update("total_duration", v)} />
      <StageField type="text" label="Area Covered (ha)" readOnly={readOnly}
        value={formData.area_covered || ""} onChange={(v) => update("area_covered", v)} />
      <StageField type="textarea" label="Execution Notes" readOnly={readOnly}
        value={formData.flight_notes || ""} onChange={(v) => update("flight_notes", v)} rows={3} />
    </div>
  );
}