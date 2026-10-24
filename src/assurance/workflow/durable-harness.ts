/**
 * Ascout Durable Harness. Replay vocabulary adapted from vercel-labs/durable-harness
 * ea8aa406 (Apache-2.0); see vendor/vercel-durable-harness/NOTICE.md.
 * Local observations only: this module grants no execution or publication authority.
 */
import { canonicalAssuranceJsonV1, canonicalAssuranceSha256V1 } from "../contracts/canonical-serialization.js";
import type { AssuranceRepositoryIdentityV1 } from "../contracts/target.js";
import { buildIdempotencyRecordV1, requestRetryV1 } from "./idempotency-reconciliation.js";
import { buildWorkflowRunV1, resumeWorkflowRunV1, type ResumeDecisionV1, type WorkflowRunV1 } from "./stage-attempt-model.js";

export const DURABLE_HARNESS_MAX_BYTES = 1024 * 1024;
export const DURABLE_HARNESS_MAX_CALLS = 256;
/** Upstream safe/never vocabulary; neither value grants Ascout effect authority. */
export type DurableHarnessReplayV1 = "safe" | "never";
export interface DurableHarnessBindingV1 {
  readonly repository_identity: AssuranceRepositoryIdentityV1;
  readonly run_identity: string;
  readonly subject_head: string;
  readonly source_tree_sha256: string;
  readonly configuration_sha256: string;
  readonly policy_identity: string;
}
export interface DurableHarnessCallV1 {
  readonly call_identity: string;
  readonly attempt_identity: string;
  readonly tool_name: string;
  readonly input_sha256: string;
  readonly replay: DurableHarnessReplayV1;
}
export interface DurableHarnessOutcomeV1 {
  readonly call_identity: string;
  readonly attempt_identity: string;
  readonly state: "SUCCEEDED" | "FAILED";
  readonly evidence_sha256: string;
}
export interface DurableHarnessRecordV1 extends DurableHarnessCallV1 {
  readonly state: "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  readonly evidence_sha256: string | null;
}
export interface DurableHarnessPayloadV1 {
  readonly schema_version: 1;
  readonly binding: DurableHarnessBindingV1;
  readonly calls: readonly DurableHarnessRecordV1[];
}
export interface DurableHarnessRecoveryV1 {
  readonly binding_current: boolean;
  readonly workflow: ResumeDecisionV1;
  readonly calls: readonly {
    readonly call_identity: string;
    readonly attempt_identity: string;
    readonly disposition: "RECORDED_SUCCESS" | "RECORDED_FAILURE" | "REVALIDATION_REQUIRED" | "RECONCILIATION_REQUIRED";
    readonly evidence_sha256: string | null;
    readonly execute: false;
  }[];
}

