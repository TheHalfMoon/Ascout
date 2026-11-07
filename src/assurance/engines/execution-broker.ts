import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, relative, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";

import type {
  EngineBenchmarkCorpusIdentityV1,
  EnginePlatformIdentityV1,
} from "../contracts/engine-qualification.js";
import type { EngineRegistryEntryV1, EngineRegistryV1 } from "../kernel/registry.js";
import {
  createEngineQualificationSetV1,
  evaluateEngineQualificationV1,
  type EngineQualificationSetV1,
} from "../kernel/qualification.js";
import { createEngineRegistryV1 } from "../kernel/registry.js";
import { SENTRDEL_EVIDENCE_SECRET_SHAPES } from "../security/sentrdel-evidence-normalization.js";
import { readGitHeadState, readTreeDigestV1, refuseUnsupportedRepository } from "../../git.js";
import { runProcess, type ProcessCapture, type ProcessRunResult } from "../../process.js";
import {
  decodeGitleaksReportV1,
  GITLEAKS_SUPPRESSION_LIMITATION_V1,
  gitleaksIgnoreFilesV1,
} from "./gitleaks-adapter.js";
import {
  EngineEnvelopeError,
  parseEngineEnvelopeV1,
  type EngineEnvelopeSourceV1,
  type EngineEnvelopeV1,
} from "./engine-envelope-v1.js";
import {
  ENGINE_PROTOCOL_V1,
  engineProfileQualificationIdentityV1,
  engineProfileSha256V1,
  validateEngineProfileV1,
  type EngineProfileV1,
} from "./engine-profile-v1.js";

export const ENGINE_REQUEST_SCHEMA_V1 = "ascout-engine-request/1" as const;
export const ENGINE_RUN_RESULT_SCHEMA_V1 = "ascout-engine-run-result/1" as const;

export const ENGINE_RUN_STATUSES_V1 = [
  "EXECUTED",
  "NOT_RUN",
  "UNAVAILABLE",
  "VERSION_MISMATCH",
  "DENIED_BY_POLICY",
  "MALFORMED_OUTPUT",
  "ENGINE_ERROR",
  "TIMEOUT",
  "INCOMPLETE",
] as const;
export type EngineRunStatusV1 = (typeof ENGINE_RUN_STATUSES_V1)[number];

export interface EngineRequestSourceV1 extends EngineEnvelopeSourceV1 {
  readonly root_absolute_path: string;
}

export interface EngineRequestQualificationV1 {
  readonly registry: EngineRegistryV1;
  readonly qualification_set: EngineQualificationSetV1;
  readonly benchmark_corpus_identity: EngineBenchmarkCorpusIdentityV1;
  readonly platform_identity: EnginePlatformIdentityV1;
}

export interface EngineRequestV1 {
  readonly schema: typeof ENGINE_REQUEST_SCHEMA_V1;
  readonly request_id: string;
  readonly source: EngineRequestSourceV1;
  readonly capabilities: readonly string[];
  readonly qualification: EngineRequestQualificationV1;
}

export interface EngineRunStreamV1 {
  readonly observed_bytes: number;
  readonly captured_bytes: number;
  readonly cap_hit: boolean;
  /** Null when the stream was withheld, because a digest of a secret can confirm a guess. */
  readonly sha256: string | null;
}

