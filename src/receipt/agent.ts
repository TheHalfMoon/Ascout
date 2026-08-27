import { Buffer } from "node:buffer";

import { validateReceiptForAcceptance } from "./json.js";
import type {
  EvidenceV1,
  ExerciseRecordV1,
  FindingV1,
  ReceiptV1,
  TaskResultV1,
  TaskStatus,
  TestChangeV1,
} from "./model.js";

export const AGENT_RECEIPT_MAX_UTF8_BYTES = 16 * 1024;

const STATUS_ORDER: readonly TaskStatus[] = [
  "PASS",
  "FAIL",
  "FLAKY",
  "BLOCKED",
  "ERROR",
  "NOT_APPLICABLE",
  "NOT_RUN",
];

export interface AgentReceiptRenderOptions {
  readonly maxUtf8Bytes?: number;
}

export class AgentReceiptBudgetError extends Error {
  readonly maxUtf8Bytes: number;

  constructor(maxUtf8Bytes: number) {
    super(`agent receipt identity/summary/omission truth exceeds ${maxUtf8Bytes} UTF-8 bytes`);
    this.name = "AgentReceiptBudgetError";
    this.maxUtf8Bytes = maxUtf8Bytes;
  }
}

interface DetailRecord {
  readonly line: string;
  readonly taskId?: string;
}

interface SelectionChanges {
  readonly representedTaskId?: string;
  readonly finding?: boolean;
  readonly gap?: boolean;
  readonly testChange?: boolean;
  readonly evidenceId?: string;
  readonly evidenceLineBytes?: number;
}

interface ProjectionState {
  readonly errors: DetailRecord[];
  readonly findings: DetailRecord[];
  readonly admissions: DetailRecord[];
  readonly gaps: string[];
  readonly testChanges: string[];
  readonly evidenceIds: Set<string>;
  readonly representedTaskIds: Set<string>;
  retainedFindings: number;
  retainedGaps: number;
  retainedTestChanges: number;
  retainedEvidence: number;
  lineContributionBytes: number;
}

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function isSafeFieldByte(byte: number): boolean {
  return (
    (byte >= 0x30 && byte <= 0x39) ||
    (byte >= 0x41 && byte <= 0x5a) ||
    (byte >= 0x61 && byte <= 0x7a) ||
    byte === 0x2b ||
    byte === 0x2d ||
    byte === 0x2e ||
    byte === 0x2f ||
    byte === 0x3a ||
    byte === 0x5f
  );
}

/**
 * Agent records are space-delimited. Encode any byte that could alter record
 * structure while keeping ordinary repository paths and identifiers readable.
 */
function appendEncodedUtf8Scalar(encoded: string, scalar: string): string {
  let result = encoded;
  for (const byte of Buffer.from(scalar, "utf8")) {
    result += isSafeFieldByte(byte)
      ? String.fromCharCode(byte)
      : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return result;
}

export function encodeAgentFieldValue(value: string): string {
  let encoded = "";
  for (let index = 0; index < value.length;) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = index + 1 < value.length ? value.charCodeAt(index + 1) : null;
      if (nextCodeUnit !== null && nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        encoded = appendEncodedUtf8Scalar(encoded, value.slice(index, index + 2));
        index += 2;
        continue;
      }
      encoded += `%u${codeUnit.toString(16).toUpperCase().padStart(4, "0")}`;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      encoded += `%u${codeUnit.toString(16).toUpperCase().padStart(4, "0")}`;
      index += 1;
      continue;
    }
    encoded = appendEncodedUtf8Scalar(encoded, value[index]!);
    index += 1;
  }
  return encoded;
}

function resolveMaxUtf8Bytes(options: AgentReceiptRenderOptions | undefined): number {
  const value = options?.maxUtf8Bytes ?? AGENT_RECEIPT_MAX_UTF8_BYTES;
  if (!Number.isInteger(value) || value <= 0 || value > AGENT_RECEIPT_MAX_UTF8_BYTES) {
    throw new RangeError(
      `agent receipt maxUtf8Bytes must be an integer between 1 and ${AGENT_RECEIPT_MAX_UTF8_BYTES}`,
    );
  }
  return value;
}

