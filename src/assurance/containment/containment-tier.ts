/**
 * E7-CONTAIN, trusted-local T0 boundary. Ascout isolates nothing today: code it runs, whether a
 * `check` task or a brokered engine, can read, write, and connect to anything the user can. What
 * exists is lifetime control (process-tree teardown), output and time caps, a sanitized
 * environment for brokered engines, and, by opt-in, an allowlisted environment for `check` tasks
 * (`--clean-env`, task-environment.ts). T1 needs native proof per OS and founder decision FD-4,
 * neither of which exists, so this module has no T1 value to report.
 */
export const CONTAINMENT_SCHEMA_VERSION = 1 as const;

export interface ContainmentReportV1 {
  readonly schema_version: typeof CONTAINMENT_SCHEMA_VERSION;
  readonly tier: "T0";
  readonly label: "TRUSTED_LOCAL";
  readonly filesystem_isolation: "NONE";
  readonly network_isolation: "NONE";
  readonly lifetime_control: "PROCESS_TREE_TEARDOWN";
  readonly untrusted_code_supported: false;
  readonly reason_text: string;
}

const CURRENT: ContainmentReportV1 = Object.freeze({
  schema_version: CONTAINMENT_SCHEMA_VERSION,
  tier: "T0",
  label: "TRUSTED_LOCAL",
  filesystem_isolation: "NONE",
  network_isolation: "NONE",
  lifetime_control: "PROCESS_TREE_TEARDOWN",
  untrusted_code_supported: false,
  reason_text:
    "Trusted-local only: commands run with your full rights, with no filesystem or network isolation. Run Ascout only on code you trust.",
});

/** The containment Ascout actually provides on every host today. */
export function currentContainmentV1(): ContainmentReportV1 {
  return CURRENT;
}
