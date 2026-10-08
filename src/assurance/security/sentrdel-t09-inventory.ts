/**
 * UA-P06-T09, grain C: fail-closed composition of untrusted static observations.
 *
 * This is not an engine runtime, security verdict, or evidence of scanner
 * execution. It prevents cross-source/run evidence mixing.
 */
import { createHash } from "node:crypto";
import {
  buildSentrdelGenericIacGapV1,
  normalizeSentrdelWorkflowObservationV1,
  type SentrdelWorkflowObservationV1,
} from "./sentrdel-workflow-normalization.js";
import {
  normalizeSentrdelConfigPresenceV1,
  type SentrdelConfigPresenceObservationV1,
} from "./sentrdel-config-presence.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "./sentrdel-source-pin.js";

export const SENTRDEL_T09_INVENTORY_AUTHORITY = "UA-P06-T09" as const;
export const SENTRDEL_T09_MAX_OBSERVATIONS = 64 as const;

export interface SentrdelT09InventoryInputV1 {
  readonly workflows: readonly unknown[];
  readonly configurations: readonly unknown[];
}

export interface SentrdelT09InventoryV1 {
  readonly schema_version: 1;
  readonly phase_authority: typeof SENTRDEL_T09_INVENTORY_AUTHORITY;
  readonly inventory_id: string;
  readonly request_id: string;
  readonly attempt_id: string;
  readonly source_head: string;
  readonly engine_pin: typeof SENTRDEL_PINNED_REVISION;
  readonly engine_tree: typeof SENTRDEL_PINNED_TREE;
  readonly workflow_observations: readonly SentrdelWorkflowObservationV1[];
  readonly config_presence_observations: readonly SentrdelConfigPresenceObservationV1[];
  readonly generic_iac: ReturnType<typeof buildSentrdelGenericIacGapV1>;
  readonly authority: "STATIC_OBSERVATION_INVENTORY_ONLY";
  readonly assurance_effect: "NONE";
  readonly executed_scanner_proven: false;
  readonly coverage_proven_complete: false;
  readonly repository_clean_claimed: false;
  readonly findings_emitted: false;
  readonly claim_assessment_emitted: false;
}

/**
 * Freeze a bounded own-data-property snapshot before any validation. Getter-
 * backed records can otherwise return safe values during validation and
 * different values when building the output. This is an in-process data guard,
 * not isolation from code executing in the same JavaScript process.
 */
function snapshotInputData(value: unknown, depth = 0): unknown {
  if (depth > 4) throw new TypeError("T09 data nesting limit exceeded");
  if (value === null || typeof value !== "object") return value;
  const isArray = Array.isArray(value);
  if (!isArray && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError("T09 input must be plain JSON data");
  }
  const properties = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(properties);
  if (keys.length > 64 + (isArray ? 1 : 0)) {
    throw new TypeError("T09 object property limit exceeded");
  }
  const copy: Record<string, unknown> | unknown[] = isArray ? [] : Object.create(null);
  for (const key of keys) {
    if (typeof key !== "string") throw new TypeError("T09 symbol keys are forbidden");
    if (isArray && key === "length") continue;
    const descriptor = properties[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable ||
        key === "__proto__") {
      throw new TypeError("T09 accessor or hidden input property is forbidden");
    }
    Object.defineProperty(copy, key, {
      value: snapshotInputData(descriptor.value, depth + 1),
      enumerable: true, writable: false, configurable: false,
    });
  }
  if (isArray && Object.keys(copy).length !== (value as unknown[]).length) {
    throw new TypeError("T09 sparse arrays are forbidden");
  }
  return Object.freeze(copy);
}

function strictInput(value: unknown): value is SentrdelT09InventoryInputV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return Object.keys(data).length === 2
    && Object.hasOwn(data, "workflows")
    && Object.hasOwn(data, "configurations")
    && Array.isArray(data["workflows"])
    && Array.isArray(data["configurations"]);
}

/**
 * Re-normalize RAW records at the boundary. Do not trust pre-built records,
 * user-supplied execution states, or purported clean scan result.
 */
export function buildSentrdelT09InventoryV1(value: unknown): SentrdelT09InventoryV1 {
  const stable = snapshotInputData(value);
  if (!strictInput(stable)) throw new TypeError("T09 inventory requires exact raw input arrays");
  const { workflows, configurations } = stable;
  if (workflows.length + configurations.length === 0) {
    throw new TypeError("T09 inventory needs at least one observation; absence is NOT_RUN");
  }
  if (workflows.length + configurations.length > SENTRDEL_T09_MAX_OBSERVATIONS) {
    throw new TypeError("T09 inventory observation limit exceeded");
  }

  const normalizedWorkflows = workflows.map(normalizeSentrdelWorkflowObservationV1);
  const normalizedConfig = configurations.map(normalizeSentrdelConfigPresenceV1);
  const all = [...normalizedWorkflows, ...normalizedConfig];
  const [first] = all;
  if (first === undefined) throw new TypeError("empty T09 inventory");
  const { source_head, request_id, attempt_id, engine_pin, engine_tree } = first;
  for (const record of all) {
    if (record.source_head !== source_head ||
        record.request_id !== request_id ||
        record.attempt_id !== attempt_id ||
        record.engine_pin !== engine_pin ||
        record.engine_tree !== engine_tree) {
      throw new TypeError("T09 inventory refuses cross-source, cross-attempt, or cross-pin observations");
    }
  }
  // UTF-16 code-unit ordering is deterministic across host locales/ICU versions.
  // Never use localeCompare for identity-bearing or receipt-bearing canonical order.
  const compareIdentity = (left: string, right: string): number =>
    left < right ? -1 : left > right ? 1 : 0;
  const sortedWorkflows = Object.freeze([...normalizedWorkflows].sort((a, b) =>
    compareIdentity(a.observation_id, b.observation_id)));
  const sortedConfig = Object.freeze([...normalizedConfig].sort((a, b) =>
    compareIdentity(a.identity, b.identity)));

  const allIds = [...sortedWorkflows.map(x => x.observation_id),
    ...sortedConfig.map(x => x.identity)];
  if (new Set(allIds).size !== allIds.length) {
    throw new TypeError("T09 inventory rejects repeated evidence records");
  }

  const fingerprint = createHash("sha256").update(JSON.stringify([
    SENTRDEL_T09_INVENTORY_AUTHORITY, request_id, attempt_id, source_head,
    engine_pin, engine_tree, ...allIds,
  ]), "utf8").digest("hex");

  return Object.freeze({
    schema_version: 1 as const,
    phase_authority: SENTRDEL_T09_INVENTORY_AUTHORITY,
    inventory_id: "t09-inventory:sentrdel:" + fingerprint,
    request_id,
    attempt_id,
    source_head,
    engine_pin,
    engine_tree,
    workflow_observations: sortedWorkflows,
    config_presence_observations: sortedConfig,
    generic_iac: buildSentrdelGenericIacGapV1(),
    authority: "STATIC_OBSERVATION_INVENTORY_ONLY" as const,
    assurance_effect: "NONE" as const,
    executed_scanner_proven: false as const,
    coverage_proven_complete: false as const,
    repository_clean_claimed: false as const,
    findings_emitted: false as const,
    claim_assessment_emitted: false as const,
  });
}
