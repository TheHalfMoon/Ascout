import { canonicalAssuranceSha256V1 } from "../../contracts/canonical-serialization.js";
import type { LogcatEntryV1 } from "./evidence.js";
import {
  MOBILE_COMPLETION_STATES,
  type MobileCompletionState,
} from "./protocol.js";

export const TIMELINE_MAX_EVENTS = 2000 as const;
export const CORRELATION_MAX_ENTRIES = 5000 as const;
export const REPORT_MAX_ARTIFACTS = 1024 as const;

export const TIMELINE_KINDS = [
  "observation",
  "action",
  "checkpoint",
  "incident",
  "recording",
] as const;

export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export interface TimelineEventV1 {
  readonly event_id: string;
  readonly at_step: number;
  readonly kind: TimelineKind;
  readonly ref: string;
}

export type TimelineResult =
  | { readonly ok: true; readonly value: readonly TimelineEventV1[] }
  | { readonly ok: false; readonly reason: string };

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function buildTimelineV1(events: readonly unknown[]): TimelineResult {
  try {
    if (events.length > TIMELINE_MAX_EVENTS) {
      throw new TypeError("timeline exceeds 2000 events");
    }
    const bound: TimelineEventV1[] = [];
    let lastStep = -1;
    for (const event of events) {
      if (typeof event !== "object" || event === null || Array.isArray(event)) {
        throw new TypeError("timeline event must be an object");
      }
      const record = event as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      if (
        keys.length !== 4 ||
        keys[0] !== "at_step" ||
        keys[1] !== "event_id" ||
        keys[2] !== "kind" ||
        keys[3] !== "ref"
      ) {
        throw new TypeError("timeline event must contain exactly event_id, at_step, kind, ref");
      }
      if (
        typeof record["at_step"] !== "number" ||
        !Number.isInteger(record["at_step"]) ||
        (record["at_step"] as number) < 0
      ) {
        throw new TypeError("at_step must be a non-negative integer");
      }
      const at_step = record["at_step"] as number;
      if (at_step < lastStep) {
        throw new TypeError("timeline must be non-decreasing in at_step");
      }
      lastStep = at_step;
      if (
        typeof record["kind"] !== "string" ||
        !(TIMELINE_KINDS as readonly string[]).includes(record["kind"])
      ) {
        throw new TypeError("timeline kind unknown");
      }
      if (typeof record["event_id"] !== "string" || !OPAQUE_ID.test(record["event_id"])) {
        throw new TypeError("event_id must be an opaque id");
      }
      if (typeof record["ref"] !== "string" || !OPAQUE_ID.test(record["ref"])) {
        throw new TypeError("ref must be an opaque id");
      }
      bound.push({
        event_id: record["event_id"] as string,
        at_step,
        kind: record["kind"] as TimelineKind,
        ref: record["ref"] as string,
      });
    }
    return { ok: true, value: bound };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "timeline refused",
    };
  }
}

const THREADTIME = /^\d{2}:\d{2}:\d{2}\.\d{3}$/u;

export interface LogcatCorrelationV1 {
  readonly entries: readonly LogcatEntryV1[];
  readonly counts: Record<"V" | "D" | "I" | "W" | "E" | "F", number>;
  readonly truncated: boolean;
}

export type CorrelationResult =
  | { readonly ok: true; readonly value: LogcatCorrelationV1 }
  | { readonly ok: false; readonly reason: string };

export function correlateLogcatWindowV1(
  entries: readonly LogcatEntryV1[],
  startTime: unknown,
  endTime: unknown,
): CorrelationResult {
  try {
    if (typeof startTime !== "string" || !THREADTIME.test(startTime)) {
      throw new TypeError("startTime must be threadtime HH:MM:SS.mmm");
    }
    if (typeof endTime !== "string" || !THREADTIME.test(endTime)) {
      throw new TypeError("endTime must be threadtime HH:MM:SS.mmm");
    }
    if (startTime > endTime) {
      throw new TypeError("correlation window is inverted");
    }
    const counts: Record<"V" | "D" | "I" | "W" | "E" | "F", number> = {
      V: 0,
      D: 0,
      I: 0,
      W: 0,
      E: 0,
      F: 0,
    };
    const selected: LogcatEntryV1[] = [];
    let truncated = false;
    for (const entry of entries) {
      if (entry.time < startTime || entry.time > endTime) continue;
      if (selected.length >= CORRELATION_MAX_ENTRIES) {
        truncated = true;
        continue;
      }
      if (
        entry.priority === "V" ||
        entry.priority === "D" ||
        entry.priority === "I" ||
        entry.priority === "W" ||
        entry.priority === "E" ||
        entry.priority === "F"
      ) {
        counts[entry.priority] += 1;
      }
      selected.push(entry);
    }
    return { ok: true, value: { entries: selected, counts, truncated } };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "correlation refused",
    };
  }
}

export interface RetentionArtifactV1 {
  readonly artifact_id: string;
  readonly byte_length: number;
}

export interface RetentionV1 {
  readonly kept: readonly string[];
  readonly evicted: readonly string[];
  readonly kept_bytes: number;
}

export type RetentionResult =
  | { readonly ok: true; readonly value: RetentionV1 }
  | { readonly ok: false; readonly reason: string };

