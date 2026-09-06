/**
 * RST Business OS — Universal Operations Engine
 *
 * Every piece of work in the platform, regardless of industry, runs through the
 * same chain. Manufacturing, field services, client onboarding, website builds,
 * property maintenance, repairs and campaigns are all just templates on top of it.
 */
export const ENGINE_CHAIN = [
  { key: "work", label: "Work", hint: "A job / project / request that must be delivered" },
  { key: "sop", label: "SOP", hint: "The documented way this business does that work" },
  { key: "workflow", label: "Workflow", hint: "A versioned template of the SOP" },
  { key: "stage", label: "Stage", hint: "An ordered step in the workflow" },
  { key: "responsibility", label: "Responsibility", hint: "The role that owns the stage" },
  { key: "form", label: "Form", hint: "The questions captured at that stage" },
  { key: "sla", label: "SLA", hint: "The deadline the stage must be finished in" },
  { key: "approval", label: "Approval", hint: "The gate that verifies the work" },
  { key: "completion", label: "Completion", hint: "The stage is closed and logged" },
  { key: "next", label: "Next Stage", hint: "The engine unlocks whatever comes next" },
] as const;

export type EngineStep = (typeof ENGINE_CHAIN)[number]["key"];

/** Universal vocabulary — keeps UI copy industry-neutral. */
export const ENGINE_TERMS = {
  work: "Work item",
  workPlural: "Work items",
  workflow: "Workflow",
  stage: "Stage",
  responsibility: "Responsibility",
  approval: "Approval",
} as const;
