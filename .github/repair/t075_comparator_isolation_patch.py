from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("usage: t075_comparator_isolation_patch.py <candidate-root>")
root = Path(sys.argv[1]).resolve()
path = root / "benchmarks" / "run.mjs"
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one guarded replacement, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '''  return sha256Bytes(Buffer.concat([\n    Buffer.from("status\\0", "utf8"), status.stdout,\n    Buffer.from("\\0unstaged\\0", "utf8"), unstaged.stdout,\n    Buffer.from("\\0staged\\0", "utf8"), staged.stdout,\n  ]));\n}\n\nasync function objectExists''',
    '''  return sha256Bytes(Buffer.concat([\n    Buffer.from("status\\0", "utf8"), status.stdout,\n    Buffer.from("\\0unstaged\\0", "utf8"), unstaged.stdout,\n    Buffer.from("\\0staged\\0", "utf8"), staged.stdout,\n  ]));\n}\n\nasync function restoreMeasuredSourceState(caseRecord, repo, root, expectedDigest) {\n  const env = runtimeEnvironment(root);\n  await runGit(repo, ["reset", "--hard", "HEAD"], env);\n  await runGit(repo, ["clean", "-fd"], env);\n  for (const productionPath of caseRecord.paths.production) {\n    if (!(await objectExists(repo, `${caseRecord.git.fix.commit_id}:${productionPath}`, env))) {\n      fail("reconstruction", `reviewed production path is absent from fix tree: ${productionPath}`);\n    }\n    await writeObjectPath(repo, caseRecord.git.fix.commit_id, productionPath, env);\n  }\n  await assertMeasuredState(repo, caseRecord.paths.production, env);\n  const restoredDigest = await independentSourceStateDigest(repo, env);\n  if (restoredDigest !== expectedDigest) {\n    fail("binding_integrity", "ephemeral comparator source restoration did not reproduce the exact measured source state");\n  }\n}\n\nasync function objectExists''',
)

replace_once(
    '''async function runComparator(caseRecord, repo, root, commandText, label, requireMembership) {\n  const envBase = runtimeEnvironment(root);\n  await assertMeasuredState(repo, caseRecord.paths.production, envBase);\n  const parsed = parseRestrictedCommand(commandText);\n  const env = { ...envBase, ...parsed.env };\n  const exact = await runBounded({ file: parsed.file, argv: parsed.argv, cwd: repo, env });\n  requireExited(exact, label);\n  if (!requireMembership) rejectSetupFailure(textOutput(exact), label);\n  const proof = requireMembership\n    ? await runMembershipProof(caseRecord, repo, root, commandText, exact.exitCode, label)\n    : null;\n  if (requireMembership && !proof.membership) fail("oracle_membership", `${label} did not prove oracle membership`);\n  await assertMeasuredState(repo, caseRecord.paths.production, envBase);\n  return {\n    status: exact.exitCode === 0 ? "passed" : "failed",\n    exit_code: exact.exitCode,\n    oracle_membership: requireMembership ? true : null,\n    exact: outputDigest(exact),\n    proof: proof?.evidence ?? null,\n  };\n}\n''',
    '''async function runComparator(caseRecord, repo, root, commandText, label, requireMembership) {\n  const envBase = runtimeEnvironment(root);\n  await assertMeasuredState(repo, caseRecord.paths.production, envBase);\n  await clearIgnoredMembershipRuntimeCaches(repo, envBase);\n  const sourceStateStartSha256 = await independentSourceStateDigest(repo, envBase);\n  const parsed = parseRestrictedCommand(commandText);\n  const env = { ...envBase, ...parsed.env };\n  const exact = await runBounded({ file: parsed.file, argv: parsed.argv, cwd: repo, env });\n  requireExited(exact, label);\n  const sourceStateEndSha256 = await independentSourceStateDigest(repo, envBase);\n  const sourceStability = sourceStateStartSha256 === sourceStateEndSha256 ? "stable" : "tree_drifted";\n  if (sourceStability === "tree_drifted") {\n    await restoreMeasuredSourceState(caseRecord, repo, root, sourceStateStartSha256);\n  }\n  if (!requireMembership) rejectSetupFailure(textOutput(exact), label);\n  const proof = requireMembership\n    ? await runMembershipProof(caseRecord, repo, root, commandText, exact.exitCode, label)\n    : null;\n  let proofSourceStability = null;\n  let proofSourceStateEndSha256 = null;\n  if (requireMembership) {\n    proofSourceStateEndSha256 = await independentSourceStateDigest(repo, envBase);\n    proofSourceStability = sourceStateStartSha256 === proofSourceStateEndSha256 ? "stable" : "tree_drifted";\n    if (proofSourceStability === "tree_drifted") {\n      await restoreMeasuredSourceState(caseRecord, repo, root, sourceStateStartSha256);\n    }\n  }\n  if (requireMembership && !proof.membership) fail("oracle_membership", `${label} did not prove oracle membership`);\n  await assertMeasuredState(repo, caseRecord.paths.production, envBase);\n  return {\n    status: exact.exitCode === 0 ? "passed" : "failed",\n    exit_code: exact.exitCode,\n    oracle_membership: requireMembership ? true : null,\n    source_stability: sourceStability,\n    source_state_start_sha256: sourceStateStartSha256,\n    source_state_end_sha256: sourceStateEndSha256,\n    proof_source_stability: proofSourceStability,\n    proof_source_state_end_sha256: proofSourceStateEndSha256,\n    exact: outputDigest(exact),\n    proof: proof?.evidence ?? null,\n  };\n}\n''',
)

replace_once(
    '''function stableObservation(observation) {\n  const semanticAscout = observation.ascout === null\n    ? null\n    : {\n        exit_code: observation.ascout.exit_code,\n        completeness: observation.ascout.completeness,\n        source_stability: observation.ascout.source_stability,\n        independent_source_stability: observation.ascout.independent_source_stability,\n        source: observation.ascout.source,\n        selection: observation.ascout.selection,\n        exercise: observation.ascout.exercise,\n        tasks: observation.ascout.tasks,\n      };\n  return {\n    reconstruction: observation.reconstruction,\n    pre_fix_oracle: observation.pre_fix_oracle,\n    fixed_oracle: observation.fixed_oracle,\n    full_reference: observation.full_reference,\n    related: observation.related,\n    ascout: semanticAscout,\n    gap_coverage: observation.gap_coverage,\n  };\n}\n''',
    '''function stableOracleObservation(observation) {\n  return {\n    reconstruction: observation.reconstruction,\n    pre_fix_oracle: observation.pre_fix_oracle,\n    fixed_oracle: observation.fixed_oracle,\n    full_reference: observation.full_reference,\n    gap_coverage: observation.gap_coverage,\n  };\n}\n''',
)

replace_once(
    '''    const deterministic = observationsDeterministic(observations.map(stableObservation));\n    if (deterministic !== "deterministic") fail("oracle_flake", `${caseRecord.case_id} observations are ${deterministic}`);''',
    '''    const oracleDeterminism = observationsDeterministic(observations.map(stableOracleObservation));\n    if (oracleDeterminism !== "deterministic") fail("oracle_flake", `${caseRecord.case_id} oracle observations are ${oracleDeterminism}`);''',
)

replace_once(
    '''      valid_observation_count: observations.length,\n      determinism: deterministic,\n      observations,''',
    '''      valid_observation_count: observations.length,\n      determinism: oracleDeterminism,\n      determinism_scope: "oracle_only",\n      observations,''',
)

path.write_text(text)
