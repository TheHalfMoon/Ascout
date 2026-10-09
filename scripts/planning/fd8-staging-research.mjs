/**
 * Research-only FD8 link-staging budget simulation.
 * No repository writes, source transformation, approval, or merge authority.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runPinnedFd8Audit } from "./audit-fd8-root.mjs";

const SHA = /^[a-f0-9]{40}$/u;
const MAX_FILES = 12;
const MAX_ADDED = 400;
const STUB_BATCH = 11;
const SAFE_PATH = /^docs\/strategy\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.md$/u;

function fail(reason) {
  throw new TypeError("FD8 staging research refused: " + reason);
}

/**
 * Simulate *prospective* diff sizes for path stubs, then replacement grains.
 * The simulation cannot certify Markdown anchors, ID references, actual Git
 * replacement diffs, source blob identity, CI, governance, or external review.
 */
export function simulateFd8Staging(manifest, audit) {
  if (manifest?.schema !== "ascout.fd8.reslice-manifest/v1" ||
      manifest.review_state !== "NOT_RATIFIED" ||
      !SHA.test(manifest.base_head ?? "") ||
      !SHA.test(manifest.source_head ?? "") ||
      !Array.isArray(manifest.groups) || manifest.groups.length < 2 ||
      manifest.groups.length > 64) fail("untrusted or effective manifest");
  if (audit?.schema !== "ascout.fd8.reslice-audit/v1" ||
      audit.base_head !== manifest.base_head ||
      audit.source_head !== manifest.source_head ||
      audit.state !== "BLOCKED_FORWARD_LINKS" ||
      !Array.isArray(audit.errors) || audit.errors.length ||
      !Array.isArray(audit.missingLinks) || audit.missingLinks.length ||
      !audit.dependencyGraph?.has_cycle ||
      !Array.isArray(audit.groups) ||
      audit.groups.length !== manifest.groups.length) {
    fail("pinned audit not a clean-source link-order blocker");
  }

  const paths = [];
  const seen = new Set();
  let totalAdded = 0;
  for (let i = 0; i < manifest.groups.length; i++) {
    const group = manifest.groups[i];
    const measured = audit.groups[i];
    if (group?.id !== "FD8-B-R" + (i + 1) ||
        measured?.id !== group.id ||
        !Array.isArray(group.files) || group.files.length < 1 ||
        group.files.length > MAX_FILES ||
        measured.files !== group.files.length ||
        !Number.isSafeInteger(measured.added) || measured.added < 0 ||
        measured.added > MAX_ADDED) fail("invalid or oversized source grain " + i);
    totalAdded += measured.added;
    for (const p of group.files) {
      if (typeof p !== "string" || !SAFE_PATH.test(p) ||
          p.includes("..") || seen.has(p)) fail("duplicate or unsafe path");
      seen.add(p);
      paths.push(p);
    }
  }
  if (audit.counts?.source_files !== paths.length ||
      audit.counts?.mapped_files !== paths.length ||
      audit.counts?.source_added !== totalAdded) {
    fail("manifest and actual pinned-source diff disagree");
  }

  const existingSourcePaths = audit.existingSourcePaths;
  if (!Array.isArray(existingSourcePaths) ||
      new Set(existingSourcePaths).size !== existingSourcePaths.length ||
      existingSourcePaths.some(p => typeof p !== "string" || !seen.has(p))) {
    fail("base-present source paths are missing or invalid");
  }
  // Never replace an existing canonical document with an incomplete stub.
  const alreadyExists = new Set(existingSourcePaths);
  const stubPaths = paths.filter(p => !alreadyExists.has(p));
  const steps = [];
  for (let start = 0; start < stubPaths.length; start += STUB_BATCH) {
    const batch = stubPaths.slice(start, start + STUB_BATCH);
    steps.push({
      kind: "PROPOSED_STUB_PATHS_ONLY",
      paths: batch,
      changed_files: batch.length,
      projected_added_lines: batch.length,
      materialized_source_files: 0,
      non_effective: true,
      merge_authorized: false,
    });
  }

  let materialized = 0;
  // Defer changes to pre-existing canonical files until after all new paths
  // have received their exact source bytes, even when groups are cyclic.
  const order = manifest.groups.map((_, i) => i).sort((a, b) => {
    const hasExisting = i => manifest.groups[i].files.some(p => alreadyExists.has(p));
    return Number(hasExisting(a)) - Number(hasExisting(b)) || a - b;
  });
  for (const i of order) {
    const group = manifest.groups[i];
    const added = audit.groups[i].added;
    materialized += group.files.length;
    steps.push({
      kind: "PROPOSED_EXACT_SOURCE_REPLACEMENT",
      group: group.id,
      paths: [...group.files],
      changed_files: group.files.length,
      projected_added_lines: added,
      materialized_source_files: materialized,
      non_effective: true,
      merge_authorized: false,
    });
  }
  if (steps.some(x => x.changed_files > MAX_FILES ||
      x.projected_added_lines > MAX_ADDED)) fail("prospective Diffcipline budget");
  return {
    schema: "ascout.fd8.staging-research/v1",
    status: "SIMULATED_ONLY_BLOCKED_GOVERNANCE",
    base_head: manifest.base_head,
    source_head: manifest.source_head,
    original_files: paths.length,
    source_paths_preexisting_at_base: [...existingSourcePaths],
    new_paths_needing_stubs: stubPaths.length,
    original_added_lines: totalAdded,
    source_group_cycle: audit.dependencyGraph.cyclic_components,
    projected_steps: steps,
    notes: [
      "All stubs remain INCOMPLETE / NOT_EFFECTIVE until every exact source blob is materialized and independently verified.",
      "Added-line counts are projected; each actual stub replacement diff must be checked against 12 files / 400 added lines.",
      "Plain Markdown path presence does not establish anchor or referenced-identifier validity.",
      "Existing verifier and CI compatibility for stub phases is unknown and must not be weakened.",
      "This model does not authorize any founder decision, PR merge, product execution, or independent-review claim.",
    ],
    checks_not_run: [
      "REAL_INTERMEDIATE_GIT_DIFFS",
      "INTERMEDIATE_MARKDOWN_AND_ID_VERIFIER",
      "SOURCE_BLOB_EQUALITY_AFTER_REPLACEMENT",
      "GOVERNANCE_ADMISSION",
      "INDEPENDENT_ALIBABA_OCR_OR_HUMAN_REVIEW",
      "POST_MERGE_CI",
    ],
    founder_decision: "PENDING",
    merge_authorized: false,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const manifestPath = process.argv[2] ??
      fileURLToPath(new URL("./fd8-root-manifest.json", import.meta.url));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const audit = runPinnedFd8Audit(manifestPath);
    console.log(JSON.stringify(simulateFd8Staging(manifest, audit), null, 2));
    // Intentionally nonzero: a research simulation is NEVER merge-qualified.
    process.exitCode = 2;
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 3;
  }
}