function firstOwnedEvidenceId(
  evidenceById: ReadonlyMap<string, EvidenceV1>,
  taskId: string,
  evidenceIds: readonly string[],
): string | null {
  for (const evidenceId of evidenceIds) {
    if (evidenceById.get(evidenceId)?.task_id === taskId) return evidenceId;
  }
  return null;
}

function evidenceLine(evidence: EvidenceV1): string {
  return `EVIDENCE id=${encodeAgentFieldValue(evidence.evidence_id)} task=${encodeAgentFieldValue(evidence.task_id)} kind=${evidence.kind}`;
}

function errorCandidate(
  task: TaskResultV1,
  evidenceById: ReadonlyMap<string, EvidenceV1>,
): { readonly record: DetailRecord; readonly evidenceId: string } | null {
  if (task.status !== "ERROR") return null;
  const evidenceId = firstOwnedEvidenceId(evidenceById, task.task_id, task.evidence_ids);
  if (evidenceId === null) return null;
  return {
    record: {
      line: `ERROR task=${encodeAgentFieldValue(task.task_id)} reason=${encodeAgentFieldValue(task.reason_code ?? "unknown")} evidence=${encodeAgentFieldValue(evidenceId)}`,
      taskId: task.task_id,
    },
    evidenceId,
  };
}

function findingCandidate(
  finding: FindingV1,
  evidenceById: ReadonlyMap<string, EvidenceV1>,
): { readonly record: DetailRecord; readonly evidenceId: string } | null {
  const evidenceId = firstOwnedEvidenceId(evidenceById, finding.task_id, finding.evidence_ids);
  if (evidenceId === null) return null;
  return {
    record: {
      line: `FINDING id=${encodeAgentFieldValue(finding.finding_id)} task=${encodeAgentFieldValue(finding.task_id)} severity=${finding.severity} evidence=${encodeAgentFieldValue(evidenceId)}`,
    },
    evidenceId,
  };
}

function admissionCandidate(task: TaskResultV1): DetailRecord | null {
  if (task.execution_admission === "normal") return null;
  if (task.changed_authority_paths.length === 0) {
    throw new Error("accepted non-normal admission is missing changed authority paths");
  }
  const authority = task.changed_authority_paths.map(encodeAgentFieldValue).join(",");
  return {
    line: `ADMISSION task=${encodeAgentFieldValue(task.task_id)} state=${task.execution_admission} authority=${authority}`,
    taskId: task.task_id,
  };
}

function gapLine(record: ExerciseRecordV1): string | null {
  if (record.state === "EXERCISED") return null;
  const base = `GAP kind=${record.state} path=${encodeAgentFieldValue(record.path)} line=${record.line}`;
  if (record.state === "NOT_EXERCISED") return base;
  return `${base} reason=${encodeAgentFieldValue(record.reason ?? "unknown")}`;
}

function testChangeLine(change: TestChangeV1): string {
  return `TEST_CHANGE kind=${change.kind} path=${encodeAgentFieldValue(change.path)}`;
}

function omissionLine(
  receipt: ReceiptV1,
  materialGapCount: number,
  state: ProjectionState,
): string {
  return [
    "OMITTED",
    `tasks=${receipt.tasks.length - state.representedTaskIds.size}`,
    `findings=${receipt.findings.length - state.retainedFindings}`,
    `exercise_gaps=${materialGapCount - state.retainedGaps}`,
    `test_changes=${receipt.test_changes.length - state.retainedTestChanges}`,
    `evidence=${receipt.evidence.length - state.retainedEvidence}`,
  ].join(" ");
}

function lineContributionBytes(line: string): number {
  return 1 + utf8Bytes(line);
}

function projectionBytes(
  fixedBytes: number,
  receipt: ReceiptV1,
  materialGapCount: number,
  state: ProjectionState,
): number {
  return fixedBytes + state.lineContributionBytes + lineContributionBytes(
    omissionLine(receipt, materialGapCount, state),
  );
}

