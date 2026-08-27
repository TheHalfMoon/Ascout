import { isAbsolute, resolve } from "node:path";

import {
  constructReceiptPathCandidateFromHostPath,
  type FindingV1,
} from "./receipt/model.js";

export type TestObservationOutcome = "passed" | "failed";

export interface TestAssertionObservation {
  readonly path: string;
  readonly fullName: string;
  readonly outcome: TestObservationOutcome;
  readonly evidenceId: string;
}

export interface NormalizedTestReproduction {
  readonly runs: number;
  readonly failures: number;
  readonly reproduced: true | false | "unknown";
  readonly determinismClass: "deterministic" | "nondeterministic" | "unknown";
  readonly flaky: boolean;
}

export interface FailingTestIdentity {
  readonly path: string;
  readonly fullName: string;
}

const CANONICAL_REPOSITORY_PATH =
  /^(?!\/)(?![A-Za-z]:)(?![A-Za-z][A-Za-z0-9+.-]*:)(?![.]{1,2}(?:\/|$))(?!.+\/[.]{1,2}(?:\/|$))[^/\\]+(?:\/[^/\\]+)*$/u;

function repositoryPathFromMachineName(repositoryRoot: string, machineName: string): string | null {
  if (machineName.length === 0 || machineName.includes("\0")) return null;
  const hostPath = isAbsolute(machineName) ? machineName : resolve(repositoryRoot, machineName);
  const candidate = constructReceiptPathCandidateFromHostPath("repository", repositoryRoot, hostPath);
  return CANONICAL_REPOSITORY_PATH.test(candidate.original_spelling)
    ? candidate.original_spelling
    : null;
}

/**
 * Parses only exact pass/fail assertion observations from the Jest-compatible
 * machine-result shape emitted by the supported Vitest/Jest integrations.
 * Unknown/skipped/todo assertions are ignored rather than guessed.
 */
export function parseTestAssertionObservations(
  repositoryRoot: string,
  text: string,
  evidenceId: string,
): readonly TestAssertionObservation[] {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return [];
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  const suites = (value as { readonly testResults?: unknown }).testResults;
  if (!Array.isArray(suites)) return [];

  const observations: TestAssertionObservation[] = [];
  for (const suiteValue of suites) {
    if (typeof suiteValue !== "object" || suiteValue === null || Array.isArray(suiteValue)) continue;
    const suite = suiteValue as { readonly name?: unknown; readonly assertionResults?: unknown };
    if (typeof suite.name !== "string" || !Array.isArray(suite.assertionResults)) continue;
    const path = repositoryPathFromMachineName(repositoryRoot, suite.name);
    if (path === null) continue;

    for (const assertionValue of suite.assertionResults) {
      if (typeof assertionValue !== "object" || assertionValue === null || Array.isArray(assertionValue)) continue;
      const assertion = assertionValue as { readonly fullName?: unknown; readonly status?: unknown };
      if (typeof assertion.fullName !== "string" || assertion.fullName.length === 0 || assertion.fullName.includes("\0")) continue;
      if (assertion.status !== "passed" && assertion.status !== "failed") continue;
      observations.push({
        path,
        fullName: assertion.fullName,
        outcome: assertion.status,
        evidenceId,
      });
    }
  }
  return observations;
}

export function normalizeTestReproduction(
  outcomes: readonly TestObservationOutcome[],
): NormalizedTestReproduction {
  const runs = outcomes.length;
  const failures = outcomes.filter((outcome) => outcome === "failed").length;
  if (runs < 2) {
    return {
      runs,
      failures,
      reproduced: "unknown",
      determinismClass: "unknown",
      flaky: false,
    };
  }
  if (failures === runs) {
    return {
      runs,
      failures,
      reproduced: true,
      determinismClass: "deterministic",
      flaky: false,
    };
  }
  if (failures > 0) {
    return {
      runs,
      failures,
      reproduced: false,
      determinismClass: "nondeterministic",
      flaky: true,
    };
  }
  return {
    runs,
    failures,
    reproduced: "unknown",
    determinismClass: "unknown",
    flaky: false,
  };
}

export function failingTestIdentities(
  observations: readonly TestAssertionObservation[],
): readonly FailingTestIdentity[] {
  const identities = new Map<string, FailingTestIdentity>();
  for (const observation of observations) {
    if (observation.outcome !== "failed") continue;
    const key = `${observation.path}\u0000${observation.fullName}`;
    identities.set(key, { path: observation.path, fullName: observation.fullName });
  }
  return [...identities.values()].sort((left, right) =>
    left.path.localeCompare(right.path) || left.fullName.localeCompare(right.fullName)
  );
}

export function observationsForIdentity(
  observations: readonly TestAssertionObservation[],
  identity: FailingTestIdentity,
): readonly TestAssertionObservation[] {
  return observations.filter((observation) =>
    observation.path === identity.path && observation.fullName === identity.fullName
  );
}

export function buildNormalizedTestFinding(
  index: number,
  producer: "vitest" | "jest",
  identity: FailingTestIdentity,
  observations: readonly TestAssertionObservation[],
): FindingV1 {
  const normalized = normalizeTestReproduction(observations.map(({ outcome }) => outcome));
  return {
    finding_id: `test.finding.${index + 1}`,
    task_id: "test",
    producer,
    rule_or_test_id: identity.fullName,
    message: `Test failed: ${identity.fullName}`,
    path: identity.path,
    severity: "unknown",
    in_changed_lines: null,
    introduced_by_change: "unknown",
    determinism_class: normalized.determinismClass,
    observations: { runs: normalized.runs, failures: normalized.failures },
    reproduced: normalized.reproduced,
    fingerprint_version: null,
    fingerprint: null,
    evidence_ids: [...new Set(observations.map(({ evidenceId }) => evidenceId))],
  };
}

/**
 * Aggregate task FLAKY is safe only when every currently failing exact test is
 * contradictory. Any stable or still-unknown failure keeps the task FAIL.
 */
export function normalizedAggregateTestStatus(
  findings: readonly FindingV1[],
): "FAIL" | "FLAKY" {
  return findings.length > 0 && findings.every((finding) =>
    finding.reproduced === false && finding.determinism_class === "nondeterministic"
  )
    ? "FLAKY"
    : "FAIL";
}
