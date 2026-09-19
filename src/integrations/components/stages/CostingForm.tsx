import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function CostingForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Break down all costs: materials, labour, transport, and overheads.</p>
      <StageField type="currency" label="Material Cost" required readOnly={readOnly}
        value={formData.material_cost || ""} onChange={(v) => update("material_cost", v)} placeholder="0.00"
      />
      <StageField type="currency" label="Labour Cost" required readOnly={readOnly}
        value={formData.labour_cost || ""} onChange={(v) => update("labour_cost", v)} placeholder="0.00"
      />
      <StageField type="currency" label="Transport Cost" readOnly={readOnly}
        value={formData.transport_cost || ""} onChange={(v) => update("transport_cost", v)} placeholder="0.00"
      />
      <StageField type="currency" label="Equipment Hire" readOnly={readOnly}
        value={formData.equipment_cost || ""} onChange={(v) => update("equipment_cost", v)} placeholder="0.00"
      />
      <StageField type="currency" label="Overhead / Markup" readOnly={readOnly}
        value={formData.overhead_cost || ""} onChange={(v) => update("overhead_cost", v)} placeholder="0.00"
      />
      <div className="rounded border border-accent/30 bg-accent/5 p-3">
        <p className="text-sm font-medium text-muted-foreground">Total Estimated Cost</p>
        <p className="font-heading text-xl font-bold text-accent">
          E {(
            parseFloat(formData.material_cost || "0") +
            parseFloat(formData.labour_cost || "0") +
            parseFloat(formData.transport_cost || "0") +
            parseFloat(formData.equipment_cost || "0") +
            parseFloat(formData.overhead_cost || "0")
          ).toFixed(2)}
        </p>
      </div>
      <StageField type="textarea" label="Costing Notes" readOnly={readOnly}
        value={formData.costing_notes || ""} onChange={(v) => update("costing_notes", v)}
        placeholder="Assumptions, exclusions, contingencies..."
      />
    </div>
  );
}