function canAdd(
  fixedBytes: number,
  receipt: ReceiptV1,
  materialGapCount: number,
  state: ProjectionState,
  maxUtf8Bytes: number,
  recordLineBytes: number,
  changes: SelectionChanges,
): boolean {
  const representedTaskWasNew =
    changes.representedTaskId !== undefined &&
    !state.representedTaskIds.has(changes.representedTaskId);
  const evidenceWasNew =
    changes.evidenceId !== undefined &&
    !state.evidenceIds.has(changes.evidenceId);

  if (representedTaskWasNew) state.representedTaskIds.add(changes.representedTaskId!);
  if (changes.finding === true) state.retainedFindings += 1;
  if (changes.gap === true) state.retainedGaps += 1;
  if (changes.testChange === true) state.retainedTestChanges += 1;
  if (evidenceWasNew) {
    state.evidenceIds.add(changes.evidenceId!);
    state.retainedEvidence += 1;
  }

  const evidenceBytes = evidenceWasNew ? (changes.evidenceLineBytes ?? 0) : 0;
  state.lineContributionBytes += recordLineBytes + evidenceBytes;
  const fits = projectionBytes(fixedBytes, receipt, materialGapCount, state) <= maxUtf8Bytes;
  state.lineContributionBytes -= recordLineBytes + evidenceBytes;

  if (evidenceWasNew) {
    state.evidenceIds.delete(changes.evidenceId!);
    state.retainedEvidence -= 1;
  }
  if (changes.testChange === true) state.retainedTestChanges -= 1;
  if (changes.gap === true) state.retainedGaps -= 1;
  if (changes.finding === true) state.retainedFindings -= 1;
  if (representedTaskWasNew) state.representedTaskIds.delete(changes.representedTaskId!);
  return fits;
}

function commitSelection(
  state: ProjectionState,
  recordLineBytes: number,
  changes: SelectionChanges,
): void {
  state.lineContributionBytes += recordLineBytes;
  if (changes.representedTaskId !== undefined) state.representedTaskIds.add(changes.representedTaskId);
  if (changes.finding === true) state.retainedFindings += 1;
  if (changes.gap === true) state.retainedGaps += 1;
  if (changes.testChange === true) state.retainedTestChanges += 1;
  if (changes.evidenceId !== undefined && !state.evidenceIds.has(changes.evidenceId)) {
    state.evidenceIds.add(changes.evidenceId);
    state.retainedEvidence += 1;
    state.lineContributionBytes += changes.evidenceLineBytes ?? 0;
  }
}

function renderSelectedProjection(
  receipt: ReceiptV1,
  materialGapCount: number,
  header: string,
  summary: string,
  state: ProjectionState,
): string {
  const lines: string[] = [header, summary];
  lines.push(...state.errors.map((record) => record.line));
  lines.push(...state.findings.map((record) => record.line));
  lines.push(...state.admissions.map((record) => record.line));
  lines.push(...state.gaps);
  lines.push(...state.testChanges);
  for (const evidence of receipt.evidence) {
    if (state.evidenceIds.has(evidence.evidence_id)) lines.push(evidenceLine(evidence));
  }
  lines.push(omissionLine(receipt, materialGapCount, state));
  return lines.join("\n");
}

/**
 * Render the bounded machine/agent projection from the same semantically
 * accepted ReceiptV1 used by JSON. Critical detail is considered in canonical
 * priority order and omission totals always reconcile to the full receipt.
 */
