import {
  MOBILE_COMPLETION_STATES,
  type MobileCompletionState,
} from "./protocol.js";

export const QUALIFICATION_HOST_OS = ["linux", "darwin", "windows"] as const;

export type QualificationHostOs = (typeof QUALIFICATION_HOST_OS)[number];

export const QUALIFICATION_HOST_ARCH = ["x64", "arm64"] as const;

export type QualificationHostArch = (typeof QUALIFICATION_HOST_ARCH)[number];

export const QUALIFICATION_DEVICES = ["EMULATOR", "PHYSICAL_ANDROID"] as const;

export type QualificationDevice = (typeof QUALIFICATION_DEVICES)[number];

export const QUALIFICATION_BACKENDS = ["ACCESSIBILITY_HELPER", "UIAUTOMATOR"] as const;

export type QualificationBackend = (typeof QUALIFICATION_BACKENDS)[number];

const UNDECIDED_STATES: readonly string[] = [
  "INCOMPLETE",
  "INCONCLUSIVE",
  "NOT_RUN",
  "UNKNOWN",
];

export interface QualificationCellV1 {
  readonly host_os: QualificationHostOs;
  readonly host_arch: QualificationHostArch;
  readonly device_target: QualificationDevice;
  readonly backend: QualificationBackend;
  readonly state: MobileCompletionState;
  readonly evidence_refs: readonly string[];
  readonly reason: string;
}

export interface QualificationMatrixV1 {
  readonly cells: readonly QualificationCellV1[];
}

export type MatrixResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function cellKey(cell: QualificationCellV1): string {
  return (
    cell.host_os + "/" + cell.host_arch + "/" + cell.device_target + "/" + cell.backend
  );
}

function parseCell(value: unknown): QualificationCellV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("cell must be an object");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const wanted = [
    "backend",
    "device_target",
    "evidence_refs",
    "host_arch",
    "host_os",
    "reason",
    "state",
  ];
  if (keys.length !== wanted.length || !wanted.every((key, index) => key === keys[index])) {
    throw new TypeError("cell must contain exactly the coordinate, state, evidence, and reason keys");
  }
  if (
    typeof record["host_os"] !== "string" ||
    !(QUALIFICATION_HOST_OS as readonly string[]).includes(record["host_os"])
  ) {
    throw new TypeError("host_os unknown");
  }
  if (
    typeof record["host_arch"] !== "string" ||
    !(QUALIFICATION_HOST_ARCH as readonly string[]).includes(record["host_arch"])
  ) {
    throw new TypeError("host_arch unknown");
  }
  if (
    typeof record["device_target"] !== "string" ||
    !(QUALIFICATION_DEVICES as readonly string[]).includes(record["device_target"])
  ) {
    throw new TypeError("device_target unknown");
  }
  if (
    typeof record["backend"] !== "string" ||
    !(QUALIFICATION_BACKENDS as readonly string[]).includes(record["backend"])
  ) {
    throw new TypeError("backend unknown");
  }
  if (
    typeof record["state"] !== "string" ||
    !(MOBILE_COMPLETION_STATES as readonly string[]).includes(record["state"])
  ) {
    throw new TypeError("cell state must be canonical");
  }
  const state = record["state"] as MobileCompletionState;
  if (!Array.isArray(record["evidence_refs"]) || (record["evidence_refs"] as unknown[]).length > 64) {
    throw new TypeError("evidence_refs must be an array of at most 64 refs");
  }
  const evidence_refs: string[] = [];
  for (const ref of record["evidence_refs"] as unknown[]) {
    if (typeof ref !== "string" || !OPAQUE_ID.test(ref)) {
      throw new TypeError("evidence ref must be an opaque id");
    }
    evidence_refs.push(ref);
  }
  if (typeof record["reason"] !== "string" || (record["reason"] as string).length > 512) {
    throw new TypeError("reason must be a string of at most 512 chars");
  }
  const reason = record["reason"] as string;
  if (state === "PASS" && evidence_refs.length === 0) {
    throw new TypeError("PASS requires at least one evidence ref");
  }
  if (state === "NOT_RUN" && reason.length === 0) {
    throw new TypeError("NOT_RUN requires a reason");
  }
  return {
    host_os: record["host_os"] as QualificationHostOs,
    host_arch: record["host_arch"] as QualificationHostArch,
    device_target: record["device_target"] as QualificationDevice,
    backend: record["backend"] as QualificationBackend,
    state,
    evidence_refs,
    reason,
  };
}

export function buildQualificationMatrixV1(cells: readonly unknown[]): MatrixResult<QualificationMatrixV1> {
  try {
    if (cells.length > 256) throw new TypeError("matrix exceeds 256 cells");
    const bound: QualificationCellV1[] = [];
    const seen = new Set<string>();
    for (const cell of cells) {
      const parsed = parseCell(cell);
      const key = cellKey(parsed);
      if (seen.has(key)) throw new TypeError("duplicate cell coordinate " + key);
      seen.add(key);
      bound.push(parsed);
    }
    return { ok: true, value: { cells: bound } };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "matrix refused",
    };
  }
}

export function recordQualificationCellV1(
  matrix: QualificationMatrixV1,
  cell: unknown,
): MatrixResult<QualificationMatrixV1> {
  try {
    const parsed = parseCell(cell);
    const key = cellKey(parsed);
    for (const existing of matrix.cells) {
      if (cellKey(existing) === key) {
        throw new TypeError("cell coordinate already recorded " + key);
      }
    }
    return { ok: true, value: { cells: [...matrix.cells, parsed] } };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "cell refused",
    };
  }
}

export interface MatrixSummaryV1 {
  readonly total: number;
  readonly by_state: Record<string, number>;
  readonly ready: boolean;
}

export function summarizeMatrixV1(matrix: QualificationMatrixV1): MatrixSummaryV1 {
  const by_state: Record<string, number> = {};
  for (const state of MOBILE_COMPLETION_STATES) {
    by_state[state] = 0;
  }
  let ready = true;
  for (const cell of matrix.cells) {
    by_state[cell.state] = (by_state[cell.state] as number) + 1;
    if ((UNDECIDED_STATES as readonly string[]).includes(cell.state)) {
      ready = false;
    }
  }
  return { total: matrix.cells.length, by_state, ready };
}

export interface HostCapabilitiesV1 {
  readonly host_os: string;
  readonly host_arch: string;
  readonly node_version: string;
  readonly matches_matrix_os: boolean;
  readonly matches_matrix_arch: boolean;
}

export function probeHostCapabilitiesV1(): HostCapabilitiesV1 {
  const host_os = process.platform;
  const host_arch = process.arch;
  const node_version = process.version;
  return {
    host_os,
    host_arch,
    node_version,
    matches_matrix_os: (QUALIFICATION_HOST_OS as readonly string[]).includes(host_os),
    matches_matrix_arch: (QUALIFICATION_HOST_ARCH as readonly string[]).includes(host_arch),
  };
}
