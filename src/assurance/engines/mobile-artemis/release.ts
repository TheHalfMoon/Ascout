import { assertDonorTelemetryOffV1 } from "./hardening.js";
import { MOBILE_ARTEMIS_DONOR_SHA } from "./descriptor.js";

export const RELEASE_PHASES = [
  "a0",
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "a6",
  "a7",
  "a8",
  "a9",
  "a10",
  "a11",
  "a12",
] as const;

export type ReleasePhase = (typeof RELEASE_PHASES)[number];

const RELEASE_PHASE_LIST: readonly ReleasePhase[] = RELEASE_PHASES;

export interface ReleaseCloseoutsV1 {
  readonly a0: string;
  readonly a1: string;
  readonly a2: string;
  readonly a3: string;
  readonly a4: string;
  readonly a5: string;
  readonly a6: string;
  readonly a7: string;
  readonly a8: string;
  readonly a9: string;
  readonly a10: string;
  readonly a11: string;
  readonly a12: string;
}

export interface ReleaseCiV1 {
  readonly head_sha: string;
  readonly project_ci_six_of_six: boolean;
  readonly self_verification: boolean;
}

export interface ReleaseReviewsV1 {
  readonly jev_pass: boolean;
  readonly alibaba_ocr_pass: boolean;
  readonly unresolved_material_findings: number;
}

export interface ReleaseCandidateV1 {
  readonly donor_sha: string;
  readonly provenance_ref: string;
  readonly license_identity: string;
  readonly donor_config: unknown;
  readonly closeouts: Record<string, unknown>;
  readonly clean_checkout: boolean;
  readonly ci: {
    readonly head_sha: unknown;
    readonly project_ci_six_of_six: unknown;
    readonly self_verification: unknown;
  };
  readonly reviews: {
    readonly jev_pass: unknown;
    readonly alibaba_ocr_pass: unknown;
    readonly unresolved_material_findings: unknown;
  };
  readonly device_matrix_ready: boolean;
}

export interface ReleaseAdmissionV1 {
  readonly admitted: boolean;
  readonly reasons: readonly string[];
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const GIT_SHA_HEX = /^[a-f0-9]{40}$/u;

export function admitReleaseV1(candidate: ReleaseCandidateV1): ReleaseAdmissionV1 {
  const reasons: string[] = [];
  if (candidate.donor_sha !== MOBILE_ARTEMIS_DONOR_SHA) {
    reasons.push("donor sha mismatch");
  }
  if (
    typeof candidate.provenance_ref !== "string" ||
    !OPAQUE_ID.test(candidate.provenance_ref)
  ) {
    reasons.push("provenance ref invalid");
  }
  if (candidate.license_identity !== "license:apache-2.0") {
    reasons.push("license identity mismatch");
  }
  const telemetry = assertDonorTelemetryOffV1(candidate.donor_config);
  if (!telemetry.ok) {
    reasons.push("donor telemetry not off: " + telemetry.reason);
  }
  const closeouts = candidate.closeouts;
  for (const phase of RELEASE_PHASE_LIST) {
    const ref = closeouts[phase];
    if (typeof ref !== "string" || !OPAQUE_ID.test(ref)) {
      reasons.push("phase " + phase + " closeout missing");
    }
  }
  if (candidate.clean_checkout !== true) {
    reasons.push("checkout not clean");
  }
  if (
    typeof candidate.ci.head_sha !== "string" ||
    !GIT_SHA_HEX.test(candidate.ci.head_sha)
  ) {
    reasons.push("ci head sha invalid");
  }
  if (candidate.ci.project_ci_six_of_six !== true) {
    reasons.push("project ci not six of six");
  }
  if (candidate.ci.self_verification !== true) {
    reasons.push("self verification not passing");
  }
  if (candidate.reviews.jev_pass !== true) {
    reasons.push("jev review not passing");
  }
  if (candidate.reviews.alibaba_ocr_pass !== true) {
    reasons.push("alibaba review not passing");
  }
  if (
    typeof candidate.reviews.unresolved_material_findings !== "number" ||
    !Number.isInteger(candidate.reviews.unresolved_material_findings) ||
    (candidate.reviews.unresolved_material_findings as number) !== 0
  ) {
    reasons.push("unresolved material findings remain");
  }
  if (candidate.device_matrix_ready !== true) {
    reasons.push("device matrix not ready");
  }
  return { admitted: reasons.length === 0, reasons };
}