export interface EngineRunResultV1 {
  readonly schema: typeof ENGINE_RUN_RESULT_SCHEMA_V1;
  readonly request_id: string | null;
  readonly engine_id: string | null;
  readonly profile_id: string | null;
  readonly profile_sha256: string | null;
  readonly qualification_id: string | null;
  readonly status: EngineRunStatusV1;
  readonly reason_code: string;
  readonly exit_code: number | null;
  readonly signal: string | null;
  readonly started_at_epoch_ms: number | null;
  readonly ended_at_epoch_ms: number | null;
  readonly source_start: EngineEnvelopeSourceV1 | null;
  readonly source_end: EngineEnvelopeSourceV1 | null;
  readonly executable_sha256: string | null;
  readonly stdout: EngineRunStreamV1 | null;
  readonly stderr: EngineRunStreamV1 | null;
  readonly stderr_excerpt: string | null;
  readonly output_withheld: boolean;
  readonly envelope: EngineEnvelopeV1 | null;
  readonly cleanup_complete: boolean;
  readonly limitations: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const GIT_OBJECT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const SENSITIVE_ENV_NAME = /(?:TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|API_?KEY|PRIVATE_?KEY)/iu;
const MIN_SENSITIVE_VALUE_LENGTH = 8;
const MAX_HASHED_FILE_BYTES = 512 * 1024 * 1024;
const STDERR_EXCERPT_BYTES = 2_048;
const TERMINATION_GRACE_MS = 500;

const BROKER_LIMITATIONS = Object.freeze([
  "The engine ran with the user's rights; the broker is not a sandbox.",
  "Network denial is a request; the broker does not block sockets.",
  "Secret detection covers known shapes and exact sensitive values only.",
  "Source binding read the live worktree, not a frozen export.",
  "Source binding does not cover ignored files or Git metadata such as hooks.",
  "A file swapped between the digest check and launch and then restored is not detected.",
  "The qualification records and platform identity are trusted as the caller supplied them.",
]);
const TREE_LIMITATION: Readonly<Record<string, string>> = Object.freeze({
  native_process_tree:
    "A descendant that outlived the root and closed its output pipes cannot be detected on Windows.",
  process_group:
    "A descendant that left the process group and closed its output pipes cannot be detected.",
});

type RunContext = Pick<
  EngineRunResultV1,
  "request_id" | "engine_id" | "profile_id" | "profile_sha256"
>;

function emptyContext(): RunContext {
  return { request_id: null, engine_id: null, profile_id: null, profile_sha256: null };
}

function refusal(
  context: RunContext,
  status: EngineRunStatusV1,
  reasonCode: string,
  extra: Partial<EngineRunResultV1> = {},
): EngineRunResultV1 {
  return {
    schema: ENGINE_RUN_RESULT_SCHEMA_V1,
    ...context,
    qualification_id: null,
    status,
    reason_code: reasonCode,
    exit_code: null,
    signal: null,
    started_at_epoch_ms: null,
    ended_at_epoch_ms: null,
    source_start: null,
    source_end: null,
    executable_sha256: null,
    stdout: null,
    stderr: null,
    stderr_excerpt: null,
    output_withheld: false,
    envelope: null,
    cleanup_complete: true,
    limitations: [],
    ...extra,
  };
}

/**
 * Clones to plain data and parses the kernel records, so later reads cannot see different
 * values and a crafted object cannot answer a check for itself. structuredClone drops
 * prototypes and species, and refuses own functions.
 */
function snapshotRequest(untrusted: EngineRequestV1): EngineRequestV1 | null {
  try {
    const request = structuredClone(untrusted);
    if (!Array.isArray(request.capabilities)) return null;
    const { source, qualification } = request;
    return Object.freeze({
      schema: request.schema,
      request_id: request.request_id,
      source: Object.freeze({
        root_absolute_path: source.root_absolute_path,
        head_sha: source.head_sha,
        tree_digest: source.tree_digest,
      }),
      capabilities: Object.freeze([...request.capabilities]),
      qualification: Object.freeze({
        registry: createEngineRegistryV1(qualification.registry.entries),
        qualification_set: createEngineQualificationSetV1(
          qualification.qualification_set.qualifications,
        ),
        benchmark_corpus_identity: { ...qualification.benchmark_corpus_identity },
        platform_identity: { ...qualification.platform_identity },
      }),
    });
  } catch {
    return null;
  }
}

/** Returns a reason for refusal, or null. Takes the output of snapshotRequest. */
function validateRequestShape(request: EngineRequestV1): string | null {
  if (request.schema !== ENGINE_REQUEST_SCHEMA_V1) return "request schema is unknown";
  if (typeof request.request_id !== "string" || !OPAQUE_ID.test(request.request_id)) {
    return "request_id is invalid";
  }
  const source = request.source;
  if (
    typeof source.root_absolute_path !== "string" ||
    !isAbsolute(source.root_absolute_path) ||
    source.root_absolute_path.includes("\0") ||
    typeof source.head_sha !== "string" ||
    !GIT_OBJECT_ID.test(source.head_sha) ||
    typeof source.tree_digest !== "string" ||
    !SHA256_HEX.test(source.tree_digest)
  ) {
    return "request source is invalid";
  }
  const capabilities = request.capabilities;
  if (
    capabilities.length === 0 ||
    capabilities.some((entry) => typeof entry !== "string" || !OPAQUE_ID.test(entry)) ||
    new Set(capabilities).size !== capabilities.length
  ) {
    return "request capabilities are invalid";
  }
  return null;
}

function matchingRegistryEntries(
  registry: EngineRegistryV1,
  profile: EngineProfileV1,
): readonly EngineRegistryEntryV1[] {
  return registry.entries.filter(
    (entry) =>
      entry.descriptor.engine_id === profile.engine_id &&
      entry.descriptor.implementation_identity.artifact_sha256 === profile.artifact.sha256 &&
      entry.descriptor.implementation_identity.version === profile.release_version &&
      entry.configuration_identity.configuration_sha256 === profile.config_sha256,
  );
}

function descriptorAdmissible(entry: EngineRegistryEntryV1): boolean {
  const { descriptor } = entry;
  return (
    descriptor.engine_kind === "EXTERNAL" &&
    descriptor.license_provenance_state.admission_state === "ADMITTED" &&
    descriptor.requirements.process_required &&
    !descriptor.requirements.network_required &&
    !descriptor.requirements.sandbox_required &&
    descriptor.requirements.provider_requirements.length === 0 &&
    descriptor.authority_ceiling === "E0_READ_ONLY_ANALYSIS" &&
    isDeepStrictEqual(descriptor.effect_classes, ["E0_READ_ONLY_ANALYSIS"])
  );
}

function isInside(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === "" ||
    (fromRoot !== ".." && !fromRoot.startsWith(".." + sep) && !isAbsolute(fromRoot))
  );
}

