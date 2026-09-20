import { isDeepStrictEqual } from "node:util";

import {
  parseEngineDescriptorV1,
  type EngineDescriptorV1,
} from "./engine-descriptor.js";
import {
  parseEngineQualificationV1,
  type EngineConfigurationIdentityV1,
  type EnginePlatformIdentityV1,
  type EngineQualificationV1,
} from "./engine-qualification.js";
import {
  parseAssurancePlanV1,
  type AssurancePlanV1,
} from "./plan.js";
import {
  parseAssuranceTargetV1,
  type AssuranceTargetV1,
} from "./target.js";

export const ENGINE_RUN_SCHEMA_VERSION = 1 as const;

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const STATE_ID = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const MAX_LIST_ITEMS = 256;
const MAX_TEXT_LENGTH = 512;

export interface EngineRunRuntimeIdentityV1 {
  readonly runtime_id: string;
  readonly runtime_sha256: string;
  readonly platform_identity: EnginePlatformIdentityV1;
}

export interface EngineRunCommandIdentityV1 {
  readonly command_id: string;
  readonly command_sha256: string;
}

export interface EngineRunRetainedStreamArtifactRefsV1 {
  readonly stdout_artifact_ref: string | null;
  readonly stderr_artifact_ref: string | null;
}

export interface EngineRunInputContextManifestV1 {
  readonly manifest_id: string;
  readonly input_refs: readonly string[];
  readonly context_refs: readonly string[];
}

export interface EngineRunRetryRecoveryLineageV1 {
  readonly attempt_number: number;
  readonly retry_of_run_id: string | null;
  readonly recovery_of_run_id: string | null;
}

export interface EngineRunV1 {
  readonly schema_version: 1;
  readonly run_id: string;
  readonly plan_id: string;
  readonly target_id: string;
  readonly engine_id: string;
  readonly qualification_id: string;
  readonly configuration_identity: EngineConfigurationIdentityV1;
  readonly command_identity: EngineRunCommandIdentityV1;
  readonly runtime_identity: EngineRunRuntimeIdentityV1;
  readonly started_at_epoch_ms: number;
  readonly ended_at_epoch_ms: number;
  readonly exit_class: string;
  readonly result_class: string;
  readonly input_context_manifest: EngineRunInputContextManifestV1;
  readonly output_artifact_refs: readonly string[];
  readonly retained_stream_artifact_refs: EngineRunRetainedStreamArtifactRefsV1;
  readonly finding_refs: readonly string[];
  readonly coverage_refs: readonly string[];
  readonly coverage_limitations: readonly string[];
  readonly omissions: readonly string[];
  readonly limitations: readonly string[];
  readonly retry_recovery_lineage: EngineRunRetryRecoveryLineageV1;
}

export type EngineRunInputV1 = Omit<EngineRunV1, "schema_version">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(field + " must be an object");
  return value;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  field: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    throw new TypeError(field + " contains missing or unknown fields");
  }
}

function requireOpaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) {
    throw new TypeError(field + " must be a bounded opaque identifier");
  }
  return value;
}

function requireNullableOpaqueId(value: unknown, field: string): string | null {
  return value === null ? null : requireOpaqueId(value, field);
}

function requireStateId(value: unknown, field: string): string {
  if (typeof value !== "string" || !STATE_ID.test(value)) {
    throw new TypeError(field + " must be an uppercase bounded state identifier");
  }
  return value;
}

function requireSha256(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new TypeError(field + " must be lowercase sha256");
  }
  return value;
}

function requireEpochMs(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(field + " must be a non-negative safe integer epoch ms");
  }
  return value as number;
}

function requireAttemptNumber(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new TypeError("retry_recovery_lineage.attempt_number must be a safe integer >= 1");
  }
  return value as number;
}

function requireBoundedText(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > MAX_TEXT_LENGTH ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new TypeError(field + " must be bounded non-empty single-line text");
  }
  return value;
}

