import {
  assertReviewProfileV1,
  type ReviewProfileV1,
} from "../../review/review-profile.js";

export const REVIEW_ADAPTER_SCHEMA_VERSION = 1 as const;
export const REVIEW_ADAPTER_ENGINE_ID = "engine:review-opencode-review" as const;
export const MAX_REVIEW_ARGV = 32 as const;
export const MAX_REVIEW_ARG_BYTES = 256 as const;
export const MAX_REVIEW_STDOUT_BYTES = 1048576 as const;

export type ReviewExecutionStatusV1 =
  | "COMPLETED"
  | "UNAVAILABLE"
  | "NOT_QUALIFIED"
  | "TIMEOUT"
  | "ERROR"
  | "REFUSED";

export interface ReviewRunnerRequestV1 {
  readonly binary_path: string;
  readonly argv: readonly string[];
  readonly timeout_ms: number;
}

export interface ReviewRunnerResultV1 {
  readonly exit_code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ReviewRunnerV1 {
  run(request: ReviewRunnerRequestV1): Promise<ReviewRunnerResultV1>;
}

export interface ReviewBinaryIdentityV1 {
  readonly binary_name: string;
  readonly expected_version: string;
  readonly resolved_path: string;
}

export interface ReviewExecutionRequestV1 {
  readonly profile: ReviewProfileV1;
  readonly capsule_id: string;
  readonly head_sha: string;
  readonly binary: ReviewBinaryIdentityV1;
  readonly timeout_ms: number;
  readonly argv: readonly string[];
}

export interface ReviewExecutionIdentityV1 {
  readonly engine_id: string;
  readonly binary_name: string;
  readonly observed_version: string | null;
  readonly resolved_path: string;
  readonly profile_id: string;
  readonly capsule_id: string;
  readonly head_sha: string;
  readonly argv: readonly string[];
}

export interface ReviewExecutionResultV1 {
  readonly schema_version: 1;
  readonly status: ReviewExecutionStatusV1;
  readonly exit_code: number | null;
  readonly raw_stdout: string | null;
  readonly stderr_excerpt: string | null;
  readonly duration_ms: number | null;
  readonly timed_out: boolean;
  readonly reasons: readonly string[];
  readonly execution_identity: ReviewExecutionIdentityV1;
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const GIT_SHA_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const SAFE_ARG = /^-{0,2}[A-Za-z0-9][A-Za-z0-9._:=\/-]{0,253}$/u;
const VERSION_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/u;

function isOpaque(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function identity(
  request: ReviewExecutionRequestV1,
  observed_version: string | null,
): ReviewExecutionIdentityV1 {
  return Object.freeze({
    engine_id: REVIEW_ADAPTER_ENGINE_ID,
    binary_name: request.binary.binary_name,
    observed_version,
    resolved_path: request.binary.resolved_path,
    profile_id: request.profile.profile_id,
    capsule_id: request.capsule_id,
    head_sha: request.head_sha,
    argv: Object.freeze([...request.argv]),
  });
}

function fail(
  request: ReviewExecutionRequestV1,
  status: ReviewExecutionStatusV1,
  reasons: readonly string[],
  observed_version: string | null = null,
): ReviewExecutionResultV1 {
  return {
    schema_version: REVIEW_ADAPTER_SCHEMA_VERSION,
    status,
    exit_code: null,
    raw_stdout: null,
    stderr_excerpt: null,
    duration_ms: null,
    timed_out: status === "TIMEOUT",
    reasons: Object.freeze([...reasons]),
    execution_identity: identity(request, observed_version),
  };
}

function validArgv(argv: readonly string[]): boolean {
  if (argv.length > MAX_REVIEW_ARGV) {
    return false;
  }
  return argv.every(
    (arg) =>
      typeof arg === "string" &&
      arg.length > 0 &&
      arg.length <= MAX_REVIEW_ARG_BYTES &&
      SAFE_ARG.test(arg) &&
      !arg.includes(".."),
  );
}

export async function executeReviewV1(
  request: ReviewExecutionRequestV1,
  runner: ReviewRunnerV1,
): Promise<ReviewExecutionResultV1> {
  const profileCheck = assertReviewProfileV1(request.profile);
  if (!profileCheck.ok) {
    return fail(request, "REFUSED", [
      "invalid review profile: " + profileCheck.reasons.join("; "),
    ]);
  }
  if (!isOpaque(request.capsule_id)) {
    return fail(request, "REFUSED", ["capsule id invalid"]);
  }
  if (!GIT_SHA_HEX.test(request.head_sha)) {
    return fail(request, "REFUSED", ["head sha invalid"]);
  }
  if (!isOpaque(request.binary.binary_name)) {
    return fail(request, "REFUSED", ["binary name invalid"]);
  }
  if (!VERSION_TOKEN.test(request.binary.expected_version)) {
    return fail(request, "REFUSED", ["expected version invalid"]);
  }
  if (
    typeof request.binary.resolved_path !== "string" ||
    request.binary.resolved_path.length === 0
  ) {
    return fail(request, "REFUSED", ["resolved path invalid"]);
  }
  if (
    !Number.isInteger(request.timeout_ms) ||
    request.timeout_ms <= 0 ||
    request.timeout_ms > 600000
  ) {
    return fail(request, "REFUSED", ["timeout out of bounds"]);
  }
  if (!validArgv(request.argv)) {
    return fail(request, "REFUSED", ["argv rejected"]);
  }

  let version: ReviewRunnerResultV1;
  try {
    version = await runner.run({
      binary_path: request.binary.resolved_path,
      argv: ["--version"],
      timeout_ms: Math.min(request.timeout_ms, 30000),
    });
  } catch {
    return fail(request, "UNAVAILABLE", ["binary unreachable"]);
  }
  const observed = version.stdout.trim();
  if (version.exit_code !== 0 || !observed.includes(request.binary.expected_version)) {
    return fail(request, "NOT_QUALIFIED", [
      "binary version mismatch",
    ], observed.length > 0 ? observed.slice(0, 128) : null);
  }

  const started = Date.now();
  let run: ReviewRunnerResultV1;
  try {
    run = await runner.run({
      binary_path: request.binary.resolved_path,
      argv: [...request.argv],
      timeout_ms: request.timeout_ms,
    });
  } catch {
    return fail(
      request,
      "TIMEOUT",
      ["execution timed out"],
      observed.slice(0, 128),
    );
  }
  const duration_ms = Date.now() - started;
  const stdout =
    run.stdout.length > MAX_REVIEW_STDOUT_BYTES
      ? run.stdout.slice(0, MAX_REVIEW_STDOUT_BYTES)
      : run.stdout;
  if (run.exit_code !== 0) {
    return {
      schema_version: REVIEW_ADAPTER_SCHEMA_VERSION,
      status: "ERROR",
      exit_code: run.exit_code,
      raw_stdout: stdout,
      stderr_excerpt: run.stderr.slice(0, 4096),
      duration_ms,
      timed_out: false,
      reasons: Object.freeze(["review binary exited non-zero"]),
      execution_identity: identity(request, observed.slice(0, 128)),
    };
  }
  return {
    schema_version: REVIEW_ADAPTER_SCHEMA_VERSION,
    status: "COMPLETED",
    exit_code: run.exit_code,
    raw_stdout: stdout,
    stderr_excerpt: null,
    duration_ms,
    timed_out: false,
    reasons: Object.freeze([]),
    execution_identity: identity(request, observed.slice(0, 128)),
  };
}
