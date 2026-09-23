import type { NormalizedReviewRecordV1 } from "./finding-normalization.js";
import { FINDING_NORMALIZATION_SCHEMA_VERSION } from "./finding-normalization.js";

export const DEDUP_CORRELATION_SCHEMA_VERSION = 1 as const;

export interface CorrelationClusterV1 {
  readonly cluster_id: string;
  readonly correlation_key: string;
  readonly rationale: string;
  readonly member_record_ids: readonly string[];
  readonly members: readonly NormalizedReviewRecordV1[];
  readonly member_count: number;
}

export interface CorrelationResultV1 {
  readonly schema_version: 1;
  readonly clusters: readonly CorrelationClusterV1[];
  readonly cluster_count: number;
  readonly record_count: number;
}

export interface CorrelationCheckV1 {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function correlationKeyForRecordV1(
  record: NormalizedReviewRecordV1,
): string {
  const location = record.observation.location_hint;
  const locationKey =
    location === null
      ? "NO_LOCATION"
      : location.path +
        ":" +
        (location.start_line === null ? "" : String(location.start_line)) +
        "-" +
        (location.end_line === null ? "" : String(location.end_line));
  return locationKey + "|" + record.observation.category_hint;
}

export function assertCorrelatableRecordsV1(
  records: readonly NormalizedReviewRecordV1[],
): CorrelationCheckV1 {
  const reasons: string[] = [];
  if (!Array.isArray(records)) {
    return { ok: false, reasons: ["records not a list"] };
  }
  const seen = new Set<string>();
  for (const record of records) {
    if (
      typeof record !== "object" ||
      record === null ||
      record.schema_version !== FINDING_NORMALIZATION_SCHEMA_VERSION
    ) {
      reasons.push("member record schema invalid");
      break;
    }
    if (typeof record.record_id !== "string" || !OPAQUE_ID.test(record.record_id)) {
      reasons.push("member record id invalid");
      break;
    }
    if (seen.has(record.record_id)) {
      reasons.push("duplicate record id: " + record.record_id);
      break;
    }
    seen.add(record.record_id);
    if (typeof record.observation !== "object" || record.observation === null) {
      reasons.push("member observation missing: " + record.record_id);
      break;
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export function correlateReviewRecordsV1(
  records: readonly NormalizedReviewRecordV1[],
): CorrelationResultV1 {
  const check = assertCorrelatableRecordsV1(records);
  if (!check.ok) {
    throw new TypeError(
      "invalid correlation input: " + check.reasons.join("; "),
    );
  }
  const byKey = new Map<string, NormalizedReviewRecordV1[]>();
  for (const record of records) {
    const key = correlationKeyForRecordV1(record);
    const group = byKey.get(key);
    if (group === undefined) {
      byKey.set(key, [record]);
    } else {
      group.push(record);
    }
  }
  const clusters: CorrelationClusterV1[] = [...byKey.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, members]) => {
      const sorted = [...members].sort((a, b) =>
        a.record_id < b.record_id ? -1 : a.record_id > b.record_id ? 1 : 0,
      );
      const head = sorted[0];
      if (head === undefined) {
        throw new TypeError("correlation group is empty");
      }
      const memberIds = Object.freeze(
        sorted.map((member) => member.record_id),
      );
      const rationale =
        sorted.length === 1
          ? "singleton: no duplicate shares correlation key " + key
          : "grouped " +
            sorted.length +
            " independent records sharing correlation key " +
            key +
            "; member evidence preserved verbatim, nothing merged or dropped";
      return Object.freeze({
        cluster_id: "cluster:" + head.record_id,
        correlation_key: key,
        rationale,
        member_record_ids: memberIds,
        members: Object.freeze([...sorted]),
        member_count: sorted.length,
      });
    });
  return Object.freeze({
    schema_version: DEDUP_CORRELATION_SCHEMA_VERSION,
    clusters: Object.freeze(clusters),
    cluster_count: clusters.length,
    record_count: records.length,
  });
}
