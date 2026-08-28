from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("usage: t075_tanstack_package_suite_patch.py <candidate-root>")
root = Path(sys.argv[1]).resolve()
path = root / "benchmarks" / "manifest.json"
manifest = json.loads(path.read_text())
if manifest.get("manifest_revision") != 10:
    raise SystemExit(f"expected manifest revision 10, got {manifest.get('manifest_revision')}")
case = next((item for item in manifest.get("cases", []) if item.get("case_id") == "tanstack-streamed-query-reducer"), None)
if case is None:
    raise SystemExit("TanStack case missing")
if case.get("case_revision") != 3:
    raise SystemExit(f"expected TanStack revision 3, got {case.get('case_revision')}")
procedure = case["oracle"]["specification"]["ground_truth_procedure"]
old_contract = "Pinned T075 project-native command contract from exact root package.json blob 431461d6ca5fd4a206819b8b105ee56503cfd53d and packages/query-core/package.json blob 272a6320c4ba790333e37cfb8d82fb6632ac9f33: targeted regression-file command = `pnpm --filter @tanstack/query-core test:lib --run src/__tests__/streamedQuery.test.tsx`; project-native full-suite/reference command = `pnpm test`; plain-project test comparator = `pnpm test`; runner-native related selector = `pnpm --filter @tanstack/query-core exec vitest related src/streamedQuery.ts --run`. T075 must additionally prove the recorded `regression_test_ids` member executed in targeted and full-suite evidence; file-level success alone is not oracle evidence."
new_contract = "Pinned T075 project-native command contract from exact root package.json blob 431461d6ca5fd4a206819b8b105ee56503cfd53d and packages/query-core/package.json blob 272a6320c4ba790333e37cfb8d82fb6632ac9f33: targeted regression-file command = `pnpm --filter @tanstack/query-core test:lib --run src/__tests__/streamedQuery.test.tsx`; project-native full-suite/reference command = `pnpm --filter @tanstack/query-core test:lib --run`; plain-project test comparator = `pnpm --filter @tanstack/query-core test:lib --run`; runner-native related selector = `pnpm --filter @tanstack/query-core exec vitest related src/streamedQuery.ts --run`. T075 executable review supersedes the root `pnpm test` comparator because it expands through Nx across 88 workspace projects and produced unrelated setup/source-mutation evidence; the package-native query-core Vitest suite is the narrowest project-native full suite that still contains the complete reviewed package test corpus and the frozen regression oracle. T075 must additionally prove the recorded `regression_test_ids` member executed in targeted and full-suite evidence; file-level success alone is not oracle evidence."
if procedure.count(old_contract) != 1:
    raise SystemExit(f"expected one TanStack command contract, found {procedure.count(old_contract)}")
procedure[procedure.index(old_contract)] = new_contract
case["case_revision"] = 4
manifest["manifest_revision"] = 11
case["provenance"]["review_notes"] += " T075 executable diagnostics showed the root `pnpm test` command expands through Nx across 88 workspace projects and is not a valid stable package verification reference for this isolated query-core case. Case revision 4 therefore uses the exact package-native `test:lib` script from the pinned query-core package metadata as both the full package-suite reference and plain project test comparator; it still executes the complete query-core Vitest corpus and must prove frozen oracle membership."
case["limitations"].append("Case revision 4 supersedes the root `pnpm test` full/plain comparator after T075 executable diagnostics proved that command expands across 88 workspace projects and can fail or mutate source for unrelated examples. The replacement `pnpm --filter @tanstack/query-core test:lib --run` is the exact pinned package-native full query-core Vitest suite, not a targeted regression-only command, and must pass repeated T075 oracle-membership and source-integrity qualification before BENCHMARK_ACTIVE.")
path.write_text(json.dumps(manifest, indent=2) + "\n")