export function renderReceiptAgent(
  value: unknown,
  options?: AgentReceiptRenderOptions,
): string {
  const receipt = validateReceiptForAcceptance(value);
  const maxUtf8Bytes = resolveMaxUtf8Bytes(options);
  const materialGaps = receipt.exercise.records.filter(
    (record) => record.state === "NOT_EXERCISED" || record.state === "UNRESOLVED",
  );
  const header = `ASCOUT_AGENT_V1 repo=${encodeAgentFieldValue(receipt.source.start.repository_id)} head=${receipt.source.start.head_sha} stability=${receipt.stability}`;
  const summary = [
    "SUMMARY",
    `completeness=${receipt.summary.completeness}`,
    `exit=${receipt.summary.exit_code}`,
    `tasks=${receipt.tasks.length}`,
    `findings=${receipt.findings.length}`,
    `exercise_gaps=${materialGaps.length}`,
    `test_changes=${receipt.test_changes.length}`,
    `evidence=${receipt.evidence.length}`,
    ...STATUS_ORDER.map((status) => `${status}=${receipt.summary.task_status_counts[status]}`),
  ].join(" ");
  const fixedBytes = utf8Bytes(header) + 1 + utf8Bytes(summary);
  const evidenceById = new Map(receipt.evidence.map((evidence) => [evidence.evidence_id, evidence]));
  const state: ProjectionState = {
    errors: [],
    findings: [],
    admissions: [],
    gaps: [],
    testChanges: [],
    evidenceIds: new Set<string>(),
    representedTaskIds: new Set<string>(),
    retainedFindings: 0,
    retainedGaps: 0,
    retainedTestChanges: 0,
    retainedEvidence: 0,
    lineContributionBytes: 0,
  };

  if (projectionBytes(fixedBytes, receipt, materialGaps.length, state) > maxUtf8Bytes) {
    throw new AgentReceiptBudgetError(maxUtf8Bytes);
  }

  for (const task of receipt.tasks) {
    const candidate = errorCandidate(task, evidenceById);
    if (candidate === null) continue;
    const linkedEvidence = evidenceById.get(candidate.evidenceId)!;
    const pairedAdmission = admissionCandidate(task);
    const changes: SelectionChanges = {
      representedTaskId: task.task_id,
      evidenceId: candidate.evidenceId,
      evidenceLineBytes: lineContributionBytes(evidenceLine(linkedEvidence)),
    };
    const recordBytes =
      lineContributionBytes(candidate.record.line) +
      (pairedAdmission === null ? 0 : lineContributionBytes(pairedAdmission.line));
    if (canAdd(fixedBytes, receipt, materialGaps.length, state, maxUtf8Bytes, recordBytes, changes)) {
      state.errors.push(candidate.record);
      if (pairedAdmission !== null) state.admissions.push(pairedAdmission);
      commitSelection(state, recordBytes, changes);
    }
  }

  for (const finding of receipt.findings) {
    const candidate = findingCandidate(finding, evidenceById);
    if (candidate === null) continue;
    const linkedEvidence = evidenceById.get(candidate.evidenceId)!;
    const changes: SelectionChanges = {
      finding: true,
      evidenceId: candidate.evidenceId,
      evidenceLineBytes: lineContributionBytes(evidenceLine(linkedEvidence)),
    };
    const recordBytes = lineContributionBytes(candidate.record.line);
    if (canAdd(fixedBytes, receipt, materialGaps.length, state, maxUtf8Bytes, recordBytes, changes)) {
      state.findings.push(candidate.record);
      commitSelection(state, recordBytes, changes);
    }
  }

  for (const task of receipt.tasks) {
    if (state.admissions.some((record) => record.taskId === task.task_id)) continue;
    const candidate = admissionCandidate(task);
    if (candidate === null) continue;
    const changes: SelectionChanges = { representedTaskId: task.task_id };
    const recordBytes = lineContributionBytes(candidate.line);
    if (canAdd(fixedBytes, receipt, materialGaps.length, state, maxUtf8Bytes, recordBytes, changes)) {
      state.admissions.push(candidate);
      commitSelection(state, recordBytes, changes);
    }
  }

  for (const gap of materialGaps) {
    const line = gapLine(gap)!;
    const changes: SelectionChanges = { gap: true };
    const recordBytes = lineContributionBytes(line);
    if (canAdd(fixedBytes, receipt, materialGaps.length, state, maxUtf8Bytes, recordBytes, changes)) {
      state.gaps.push(line);
      commitSelection(state, recordBytes, changes);
    }
  }

  for (const change of receipt.test_changes) {
    const line = testChangeLine(change);
    const changes: SelectionChanges = { testChange: true };
    const recordBytes = lineContributionBytes(line);
    if (canAdd(fixedBytes, receipt, materialGaps.length, state, maxUtf8Bytes, recordBytes, changes)) {
      state.testChanges.push(line);
      commitSelection(state, recordBytes, changes);
    }
  }

  for (const evidence of receipt.evidence) {
    if (state.evidenceIds.has(evidence.evidence_id)) continue;
    const changes: SelectionChanges = {
      evidenceId: evidence.evidence_id,
      evidenceLineBytes: lineContributionBytes(evidenceLine(evidence)),
    };
    if (canAdd(fixedBytes, receipt, materialGaps.length, state, maxUtf8Bytes, 0, changes)) {
      commitSelection(state, 0, changes);
    }
  }

  const rendered = renderSelectedProjection(receipt, materialGaps.length, header, summary, state);
  if (utf8Bytes(rendered) > maxUtf8Bytes) {
    throw new Error("agent receipt budget accounting diverged from rendered UTF-8 bytes");
  }
  return rendered;
}
