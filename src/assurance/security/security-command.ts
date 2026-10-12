/**
 * UA-P06-T14 — `ascout security`.
 *
 * Local, read-only, zero-cost. UA-P06 executes no Sentrdel binary, so the
 * command has no engine to run: it reports NOT_RUN with the reason, the pinned
 * engine identity, and the characterized capability scope, and the caller
 * exits 1 (founder decision A, effective UA-P06-T14 CLI surface amendment).
 * It reads no repository files, starts no process, opens no network
 * connection, and writes nothing except its report to stdout/stderr.
 */
import { buildSentrdelCapabilitiesV1 } from "./sentrdel-capability-characterization.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "./sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SECURITY_COMMAND_NOT_RUN_EXIT_CODE = 1 as const;
export const SECURITY_NOT_RUN_REASON = "ENGINE_NOT_EXECUTED_IN_UA_P06" as const;

export interface SecurityCommandReportV1 {
  readonly schema_version: 1;
  readonly kind: "security";
  readonly outcome: "NOT_RUN";
  readonly reason_code: typeof SECURITY_NOT_RUN_REASON;
  readonly reason_text: string;
  readonly engine: Readonly<{ id: string; version: string; pin: string; tree: string; executed: false }>;
  readonly capabilities: readonly Readonly<{ id: string; status: string; run: false }>[];
  readonly scanned_scope: readonly string[];
  readonly security_pass: false;
  readonly clean_claimed: false;
  readonly findings_emitted: false;
  readonly assurance_effect: "NONE";
  readonly network: "NONE";
  readonly writes: "NONE";
  readonly exit_code: typeof SECURITY_COMMAND_NOT_RUN_EXIT_CODE;
}

export function buildSecurityCommandReportV1(): SecurityCommandReportV1 {
  const capabilities = buildSentrdelCapabilitiesV1()
    .map(capability => Object.freeze({ id: capability.id, status: capability.status, run: false as const }));
  return Object.freeze({
    schema_version: 1,
    kind: "security",
    outcome: "NOT_RUN",
    reason_code: SECURITY_NOT_RUN_REASON,
    reason_text: "No security engine is executed in UA-P06; nothing was scanned, so no security result exists.",
    engine: Object.freeze({
      id: SENTRDEL_ENGINE_ID, version: SENTRDEL_ENGINE_VERSION,
      pin: SENTRDEL_PINNED_REVISION, tree: SENTRDEL_PINNED_TREE, executed: false,
    }),
    capabilities: Object.freeze(capabilities),
    scanned_scope: Object.freeze([]),
    security_pass: false,
    clean_claimed: false,
    findings_emitted: false,
    assurance_effect: "NONE",
    network: "NONE",
    writes: "NONE",
    exit_code: SECURITY_COMMAND_NOT_RUN_EXIT_CODE,
  });
}

export function renderSecurityJsonV1(report: SecurityCommandReportV1): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderSecurityTerminalV1(report: SecurityCommandReportV1): string {
  return [
    "=== Ascout Security (NOT_RUN) ===",
    `outcome: ${report.outcome} (${report.reason_code})`,
    report.reason_text,
    `engine: ${report.engine.id} ${report.engine.version} @ ${report.engine.pin.slice(0, 12)} (not executed)`,
    `capabilities characterized: ${report.capabilities.length}; run: 0`,
    "This is not a security pass and not a clean result.",
  ].join("\n");
}