type FileCheck =
  | { readonly kind: "ok"; readonly sha256: string }
  | { readonly kind: "missing" }
  | { readonly kind: "non_canonical" }
  | { readonly kind: "inside_source" }
  | { readonly kind: "mismatch" };

async function sha256OfFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  // A file that grows past the size check cannot keep this read going.
  for await (const chunk of createReadStream(path, { end: MAX_HASHED_FILE_BYTES })) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}

async function checkFixedFile(
  path: string,
  expectedSha256: string,
  sourceRoot: string,
): Promise<FileCheck> {
  let canonical: string;
  try {
    canonical = await realpath(path);
  } catch {
    // A planted path inside the source is refused for that reason even when absent.
    return isInside(sourceRoot, path) ? { kind: "inside_source" } : { kind: "missing" };
  }
  if (isInside(sourceRoot, canonical) || isInside(sourceRoot, path)) {
    return { kind: "inside_source" };
  }
  if (canonical !== path) return { kind: "non_canonical" };
  try {
    const details = await stat(canonical);
    if (!details.isFile() || details.size > MAX_HASHED_FILE_BYTES) return { kind: "non_canonical" };
    const sha256 = await sha256OfFile(canonical);
    return sha256 === expectedSha256 ? { kind: "ok", sha256 } : { kind: "mismatch" };
  } catch {
    return { kind: "missing" };
  }
}

function readSourceBinding(root: string): EngineEnvelopeSourceV1 | null {
  try {
    refuseUnsupportedRepository(root);
    return {
      head_sha: readGitHeadState(root).head_sha,
      tree_digest: readTreeDigestV1(root).tree_digest,
    };
  } catch {
    return null;
  }
}

function sameBinding(left: EngineEnvelopeSourceV1, right: EngineEnvelopeSourceV1): boolean {
  return left.head_sha === right.head_sha && left.tree_digest === right.tree_digest;
}