function normalizeOpaqueIds(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    requireOpaqueId(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalOpaqueIds(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    requireOpaqueId(entry, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function normalizeTextList(
  values: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = values.map((value, index) =>
    requireBoundedText(value, field + "[" + index + "]"),
  );
  return [...new Set(parsed)].sort();
}

function parseCanonicalTextList(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    throw new TypeError(field + " must contain at most " + MAX_LIST_ITEMS + " items");
  }
  const parsed = value.map((entry, index) =>
    requireBoundedText(entry, field + "[" + index + "]"),
  );
  const canonical = [...new Set(parsed)].sort();
  if (!isDeepStrictEqual(parsed, canonical)) {
    throw new TypeError(field + " must be unique and canonically sorted");
  }
  return parsed;
}

function parseCommandIdentity(value: unknown): EngineRunCommandIdentityV1 {
  const record = requireRecord(value, "command_identity");
  requireExactKeys(
    record,
    ["command_id", "command_sha256"],
    "command_identity",
  );
  return {
    command_id: requireOpaqueId(record.command_id, "command_identity.command_id"),
    command_sha256: requireSha256(
      record.command_sha256,
      "command_identity.command_sha256",
    ),
  };
}

function parseConfigurationIdentity(
  value: unknown,
): EngineConfigurationIdentityV1 {
  const record = requireRecord(value, "configuration_identity");
  requireExactKeys(
    record,
    ["configuration_id", "configuration_sha256"],
    "configuration_identity",
  );
  return {
    configuration_id: requireOpaqueId(
      record.configuration_id,
      "configuration_identity.configuration_id",
    ),
    configuration_sha256: requireSha256(
      record.configuration_sha256,
      "configuration_identity.configuration_sha256",
    ),
  };
}

function parsePlatformIdentity(value: unknown): EnginePlatformIdentityV1 {
  const record = requireRecord(value, "runtime_identity.platform_identity");
  requireExactKeys(
    record,
    ["platform_id", "platform_sha256"],
    "runtime_identity.platform_identity",
  );
  return {
    platform_id: requireOpaqueId(
      record.platform_id,
      "runtime_identity.platform_identity.platform_id",
    ),
    platform_sha256: requireSha256(
      record.platform_sha256,
      "runtime_identity.platform_identity.platform_sha256",
    ),
  };
}

function parseRuntimeIdentity(value: unknown): EngineRunRuntimeIdentityV1 {
  const record = requireRecord(value, "runtime_identity");
  requireExactKeys(
    record,
    ["runtime_id", "runtime_sha256", "platform_identity"],
    "runtime_identity",
  );
  return {
    runtime_id: requireOpaqueId(record.runtime_id, "runtime_identity.runtime_id"),
    runtime_sha256: requireSha256(
      record.runtime_sha256,
      "runtime_identity.runtime_sha256",
    ),
    platform_identity: parsePlatformIdentity(record.platform_identity),
  };
}

function parseInputContextManifest(
  value: unknown,
): EngineRunInputContextManifestV1 {
  const record = requireRecord(value, "input_context_manifest");
  requireExactKeys(
    record,
    ["manifest_id", "input_refs", "context_refs"],
    "input_context_manifest",
  );
  return {
    manifest_id: requireOpaqueId(
      record.manifest_id,
      "input_context_manifest.manifest_id",
    ),
    input_refs: parseCanonicalOpaqueIds(
      record.input_refs,
      "input_context_manifest.input_refs",
    ),
    context_refs: parseCanonicalOpaqueIds(
      record.context_refs,
      "input_context_manifest.context_refs",
    ),
  };
}

function parseRetainedStreamArtifactRefs(
  value: unknown,
): EngineRunRetainedStreamArtifactRefsV1 {
  const record = requireRecord(value, "retained_stream_artifact_refs");
  requireExactKeys(
    record,
    ["stdout_artifact_ref", "stderr_artifact_ref"],
    "retained_stream_artifact_refs",
  );
  return {
    stdout_artifact_ref: requireNullableOpaqueId(
      record.stdout_artifact_ref,
      "retained_stream_artifact_refs.stdout_artifact_ref",
    ),
    stderr_artifact_ref: requireNullableOpaqueId(
      record.stderr_artifact_ref,
      "retained_stream_artifact_refs.stderr_artifact_ref",
    ),
  };
}

function parseRetryRecoveryLineage(
  value: unknown,
): EngineRunRetryRecoveryLineageV1 {
  const record = requireRecord(value, "retry_recovery_lineage");
  requireExactKeys(
    record,
    ["attempt_number", "retry_of_run_id", "recovery_of_run_id"],
    "retry_recovery_lineage",
  );

  const attemptNumber = requireAttemptNumber(record.attempt_number);
  const retryOfRunId = requireNullableOpaqueId(
    record.retry_of_run_id,
    "retry_recovery_lineage.retry_of_run_id",
  );
  const recoveryOfRunId = requireNullableOpaqueId(
    record.recovery_of_run_id,
    "retry_recovery_lineage.recovery_of_run_id",
  );

  if (attemptNumber === 1) {
    if (retryOfRunId !== null || recoveryOfRunId !== null) {
      throw new TypeError(
        "first engine run attempt cannot declare retry or recovery lineage",
      );
    }
  } else {
    const relationCount =
      Number(retryOfRunId !== null) + Number(recoveryOfRunId !== null);
    if (relationCount !== 1) {
      throw new TypeError(
        "later engine run attempt must declare exactly one retry or recovery predecessor",
      );
    }
  }

  return {
    attempt_number: attemptNumber,
    retry_of_run_id: retryOfRunId,
    recovery_of_run_id: recoveryOfRunId,
  };
}

function requireRetainedStreamArtifactRefsResolve(
  streams: EngineRunRetainedStreamArtifactRefsV1,
  outputArtifactRefs: readonly string[],
): void {
  for (const [field, value] of [
    ["stdout_artifact_ref", streams.stdout_artifact_ref],
    ["stderr_artifact_ref", streams.stderr_artifact_ref],
  ] as const) {
    if (value !== null && !outputArtifactRefs.includes(value)) {
      throw new TypeError(
        "retained_stream_artifact_refs." +
          field +
          " must resolve in output_artifact_refs",
      );
    }
  }
}

function requireTimeOrder(startedAt: number, endedAt: number): void {
  if (endedAt < startedAt) {
    throw new TypeError(
      "ended_at_epoch_ms must be greater than or equal to started_at_epoch_ms",
    );
  }
}

export function parseEngineRunV1(value: unknown): EngineRunV1 {
  const record = requireRecord(value, "engine run");
  requireExactKeys(
    record,
    [
      "schema_version",
      "run_id",
      "plan_id",
      "target_id",
      "engine_id",
      "qualification_id",
      "configuration_identity",
      "command_identity",
      "runtime_identity",
      "started_at_epoch_ms",
      "ended_at_epoch_ms",
      "exit_class",
      "result_class",
      "input_context_manifest",
      "output_artifact_refs",
      "retained_stream_artifact_refs",
      "finding_refs",
      "coverage_refs",
      "coverage_limitations",
      "omissions",
      "limitations",
      "retry_recovery_lineage",
    ],
    "engine run",
  );

  if (record.schema_version !== ENGINE_RUN_SCHEMA_VERSION) {
    throw new TypeError("engine run schema_version must equal 1");
  }

  const startedAt = requireEpochMs(
    record.started_at_epoch_ms,
    "started_at_epoch_ms",
  );
  const endedAt = requireEpochMs(record.ended_at_epoch_ms, "ended_at_epoch_ms");
  requireTimeOrder(startedAt, endedAt);

  const outputArtifactRefs = parseCanonicalOpaqueIds(
    record.output_artifact_refs,
    "output_artifact_refs",
  );
  const retainedStreamArtifactRefs = parseRetainedStreamArtifactRefs(
    record.retained_stream_artifact_refs,
  );
  requireRetainedStreamArtifactRefsResolve(
    retainedStreamArtifactRefs,
    outputArtifactRefs,
  );

  return {
    schema_version: ENGINE_RUN_SCHEMA_VERSION,
    run_id: requireOpaqueId(record.run_id, "run_id"),
    plan_id: requireOpaqueId(record.plan_id, "plan_id"),
    target_id: requireOpaqueId(record.target_id, "target_id"),
    engine_id: requireOpaqueId(record.engine_id, "engine_id"),
    qualification_id: requireOpaqueId(record.qualification_id, "qualification_id"),
    configuration_identity: parseConfigurationIdentity(
      record.configuration_identity,
    ),
    command_identity: parseCommandIdentity(record.command_identity),
    runtime_identity: parseRuntimeIdentity(record.runtime_identity),
    started_at_epoch_ms: startedAt,
    ended_at_epoch_ms: endedAt,
    exit_class: requireStateId(record.exit_class, "exit_class"),
    result_class: requireStateId(record.result_class, "result_class"),
    input_context_manifest: parseInputContextManifest(
      record.input_context_manifest,
    ),
    output_artifact_refs: outputArtifactRefs,
    retained_stream_artifact_refs: retainedStreamArtifactRefs,
    finding_refs: parseCanonicalOpaqueIds(record.finding_refs, "finding_refs"),
    coverage_refs: parseCanonicalOpaqueIds(record.coverage_refs, "coverage_refs"),
    coverage_limitations: parseCanonicalTextList(
      record.coverage_limitations,
      "coverage_limitations",
    ),
    omissions: parseCanonicalTextList(record.omissions, "omissions"),
    limitations: parseCanonicalTextList(record.limitations, "limitations"),
    retry_recovery_lineage: parseRetryRecoveryLineage(
      record.retry_recovery_lineage,
    ),
  };
}

export function createEngineRunV1(input: EngineRunInputV1): EngineRunV1 {
  return parseEngineRunV1({
    schema_version: ENGINE_RUN_SCHEMA_VERSION,
    run_id: input.run_id,
    plan_id: input.plan_id,
    target_id: input.target_id,
    engine_id: input.engine_id,
    qualification_id: input.qualification_id,
    configuration_identity: input.configuration_identity,
    command_identity: input.command_identity,
    runtime_identity: input.runtime_identity,
    started_at_epoch_ms: input.started_at_epoch_ms,
    ended_at_epoch_ms: input.ended_at_epoch_ms,
    exit_class: input.exit_class,
    result_class: input.result_class,
    input_context_manifest: {
      manifest_id: input.input_context_manifest.manifest_id,
      input_refs: normalizeOpaqueIds(
        input.input_context_manifest.input_refs,
        "input_context_manifest.input_refs",
      ),
      context_refs: normalizeOpaqueIds(
        input.input_context_manifest.context_refs,
        "input_context_manifest.context_refs",
      ),
    },
    output_artifact_refs: normalizeOpaqueIds(
      input.output_artifact_refs,
      "output_artifact_refs",
    ),
    retained_stream_artifact_refs: input.retained_stream_artifact_refs,
    finding_refs: normalizeOpaqueIds(input.finding_refs, "finding_refs"),
    coverage_refs: normalizeOpaqueIds(input.coverage_refs, "coverage_refs"),
    coverage_limitations: normalizeTextList(
      input.coverage_limitations,
      "coverage_limitations",
    ),
    omissions: normalizeTextList(input.omissions, "omissions"),
    limitations: normalizeTextList(input.limitations, "limitations"),
    retry_recovery_lineage: input.retry_recovery_lineage,
  });
}

function requireExactBindings(
  run: EngineRunV1,
  plan: AssurancePlanV1,
  target: AssuranceTargetV1,
  descriptor: EngineDescriptorV1,
  qualification: EngineQualificationV1,
): void {
  if (run.plan_id !== plan.plan_id) {
    throw new TypeError("engine run plan_id does not match AssurancePlan");
  }
  if (run.target_id !== target.target_id) {
    throw new TypeError("engine run target_id does not match AssuranceTarget");
  }
  if (plan.target_id !== target.target_id) {
    throw new TypeError("AssurancePlan target_id does not match AssuranceTarget");
  }
  if (run.engine_id !== descriptor.engine_id) {
    throw new TypeError("engine run engine_id does not match EngineDescriptor");
  }
  if (!plan.selected_engine_identities.includes(run.engine_id)) {
    throw new TypeError("engine run engine_id is not selected by AssurancePlan");
  }
  if (run.qualification_id !== qualification.qualification_id) {
    throw new TypeError(
      "engine run qualification_id does not match EngineQualification",
    );
  }
  if (qualification.engine_id !== run.engine_id) {
    throw new TypeError(
      "EngineQualification engine_id does not match engine run",
    );
  }
  if (
    !isDeepStrictEqual(
      qualification.implementation_identity,
      descriptor.implementation_identity,
    )
  ) {
    throw new TypeError(
      "EngineQualification implementation identity does not match EngineDescriptor",
    );
  }
  if (
    !isDeepStrictEqual(
      run.configuration_identity,
      qualification.configuration_identity,
    )
  ) {
    throw new TypeError(
      "engine run configuration identity does not match EngineQualification",
    );
  }
  if (
    !isDeepStrictEqual(
      run.runtime_identity.platform_identity,
      qualification.platform_identity,
    )
  ) {
    throw new TypeError(
      "engine run platform identity does not match EngineQualification",
    );
  }
}

export function assertEngineRunBindingsV1(
  run: unknown,
  plan: unknown,
  target: unknown,
  descriptor: unknown,
  qualification: unknown,
): void {
  const parsedRun = parseEngineRunV1(run);
  const parsedPlan = parseAssurancePlanV1(plan);
  const parsedTarget = parseAssuranceTargetV1(target);
  const parsedDescriptor = parseEngineDescriptorV1(descriptor);
  const parsedQualification = parseEngineQualificationV1(qualification);

  requireExactBindings(
    parsedRun,
    parsedPlan,
    parsedTarget,
    parsedDescriptor,
    parsedQualification,
  );
}