export function applyRetentionV1(
  artifacts: readonly unknown[],
  maxBytes: number,
  maxCount: number,
): RetentionResult {
  try {
    if (!Number.isInteger(maxBytes) || maxBytes < 1) {
      throw new TypeError("maxBytes must be a positive integer");
    }
    if (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > REPORT_MAX_ARTIFACTS) {
      throw new TypeError("maxCount must be an integer 1..1024");
    }
    const normalized: RetentionArtifactV1[] = [];
    for (const artifact of artifacts) {
      if (typeof artifact !== "object" || artifact === null || Array.isArray(artifact)) {
        throw new TypeError("retention artifact must be an object");
      }
      const record = artifact as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      if (
        keys.length !== 2 ||
        keys[0] !== "artifact_id" ||
        keys[1] !== "byte_length"
      ) {
        throw new TypeError("retention artifact must contain exactly artifact_id and byte_length");
      }
      if (typeof record["artifact_id"] !== "string" || !OPAQUE_ID.test(record["artifact_id"])) {
        throw new TypeError("artifact_id must be an opaque id");
      }
      if (
        typeof record["byte_length"] !== "number" ||
        !Number.isInteger(record["byte_length"]) ||
        (record["byte_length"] as number) < 0
      ) {
        throw new TypeError("byte_length must be a non-negative integer");
      }
      normalized.push({
        artifact_id: record["artifact_id"] as string,
        byte_length: record["byte_length"] as number,
      });
    }
    const kept: string[] = [];
    const evicted: string[] = [];
    let kept_bytes = 0;
    for (let index = normalized.length - 1; index >= 0; index -= 1) {
      const entry = normalized[index] as RetentionArtifactV1;
      if (
        kept.length < maxCount &&
        kept_bytes + entry.byte_length <= maxBytes
      ) {
        kept.unshift(entry.artifact_id);
        kept_bytes += entry.byte_length;
      } else {
        evicted.unshift(entry.artifact_id);
      }
    }
    return { ok: true, value: { kept, evicted, kept_bytes } };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "retention refused",
    };
  }
}

export interface DiagnosticArtifactV1 {
  readonly artifact_id: string;
  readonly kind: string;
  readonly sha256: string;
  readonly byte_length: number;
}

export interface DiagnosticReportV1 {
  readonly protocol_version: 1;
  readonly run_id: string;
  readonly completion_state: MobileCompletionState;
  readonly timeline_digest: string;
  readonly event_count: number;
  readonly logcat_entries: number;
  readonly logcat_truncated: boolean;
  readonly artifacts: readonly DiagnosticArtifactV1[];
  readonly retention: RetentionV1;
}

export type DiagnosticReportResult =
  | { readonly ok: true; readonly value: DiagnosticReportV1 }
  | { readonly ok: false; readonly reason: string };

const SHA256_HEX = /^[a-f0-9]{64}$/u;

export function buildDiagnosticReportV1(input: {
  readonly run_id: unknown;
  readonly completion_state: unknown;
  readonly timeline: readonly TimelineEventV1[];
  readonly logcat: LogcatCorrelationV1;
  readonly artifacts: readonly unknown[];
  readonly retention: RetentionV1;
}): DiagnosticReportResult {
  try {
    if (typeof input.run_id !== "string" || !OPAQUE_ID.test(input.run_id)) {
      throw new TypeError("run_id must be an opaque id");
    }
    if (
      typeof input.completion_state !== "string" ||
      !(MOBILE_COMPLETION_STATES as readonly string[]).includes(input.completion_state)
    ) {
      throw new TypeError("completion_state must be canonical");
    }
    const validated: DiagnosticArtifactV1[] = [];
    if (input.artifacts.length > REPORT_MAX_ARTIFACTS) {
      throw new TypeError("artifact bound exceeded");
    }
    for (const artifact of input.artifacts) {
      if (typeof artifact !== "object" || artifact === null || Array.isArray(artifact)) {
        throw new TypeError("artifact must be an object");
      }
      const record = artifact as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      if (
        keys.length !== 4 ||
        keys[0] !== "artifact_id" ||
        keys[1] !== "byte_length" ||
        keys[2] !== "kind" ||
        keys[3] !== "sha256"
      ) {
        throw new TypeError("artifact must contain exactly artifact_id, kind, sha256, byte_length");
      }
      if (typeof record["artifact_id"] !== "string" || !OPAQUE_ID.test(record["artifact_id"])) {
        throw new TypeError("artifact_id must be an opaque id");
      }
      if (typeof record["kind"] !== "string" || !OPAQUE_ID.test(record["kind"])) {
        throw new TypeError("artifact kind must be an opaque id");
      }
      if (typeof record["sha256"] !== "string" || !SHA256_HEX.test(record["sha256"])) {
        throw new TypeError("artifact sha256 must be hex");
      }
      if (
        typeof record["byte_length"] !== "number" ||
        !Number.isInteger(record["byte_length"]) ||
        (record["byte_length"] as number) < 0
      ) {
        throw new TypeError("artifact byte_length must be a non-negative integer");
      }
      validated.push({
        artifact_id: record["artifact_id"] as string,
        kind: record["kind"] as string,
        sha256: record["sha256"] as string,
        byte_length: record["byte_length"] as number,
      });
    }
    return {
      ok: true,
      value: Object.freeze({
        protocol_version: 1,
        run_id: input.run_id as string,
        completion_state: input.completion_state as MobileCompletionState,
        timeline_digest: canonicalAssuranceSha256V1(input.timeline),
        event_count: input.timeline.length,
        logcat_entries: input.logcat.entries.length,
        logcat_truncated: input.logcat.truncated,
        artifacts: validated,
        retention: input.retention,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "diagnostic report refused",
    };
  }
}