// libuv copies these from the parent into any Windows child that does not set them,
// PATH and USERPROFILE included. Only an explicit empty value keeps them out.
const WINDOWS_BLANKED_ENVIRONMENT = Object.freeze({
  HOMEDRIVE: "",
  HOMEPATH: "",
  LOGONSERVER: "",
  PATH: "",
  SYSTEMDRIVE: "",
  TEMP: "",
  USERDOMAIN: "",
  USERNAME: "",
  USERPROFILE: "",
});

function engineEnvironment(profile: EngineProfileV1): NodeJS.ProcessEnv {
  // Node copies this one into every child that does not set it.
  const coverage = process.env.NODE_V8_COVERAGE === undefined ? {} : { NODE_V8_COVERAGE: "" };
  if (process.platform !== "win32") return { ...coverage, ...profile.environment };
  const systemRoot = process.env.SystemRoot ?? "";
  return {
    ...coverage,
    ...WINDOWS_BLANKED_ENVIRONMENT,
    WINDIR: systemRoot,
    SystemRoot: systemRoot,
    ...profile.environment,
  };
}

function sensitiveParentValues(): readonly string[] {
  const values = new Set<string>();
  for (const [name, value] of Object.entries(process.env)) {
    if (
      value !== undefined &&
      value.length >= MIN_SENSITIVE_VALUE_LENGTH &&
      SENSITIVE_ENV_NAME.test(name)
    ) {
      values.add(value);
    }
  }
  return [...values];
}

function withoutControlCharacters(text: string): string {
  return text
    .replace(/\u001b\[[0-9;]*[A-Za-z]/gu, "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/gu, "");
}

function homeDirectory(): string | null {
  try {
    const home = homedir();
    // A bare root would turn every slash into the placeholder.
    return home.length > 1 && !/^[A-Za-z]:[\\/]?$/u.test(home) ? home : null;
  } catch {
    return null;
  }
}

function textHoldsSecret(text: string, sensitiveValues: readonly string[]): boolean {
  return (
    SENTRDEL_EVIDENCE_SECRET_SHAPES.some((shape) => shape.test(text)) ||
    sensitiveValues.some((value) => text.includes(value))
  );
}

function jsonHoldsSecret(value: unknown, sensitiveValues: readonly string[]): boolean {
  if (typeof value === "string") return textHoldsSecret(value, sensitiveValues);
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).some(
    ([key, entry]) =>
      textHoldsSecret(key, sensitiveValues) || jsonHoldsSecret(entry, sensitiveValues),
  );
}

// JSON can spell a secret with escapes, and the parsed text is what the result would carry.
function containsSecret(bytes: Buffer, sensitiveValues: readonly string[]): boolean {
  const text = bytes.toString("utf8");
  // The excerpt removes control characters, which could join a split secret back together.
  if (textHoldsSecret(text, sensitiveValues)) return true;
  if (textHoldsSecret(withoutControlCharacters(text), sensitiveValues)) return true;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return false;
  }
  try {
    return jsonHoldsSecret(parsed, sensitiveValues);
  } catch {
    // JSON too deep to walk could hide anything, so it counts as holding a secret.
    return true;
  }
}

function streamSummary(capture: ProcessCapture, withheld: boolean): EngineRunStreamV1 {
  return {
    observed_bytes: capture.observed_bytes,
    captured_bytes: capture.captured_bytes,
    cap_hit: capture.truncated,
    sha256: withheld ? null : createHash("sha256").update(capture.bytes).digest("hex"),
  };
}

