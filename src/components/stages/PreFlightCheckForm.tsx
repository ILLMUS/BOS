import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function PreFlightCheckForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Complete the pre-flight checklist below. Detailed inspection records are captured in the Pre-Flight panel.
      </p>
      <StageField type="checkbox" label="Drone condition verified" required readOnly={readOnly}
        checked={!!formData.drone_ok} onChange={(v) => update("drone_ok", v)} />
      <StageField type="checkbox" label="Battery charged & spares ready" required readOnly={readOnly}
        checked={!!formData.battery_ok} onChange={(v) => update("battery_ok", v)} />
      <StageField type="checkbox" label="Spray system tested (spray jobs)" readOnly={readOnly}
        checked={!!formData.spray_system_ok} onChange={(v) => update("spray_system_ok", v)} />
      <StageField type="checkbox" label="Calibration complete" required readOnly={readOnly}
        checked={!!formData.calibration_ok} onChange={(v) => update("calibration_ok", v)} />
      <StageField type="checkbox" label="Weather conditions acceptable" required readOnly={readOnly}
        checked={!!formData.weather_ok} onChange={(v) => update("weather_ok", v)} />
      <StageField type="checkbox" label="Operations Manager approval" required readOnly={readOnly}
        checked={!!formData.manager_approved} onChange={(v) => update("manager_approved", v)} />
      <StageField type="textarea" label="Notes" readOnly={readOnly}
        value={formData.notes || ""} onChange={(v) => update("notes", v)} rows={3} />
    </div>
  );
}