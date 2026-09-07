import StageField from "./StageField";
import type { StageFormProps } from "./types";

export default function FabricationOrderForm({ formData, onChange, readOnly }: StageFormProps) {
  const update = (key: string, val: any) => onChange({ ...formData, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Issue the production order to the workshop.</p>
      <StageField type="text" label="Workshop Order Number" required readOnly={readOnly}
        value={formData.order_number || ""} onChange={(v) => update("order_number", v)}
        placeholder="e.g., WO-2026-042"
      />
      <StageField type="date" label="Order Date" required readOnly={readOnly}
        value={formData.order_date || ""} onChange={(v) => update("order_date", v)}
      />
      <StageField type="date" label="Required Completion Date" required readOnly={readOnly}
        value={formData.required_by || ""} onChange={(v) => update("required_by", v)}
      />
      <StageField type="select" label="Workshop Assignment" readOnly={readOnly}
        value={formData.workshop || ""} onChange={(v) => update("workshop", v)}
        options={[
          { label: "Main Workshop", value: "main" },
          { label: "Secondary Workshop", value: "secondary" },
          { label: "Subcontractor", value: "subcontractor" },
        ]}
      />
      <StageField type="textarea" label="Production Specifications" required readOnly={readOnly}
        value={formData.fab_specs || ""} onChange={(v) => update("fab_specs", v)}
        placeholder="Detailed production instructions, drawings reference, material specs..."
        rows={5}
      />
      <StageField type="textarea" label="Special Notes for Workshop" readOnly={readOnly}
        value={formData.workshop_notes || ""} onChange={(v) => update("workshop_notes", v)}
        placeholder="Finish requirements, colour, powder coating details..."
      />
    </div>
  );
}