function stderrExcerpt(capture: ProcessCapture, sourceRoot: string): string | null {
  // A cut at the cap can split a secret so that its shape no longer matches.
  if (capture.captured_bytes === 0 || capture.truncated) return null;
  let text = withoutControlCharacters(
    capture.bytes.subarray(0, STDERR_EXCERPT_BYTES).toString("utf8"),
  );
  text = text.replaceAll(sourceRoot, "<source>");
  const home = homeDirectory();
  if (home !== null) text = text.replaceAll(home, "<home>");
  return text
    .replace(/[A-Za-z]:[\\/][^\s"'<>|]*/gu, "<path>")
    .replace(/[\\/]{2}[^\s"'<>|]+/gu, "<path>")
    .replace(/(^|[^\w.<>-])\/[^\s"'<>|]+/gu, "$1<path>");
}

interface RunWindow {
  readonly started_at_epoch_ms: number;
  readonly ended_at_epoch_ms: number;
}

interface OutcomeDecision {
  readonly status: EngineRunStatusV1;
  readonly reason_code: string;
  readonly envelope: EngineEnvelopeV1 | null;
}

function decide(status: EngineRunStatusV1, reasonCode: string): OutcomeDecision {
  return { status, reason_code: reasonCode, envelope: null };
}

function decideFromEnvelope(
  run: ProcessRunResult,
  request: EngineRequestV1,
  profile: EngineProfileV1,
  profileSha256: string,
  sourceStart: EngineEnvelopeSourceV1,
  nativeExit: "CLEAN" | "FINDINGS",
  window: RunWindow,
): OutcomeDecision {
  let envelope: EngineEnvelopeV1;
  try {
    envelope = profile.output_format === "gitleaks-json-v1"
      ? decodeGitleaksReportV1(run.stdout.bytes, {
          request_id: request.request_id,
          profile,
          profile_sha256: profileSha256,
          source: sourceStart,
          capabilities: request.capabilities,
          started_at_epoch_ms: window.started_at_epoch_ms,
          ended_at_epoch_ms: window.ended_at_epoch_ms,
        })
      : parseEngineEnvelopeV1(run.stdout.bytes, request.request_id);
  } catch (error) {
    return decide(
      "MALFORMED_OUTPUT",
      error instanceof EngineEnvelopeError ? error.code : "INVALID_ENVELOPE",
    );
  }

  if (
    envelope.engine.id !== profile.engine_id ||
    envelope.engine.version !== profile.release_version ||
    envelope.profile_sha256 !== profileSha256 ||
    !sameBinding(envelope.source, sourceStart)
  ) {
    return decide("MALFORMED_OUTPUT", "ENVELOPE_BINDING_MISMATCH");
  }
  if (envelope.execution.state === "FAILED") {
    return decide("MALFORMED_OUTPUT", "EXIT_ENVELOPE_DISAGREEMENT");
  }
  const reported = envelope.capabilities.map((capability) => capability.id).sort();
  if (!isDeepStrictEqual(reported, [...request.capabilities].sort())) {
    return decide("MALFORMED_OUTPUT", "ENVELOPE_BINDING_MISMATCH");
  }
  if ((nativeExit === "FINDINGS") !== (envelope.observations.length > 0)) {
    return decide("MALFORMED_OUTPUT", "EXIT_ENVELOPE_DISAGREEMENT");
  }

  const complete =
    envelope.execution.state === "COMPLETED" &&
    envelope.capabilities.every(
      (capability) => capability.state === "EXECUTED" && capability.coverage === "COMPLETE",
    );
  return complete
    ? { status: "EXECUTED", reason_code: "RUN_COMPLETE", envelope }
    : { status: "INCOMPLETE", reason_code: "PARTIAL_COVERAGE", envelope };
}

function decideOutcome(
  run: ProcessRunResult,
  request: EngineRequestV1,
  profile: EngineProfileV1,
  profileSha256: string,
  sourceStart: EngineEnvelopeSourceV1,
  sourceEnd: EngineEnvelopeSourceV1 | null,
  artifactsUnchanged: boolean,
  secretFound: boolean,
  window: RunWindow,
): OutcomeDecision {
  if (run.outcome === "error" && run.error?.code === "ENOENT") {
    return decide("UNAVAILABLE", "EXECUTABLE_MISSING");
  }
  if (!run.cleanup_complete) return decide("ENGINE_ERROR", "CLEANUP_INCOMPLETE");
  if (run.outcome === "error") return decide("ENGINE_ERROR", "PROCESS_CONTROL_ERROR");
  if (sourceEnd === null) return decide("INCOMPLETE", "SOURCE_BINDING_UNAVAILABLE");
  if (!sameBinding(sourceEnd, sourceStart)) return decide("INCOMPLETE", "SOURCE_DRIFT_AT_END");
  if (!artifactsUnchanged) return decide("VERSION_MISMATCH", "ARTIFACT_CHANGED_DURING_RUN");
  if (run.outcome === "timed_out") return decide("TIMEOUT", "WALL_TIME_EXCEEDED");
  if (run.outcome === "cancelled") return decide("INCOMPLETE", "CANCELLED");
  if (run.outcome === "capture_limit" || run.stdout.truncated || run.stderr.truncated) {
    return decide("INCOMPLETE", "OUTPUT_CAP_EXCEEDED");
  }
  if (run.outcome === "tree_escape") return decide("INCOMPLETE", "TREE_ESCAPE");
  if (secretFound) return decide("MALFORMED_OUTPUT", "SECRET_IN_OUTPUT");
  if (run.exit_code === null) return decide("ENGINE_ERROR", "TERMINATED_BY_SIGNAL");

  const nativeExit = Object.hasOwn(profile.native_exit_map, String(run.exit_code))
    ? profile.native_exit_map[String(run.exit_code)]
    : undefined;
  if (nativeExit === undefined) return decide("ENGINE_ERROR", "UNMAPPED_EXIT");
  if (nativeExit === "ERROR") return decide("ENGINE_ERROR", "NATIVE_ERROR_EXIT");
  if (nativeExit === "NO_INPUT") return decide("INCOMPLETE", "NATIVE_NO_INPUT");
  return decideFromEnvelope(run, request, profile, profileSha256, sourceStart, nativeExit, window);
}

export async function runQualifiedEngineV1(
  untrustedRequest: EngineRequestV1,
  profile: EngineProfileV1,
  signal: AbortSignal,
): Promise<EngineRunResultV1> {
  // The type is not a check: a profile may have been built from serialized data.
  let validated: EngineProfileV1;
  let profileSha256: string;
  try {
    validated = validateEngineProfileV1(structuredClone(profile));
    profileSha256 = engineProfileSha256V1(validated);
  } catch {
    return refusal(emptyContext(), "DENIED_BY_POLICY", "INVALID_PROFILE");
  }
  const profileContext = {
    request_id: null,
    engine_id: validated.engine_id,
    profile_id: validated.profile_id,
    profile_sha256: profileSha256,
  };
  const request = snapshotRequest(untrustedRequest);
  if (request === null || validateRequestShape(request) !== null) {
    return refusal(profileContext, "DENIED_BY_POLICY", "INVALID_REQUEST");
  }
  const context: RunContext = { ...profileContext, request_id: request.request_id };

  if (signal.aborted) return refusal(context, "NOT_RUN", "CANCELLED_BEFORE_START");
  if (validated.platform !== process.platform || validated.arch !== process.arch) {
    return refusal(context, "UNAVAILABLE", "PLATFORM_MISMATCH");
  }
  if (!request.capabilities.every((id) => validated.requested_capabilities.includes(id))) {
    return refusal(context, "DENIED_BY_POLICY", "CAPABILITY_NOT_ADMITTED");
  }

  const entries = matchingRegistryEntries(request.qualification.registry, validated);
  const entry = entries[0];
  if (entries.length !== 1 || entry === undefined) {
    return refusal(context, "DENIED_BY_POLICY", "ENGINE_NOT_REGISTERED");
  }
  if (!descriptorAdmissible(entry)) {
    return refusal(context, "DENIED_BY_POLICY", "DESCRIPTOR_NOT_ADMISSIBLE");
  }
  if (!validated.requested_capabilities.every((id) => entry.descriptor.capabilities.includes(id))) {
    return refusal(context, "DENIED_BY_POLICY", "CAPABILITY_NOT_ADMITTED");
  }

  let qualificationId: string | null;
  try {
    const decision = evaluateEngineQualificationV1(
      request.qualification.registry,
      request.qualification.qualification_set,
      {
        identity: {
          engine_id: entry.descriptor.engine_id,
          implementation_identity: entry.descriptor.implementation_identity,
          configuration_identity: entry.configuration_identity,
        },
        profile_identities: [engineProfileQualificationIdentityV1(validated)],
        benchmark_corpus_identity: request.qualification.benchmark_corpus_identity,
        platform_identity: request.qualification.platform_identity,
        as_of_epoch_ms: Date.now(),
      },
    );
    if (decision.result !== "QUALIFIED") {
      return refusal(context, "DENIED_BY_POLICY", decision.reason_code);
    }
    qualificationId = decision.qualification_id;
  } catch {
    return refusal(context, "DENIED_BY_POLICY", "INVALID_REQUEST");
  }
  const qualified = { ...context, qualification_id: qualificationId };

  let sourceRoot: string;
  try {
    sourceRoot = await realpath(request.source.root_absolute_path);
  } catch {
    return refusal(context, "NOT_RUN", "SOURCE_BINDING_UNAVAILABLE", qualified);
  }

  const executable = await checkFixedFile(
    validated.executable_absolute_path,
    validated.artifact.sha256,
    sourceRoot,
  );
  const config = await checkFixedFile(
    validated.config_absolute_path,
    validated.config_sha256,
    sourceRoot,
  );
  for (const [check, missingReason, mismatchReason] of [
    [executable, "EXECUTABLE_MISSING", "EXECUTABLE_DIGEST_MISMATCH"],
    [config, "CONFIG_MISSING", "CONFIG_DIGEST_MISMATCH"],
  ] as const) {
    if (check.kind === "inside_source") {
      return refusal(context, "DENIED_BY_POLICY", "REPOSITORY_CONTROLLED_PATH", qualified);
    }
    if (check.kind === "non_canonical") {
      return refusal(context, "DENIED_BY_POLICY", "NON_CANONICAL_PATH", qualified);
    }
    if (check.kind === "missing") {
      return refusal(context, "UNAVAILABLE", missingReason, qualified);
    }
    if (check.kind === "mismatch") {
      return refusal(context, "VERSION_MISMATCH", mismatchReason, qualified);
    }
  }
  const executableSha256 = validated.artifact.sha256;
  const verified = { ...qualified, executable_sha256: executableSha256 };

  const requestedBinding = {
    head_sha: request.source.head_sha,
    tree_digest: request.source.tree_digest,
  };
  const sourceStart = readSourceBinding(sourceRoot);
  if (sourceStart === null) {
    return refusal(context, "NOT_RUN", "SOURCE_BINDING_UNAVAILABLE", verified);
  }
  if (!sameBinding(sourceStart, requestedBinding)) {
    return refusal(context, "NOT_RUN", "SOURCE_DRIFT_AT_START", {
      ...verified,
      source_start: sourceStart,
    });
  }

  // A native report comes from an engine that reads ignore files the broker does not bind.
  const nativeReport = validated.output_format === "gitleaks-json-v1";
  const ignoreBefore = nativeReport ? gitleaksIgnoreFilesV1(validated, sourceRoot) : null;
  if (ignoreBefore?.engine === true) {
    return refusal(context, "DENIED_BY_POLICY", "ENGINE_IGNORE_FILE_PRESENT", {
      ...verified,
      source_start: sourceStart,
    });
  }

  const wireRequest = Buffer.from(
    JSON.stringify({
      protocol: ENGINE_PROTOCOL_V1,
      request_id: request.request_id,
      profile_sha256: profileSha256,
      source: requestedBinding,
      capabilities: [...request.capabilities].sort(),
      budget: validated.budget,
      network: validated.network,
      source_egress: validated.source_egress,
    }),
    "utf8",
  );
  if (wireRequest.byteLength > validated.budget.max_input_bytes) {
    return refusal(context, "DENIED_BY_POLICY", "REQUEST_TOO_LARGE", {
      ...verified,
      source_start: sourceStart,
    });
  }

  const startedAt = Date.now();
  let run: ProcessRunResult;
  try {
    run = await runProcess({
      file: validated.executable_absolute_path,
      exact_executable: true,
      argv: validated.argv,
      cwd: sourceRoot,
      env: engineEnvironment(validated),
      timeout_ms: validated.budget.max_wall_ms,
      termination_grace_ms: TERMINATION_GRACE_MS,
      capture_cap_bytes: validated.budget.max_stdout_bytes,
      stderr_capture_cap_bytes: validated.budget.max_stderr_bytes,
      stdin_bytes: wireRequest,
      signal,
      stop_on_capture_limit: true,
      require_tree_exit: true,
    });
  } catch {
    return refusal(context, "ENGINE_ERROR", "PROCESS_CONTROL_ERROR", {
      ...verified,
      source_start: sourceStart,
    });
  }
  const endedAt = Date.now();

  const sourceEnd = readSourceBinding(sourceRoot);
  const executableAfter = await checkFixedFile(
    validated.executable_absolute_path,
    validated.artifact.sha256,
    sourceRoot,
  );
  const configAfter = await checkFixedFile(
    validated.config_absolute_path,
    validated.config_sha256,
    sourceRoot,
  );

  const ignoreAfter = nativeReport ? gitleaksIgnoreFilesV1(validated, sourceRoot) : null;
  const sensitive = sensitiveParentValues();
  // A native report can hold raw text the adapter never copies, such as a second secret in
  // a match, so its bytes are never published and the check runs on what the result carries.
  const stdoutSecret = nativeReport ? false : containsSecret(run.stdout.bytes, sensitive);
  const stderrSecret = containsSecret(run.stderr.bytes, sensitive);
  let outcome = decideOutcome(
    run,
    request,
    validated,
    profileSha256,
    sourceStart,
    sourceEnd,
    executableAfter.kind === "ok" && configAfter.kind === "ok" && ignoreAfter?.engine !== true,
    stdoutSecret || stderrSecret,
    { started_at_epoch_ms: startedAt, ended_at_epoch_ms: endedAt },
  );
  const decodedSecret =
    outcome.envelope !== null &&
    containsSecret(Buffer.from(JSON.stringify(outcome.envelope), "utf8"), sensitive);
  if (decodedSecret) outcome = decide("MALFORMED_OUTPUT", "SECRET_IN_OUTPUT");
  const secretFound = stdoutSecret || stderrSecret || decodedSecret;
  const suppressionPossible = ignoreBefore?.source === true || ignoreAfter?.source === true;
  // Secret checks run on every path, so a run stopped for another reason withholds too.
  return {
    schema: ENGINE_RUN_RESULT_SCHEMA_V1,
    ...context,
    qualification_id: qualificationId,
    status: outcome.status,
    reason_code: outcome.reason_code,
    exit_code: run.exit_code,
    signal: run.signal,
    started_at_epoch_ms: startedAt,
    ended_at_epoch_ms: endedAt,
    source_start: sourceStart,
    source_end: sourceEnd,
    executable_sha256: executableSha256,
    stdout: streamSummary(run.stdout, stdoutSecret || nativeReport),
    stderr: streamSummary(run.stderr, stderrSecret),
    stderr_excerpt: secretFound ? null : stderrExcerpt(run.stderr, sourceRoot),
    output_withheld: secretFound,
    envelope: secretFound ? null : outcome.envelope,
    cleanup_complete: run.cleanup_complete,
    // A failed launch ran nothing, so the limits of a run do not apply to it.
    limitations: outcome.status === "UNAVAILABLE"
      ? []
      : [
          ...BROKER_LIMITATIONS,
          TREE_LIMITATION[run.termination_target] as string,
          ...(suppressionPossible ? [GITLEAKS_SUPPRESSION_LIMITATION_V1] : []),
        ],
  };
}
