import type { ModuleKey } from "@/platform/modules/registry";

/**
 * The composed business workflows, declared.
 *
 * A module list answers "what screens does this tenant have?". It does not
 * answer the question an operator configuring a client actually has, which is
 * "will a completed job turn into a bill?" — and that is not derivable from the
 * module list, because the composition lives in `reactions.ts` as registrations.
 *
 * So the chains are declared here, once, and read by two places: the HQ builder
 * shows which flows a tenant's module selection actually lights up, and
 * `reactions.test.ts` asserts every step named here has a listener behind it. A
 * flow described in the console but not wired on the bus is a lie told to the
 * person choosing modules, and this is the file that makes that lie fail a test.
 *
 * Deliberately not the registry itself. The bus keys on strings and knows
 * nothing about business meaning; this knows the meaning and nothing about
 * delivery.
 */

export interface WorkflowStep {
  /** The module that owns this step. */
  module: ModuleKey;
  /** What happens here, in the operator's words. */
  label: string;
  /**
   * The bus event this step publishes, when it publishes one. The last step in a
   * chain reacts and publishes nothing, so this is optional.
   */
  event?: string;
}

export interface ComposedWorkflow {
  key: string;
  name: string;
  /** Who this is for, in one line an operator can read to a client. */
  purpose: string;
  steps: WorkflowStep[];
}

export const COMPOSED_WORKFLOWS: ComposedWorkflow[] = [
  {
    key: "service_day",
    name: "Service day",
    purpose: "A booked appointment becomes a bill, a client history and a confirmation.",
    steps: [
      { module: "booking", label: "Appointment booked and served", event: "appointment.completed" },
      { module: "billing", label: "Draft invoice raised for the visit" },
      { module: "crm", label: "Client spend profile updated" },
      { module: "core", label: "Owner notified the client was served" },
    ],
  },
  {
    key: "field_maintenance",
    name: "Field maintenance",
    purpose: "A ticket becomes a dispatched job, an asset record and a billable line.",
    steps: [
      { module: "helpdesk", label: "Ticket raised", event: "ticket.created" },
      { module: "helpdesk", label: "Job dispatched to a technician", event: "work_order.dispatched" },
      { module: "helpdesk", label: "Visit completed on site", event: "work_order.completed" },
      { module: "assets", label: "Asset condition ledger updated" },
      { module: "billing", label: "Draft invoice raised for the visit" },
    ],
  },
];

export interface WorkflowStatus {
  workflow: ComposedWorkflow;
  /** Every module the chain touches, deduplicated and in step order. */
  modules: ModuleKey[];
  /** Modules the tenant does not have. Empty means the chain runs end to end. */
  missing: ModuleKey[];
  /**
   * True when the chain's *first* step is entitled. A partially-entitled chain
   * still runs — reactions check their own module and skip — so this is the
   * honest answer to "does anything happen at all", as distinct from "does the
   * whole chain happen", which is `missing.length === 0`.
   */
  started: boolean;
}

/** Which workflows a module selection lights up, and where each one stops. */
export function workflowStatus(enabled: Iterable<ModuleKey>): WorkflowStatus[] {
  const have = new Set(enabled);

  return COMPOSED_WORKFLOWS.map((workflow) => {
    const modules = [...new Set(workflow.steps.map((s) => s.module))];
    return {
      workflow,
      modules,
      missing: modules.filter((m) => !have.has(m)),
      started: have.has(workflow.steps[0].module),
    };
  });
}