const HEX = /^[a-f0-9]{64}$/u;
function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError("durable harness requires an object");
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort(), expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) throw new TypeError("durable harness fields are missing or unsupported");
  return record;
}
function digest(value: unknown): string {
  if (typeof value !== "string" || !HEX.test(value)) throw new TypeError("durable harness requires lowercase sha256");
  return value;
}
export function parseDurableHarnessBindingV1(value: unknown): DurableHarnessBindingV1 {
  const r = object(value, ["repository_identity", "run_identity", "subject_head", "source_tree_sha256", "configuration_sha256", "policy_identity"]);
  const repo = object(r.repository_identity, ["repository_id", "repository_id_kind", "portable"]);
  if (typeof repo.repository_id !== "string") throw new TypeError("invalid privacy-safe repository identity");
  const remote = /^remote:[a-f0-9]{64}$/u.test(repo.repository_id);
  const local = /^local:[a-f0-9]{64}$/u.test(repo.repository_id);
  if (!(remote && repo.repository_id_kind === "remote" && repo.portable === true) &&
      !(local && repo.repository_id_kind === "local_only" && repo.portable === false)) throw new TypeError("repository identity kind or portability mismatch");
  if (typeof r.subject_head !== "string" || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(r.subject_head)) throw new TypeError("invalid durable subject head");
  const binding: DurableHarnessBindingV1 = {
    repository_identity: Object.freeze({ repository_id: repo.repository_id, repository_id_kind: remote ? "remote" : "local_only", portable: remote }),
    run_identity: digest(r.run_identity), subject_head: r.subject_head,
    source_tree_sha256: digest(r.source_tree_sha256), configuration_sha256: digest(r.configuration_sha256), policy_identity: digest(r.policy_identity),
  };
  if (!buildWorkflowRunV1(binding.run_identity, binding.subject_head, binding.policy_identity, [])) throw new TypeError("invalid workflow binding");
  return Object.freeze(binding);
}
export function parseDurableHarnessCallV1(value: unknown): DurableHarnessCallV1 {
  const r = object(value, ["call_identity", "attempt_identity", "tool_name", "input_sha256", "replay"]);
  if (typeof r.tool_name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(r.tool_name)) throw new TypeError("invalid bounded tool identity");
  if (r.replay !== "safe" && r.replay !== "never") throw new TypeError("unsupported replay policy");
  return Object.freeze({ call_identity: digest(r.call_identity), attempt_identity: digest(r.attempt_identity), tool_name: r.tool_name, input_sha256: digest(r.input_sha256), replay: r.replay });
}
export function parseDurableHarnessOutcomeV1(value: unknown): DurableHarnessOutcomeV1 {
  const r = object(value, ["call_identity", "attempt_identity", "state", "evidence_sha256"]);
  if (r.state !== "SUCCEEDED" && r.state !== "FAILED") throw new TypeError("unsupported durable outcome");
  return Object.freeze({ call_identity: digest(r.call_identity), attempt_identity: digest(r.attempt_identity), state: r.state, evidence_sha256: digest(r.evidence_sha256) });
}
export function parseDurableHarnessPayloadV1(value: unknown): DurableHarnessPayloadV1 {
  const r = object(value, ["schema_version", "binding", "calls"]);
  if (r.schema_version !== 1 || !Array.isArray(r.calls) || r.calls.length > DURABLE_HARNESS_MAX_CALLS) throw new TypeError("unsupported or oversized durable journal");
  const identities = new Set<string>(), attempts = new Set<string>();
  const calls = r.calls.map((value: unknown): DurableHarnessRecordV1 => {
    const c = object(value, ["call_identity", "attempt_identity", "tool_name", "input_sha256", "replay", "state", "evidence_sha256"]);
    const call = parseDurableHarnessCallV1({ call_identity: c.call_identity, attempt_identity: c.attempt_identity, tool_name: c.tool_name, input_sha256: c.input_sha256, replay: c.replay });
    if (identities.has(call.call_identity) || attempts.has(call.attempt_identity)) throw new TypeError("duplicate durable call or attempt identity");
    identities.add(call.call_identity); attempts.add(call.attempt_identity);
    if (c.state !== "IN_PROGRESS" && c.state !== "SUCCEEDED" && c.state !== "FAILED") throw new TypeError("invalid durable call state");
    const evidence = c.state === "IN_PROGRESS" ? null : digest(c.evidence_sha256);
    if (c.state === "IN_PROGRESS" && c.evidence_sha256 !== null) throw new TypeError("unfinished call cannot claim evidence");
    return Object.freeze({ ...call, state: c.state, evidence_sha256: evidence });
  });
  return Object.freeze({ schema_version: 1, binding: parseDurableHarnessBindingV1(r.binding), calls: Object.freeze(calls) });
}
export function encodeDurableHarnessSnapshotV1(payload: DurableHarnessPayloadV1): string {
  const parsed = parseDurableHarnessPayloadV1(payload);
  const text = canonicalAssuranceJsonV1({ payload: parsed, sha256: canonicalAssuranceSha256V1(parsed) }) + "\n";
  if (Buffer.byteLength(text) > DURABLE_HARNESS_MAX_BYTES) throw new TypeError("durable journal byte limit exceeded");
  return text;
}
export function decodeDurableHarnessSnapshotV1(text: string): DurableHarnessPayloadV1 {
  if (Buffer.byteLength(text) > DURABLE_HARNESS_MAX_BYTES) throw new TypeError("durable journal byte limit exceeded");
  const envelope = object(JSON.parse(text) as unknown, ["payload", "sha256"]);
  const payload = parseDurableHarnessPayloadV1(envelope.payload);
  if (digest(envelope.sha256) !== canonicalAssuranceSha256V1(payload) || text !== encodeDurableHarnessSnapshotV1(payload)) throw new TypeError("durable journal checksum or canonical encoding mismatch");
  return payload;
}
export function durableHarnessRecoveryV1(payload: DurableHarnessPayloadV1, expected: DurableHarnessBindingV1): DurableHarnessRecoveryV1 {
  const current = canonicalAssuranceJsonV1(payload.binding) === canonicalAssuranceJsonV1(expected);
  const base = buildWorkflowRunV1(payload.binding.run_identity, payload.binding.subject_head, payload.binding.policy_identity, payload.calls.map((call) => call.call_identity));
  if (!base) throw new TypeError("invalid durable workflow projection");
  const run: WorkflowRunV1 = { ...base, stages: payload.calls.map((call) => ({
    stage_key: call.call_identity, state: call.state,
    attempts: [{ attempt_number: 1, attempt_identity: call.attempt_identity, idempotency_identity: call.call_identity, retry_class: "INITIAL", state: call.state, detail: "durable call observation" }],
  })) };
  const resume = resumeWorkflowRunV1(run, expected.subject_head, expected.policy_identity);
  return Object.freeze({
    binding_current: current,
    workflow: Object.freeze({ ...resume, revalidation_required: resume.revalidation_required || !current,
      reasons: Object.freeze([...resume.reasons, ...(!current ? ["repository or source/configuration/policy binding requires revalidation"] : [])]) }),
    calls: Object.freeze(payload.calls.map((call) => {
      const idem = buildIdempotencyRecordV1(call.call_identity, call.attempt_identity, call.state === "IN_PROGRESS" ? "UNKNOWN" : call.state);
      if (!idem) throw new TypeError("invalid durable idempotency projection");
      const retry = requestRetryV1(idem, call.attempt_identity);
      const disposition = !current ? "REVALIDATION_REQUIRED" : retry.duplicate ? "RECORDED_SUCCESS" :
        call.state === "FAILED" ? "RECORDED_FAILURE" : call.replay === "never" ? "RECONCILIATION_REQUIRED" : "REVALIDATION_REQUIRED";
      return Object.freeze({ call_identity: call.call_identity, attempt_identity: call.attempt_identity,
        disposition, evidence_sha256: current ? call.evidence_sha256 : null, execute: false as const });
    })),
  });
}
