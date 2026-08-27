# Ascout Founding Benchmark Corpus Policy

**Task:** T071 — Define benchmark corpus acquisition, licensing, and reproducibility.  
**Scope:** Founding M1 benchmark policy only. Case manifests are T072; reviewed cases are T073/T074; executable isolation is T075; metrics and assertions are T076–T078.  
**Canonical product boundary:** Ascout verifies developer-owned trusted local repositories. Historical donor repositories used by this benchmark are third-party inputs and are not silently promoted into the product trust boundary.

## 1. Purpose

The founding benchmark exists to measure the claims Ascout actually makes:

- whether affected-test selection includes the independently known tests that matter;
- whether Ascout avoids a false clean result when verification is materially incomplete;
- whether changed executable lines are reported as `EXERCISED`, `NOT_EXERCISED`, or `UNRESOLVED` consistently with independent coverage evidence;
- whether evidence remains bound to the source tree that produced it;
- whether repeated runs are deterministic enough for the measured claim;
- and what the cold/warm execution cost is.

The benchmark does **not** prove universal correctness and does not rank donor projects. It must not turn historical source code into training data, a vulnerability corpus, or a hidden semantic dependency index.

The founding corpus is intentionally small:

- **selection corpus:** 5–6 reviewed real JavaScript/TypeScript historical fixes with a regression-test oracle;
- **gap corpus:** 3–4 reviewed real historical production fixes where the regression-test change is withheld from the measured subject.

No pre-data recall or accuracy target is invented. T078 publishes selector misses instead of hiding them behind an arbitrary threshold.

## 2. Constitutional constraints

The benchmark inherits the repository's M1 rules:

1. **Evidence before claims.** Ground truth is established independently of Ascout output.
2. **No green by omission.** A benchmark must preserve omissions and material exercise gaps rather than normalize them away.
3. **Source-bound truth.** Every case is pinned to exact Git objects; floating branches and tags are descriptive only.
4. **Native capability first.** Historical Git state, project-native test runners, and project-native coverage are the oracle inputs before custom analysis.
5. **Conservative affected verification.** Benchmark reconstruction must not create an easier selector problem through changed-test leakage.
6. **Minimal core.** The benchmark does not add a product runtime dependency, database, daemon, model, semantic graph, or plugin system.
7. **License/provenance integrity.** A usable Git commit is not sufficient licensing evidence.
8. **Trust boundary preservation.** No third-party install or repository command is executed during T071/T072 acquisition review. Executable replay begins only through the isolated benchmark harness authorized by T075.

If a candidate cannot satisfy these constraints without interpretation or hidden repair, it is rejected rather than weakened into the corpus.

## 3. Corpus case classes

### 3.1 Selection case

A selection case asks: **given a production-only working-tree change, does each selector run the independently known regression test(s)?**

The historical upstream change must provide:

- an exact pre-fix/base commit;
- an exact fix commit descended from that base through a reviewable relationship;
- one or more production changes relevant to the defect;
- one or more regression tests that independently demonstrate the behavior being fixed;
- a deterministic project-native way to identify and execute those regression tests;
- and a reproducible full-suite outcome suitable as the reference selector.

The measured working-tree diff MUST NOT include the regression-test patch. Otherwise a selector can appear correct merely because the test file itself is changed.

For the common historical shape where the regression test was introduced or modified in the fix commit, the harness will build a **derived benchmark baseline**:

1. start from the exact fix tree so the historical regression test exists in the benchmark baseline;
2. replace only the reviewed production-fix paths with their exact base-commit state;
3. record that derived tree as benchmark-derived state, never as an upstream commit;
4. verify the regression test exposes the pre-fix behavior in that derived baseline;
5. materialize only the production fix as the measured working-tree change;
6. verify the regression test passes after the production change;
7. run full suite, plain project test, native related selector, and Ascout against the same measured source state.

This construction keeps the regression test **present but unchanged** in the measured diff. It prevents changed-test leakage while retaining a real historical oracle.

A different reconstruction is allowed only when it preserves the same property: the independently known regression test must not become selected merely because the benchmark marks that test file changed.

### 3.2 Gap case

A gap case asks: **with the historical production fix present but its regression-test change withheld, does Ascout report changed-code exercise state consistently with independent full-run coverage?**

The measured subject is reconstructed from exact upstream objects:

1. checkout the exact base state;
2. materialize the reviewed production portion of the historical fix;
3. withhold the historical regression-test change from the measured repository state;
4. run the project-native full test scope with independent coverage collection;
5. classify each material changed executable line from that independent coverage as executed, not executed, or not reliably mappable;
6. only after the oracle is frozen, run Ascout against the same source state.

The withheld regression-test patch is oracle evidence, not measured input. It MUST NOT be present in the measured checkout, `.ascout/`, selector arguments, environment variables, benchmark-visible filenames, or other data available to Ascout or the project-native selector.

An oracle-only validation may temporarily reconstruct the historical regression test in a separate checkout to prove that the case corresponds to the historical behavior. That checkout is never the measured subject.

## 4. Candidate eligibility

A candidate is eligible only when all applicable items below are reviewable and reproducible.

### Required

- JavaScript/TypeScript project within the M1 ecosystem.
- Publicly retrievable canonical upstream Git repository.
- Full, unambiguous Git object IDs for all source commits used by the case.
- Reviewable relationship between base and fix states; merge commits require an explicit parent choice and rationale.
- Regression-test evidence tied to the historical fix.
- Project-native Vitest or Jest path usable by the future harness, or another already-authorized M1 path when the case purpose does not depend on unsupported semantics.
- A committed dependency lockfile for the measured state.
- A non-ambiguous package-manager/toolchain reconstruction.
- Deterministic targeted regression-test identity for selection cases.
- Full-suite execution and coverage that can run without application secrets, private services, paid APIs, or live production data.
- Clear licensing evidence at every upstream commit from which benchmark material is used.
- No unresolved file-level license conflict for source/test material involved in the case.

### Reject by default

Reject a candidate if any of these are required to make it work:

- a floating branch/tag as the only identity;
- unavailable or abbreviated commit identity;
- force-repaired or manually edited donor source not derivable from recorded Git objects;
- hidden benchmark-specific product changes;
- private dependencies, credentials, secrets, or paid services;
- live network behavior as part of the measured test assertion;
- implicit package-manager or lockfile mutation;
- unreviewed Git submodules or Git LFS objects required by the case;
- an ambiguous or absent source license;
- a license/use restriction incompatible with the intended benchmark use;
- generated ground truth derived from Ascout's own result;
- unresolved flakiness in the oracle;
- unsupported native runner semantics that would require expanding Ascout merely to admit the case;
- or a reconstruction that exposes the withheld regression-test patch to the measured selector.

A rejected candidate may be reconsidered later only through an explicit plan/corpus review. It is never silently downgraded into a weaker case.

## 5. Acquisition policy

### 5.1 Metadata-first, execution-later

T071/T072 acquisition is non-executing. It may inspect Git objects and text metadata, but it MUST NOT:

- install donor dependencies;
- run donor package scripts, hooks, tests, build steps, generators, or binaries;
- initialize submodules automatically;
- execute Git hooks from the donor repository;
- or expose host credentials to donor code.

Executable dependency installation and test replay belong to the isolated T075 harness.

### 5.2 Canonical upstream identity

Each T072 case must record a canonical credential-free upstream URL and exact full commit IDs. Human-friendly repository names, branches, release tags, issue links, and pull-request links are provenance aids, not source identity.

For each recorded commit, acquisition must verify:

- the object exists;
- its Git object type is `commit`;
- the full object ID matches the manifest value;
- its exact tree object ID is recorded;
- every explicitly referenced parent exists and matches the intended reconstruction;
- and the relevant path objects can be resolved from that tree.

Git object inspection should use Git's object database (`git cat-file`, `git rev-parse`, `git ls-tree`, or equivalent exact-object operations). A downloaded archive filename or hosting-provider generated tarball hash is not a substitute for commit/tree identity.

### 5.3 No donor source committed by default

The Ascout repository stores benchmark metadata and Ascout-owned harness code. By default it does **not** commit:

- donor source trees;
- `node_modules` or package caches;
- copied regression-test source;
- copied production patches;
- vendor archives;
- generated lockfiles;
- or third-party license text merely for convenience.

T073/T074 cases should reference exact upstream Git objects and deterministic reconstruction metadata. If a later task needs to redistribute donor material, that is a separate explicit license/provenance decision with attribution and notice obligations handled before merge.

### 5.4 Acquisition cache

A local benchmark acquisition cache may retain Git objects outside measured worktrees. It is non-authoritative and rebuildable from manifest identities. Cache presence never changes case identity or ground truth.

A cache hit must still re-verify the requested commit and tree IDs before materialization. A stale cache may make acquisition fail; it may not cause a different commit to be accepted.

## 6. Licensing policy

Git accessibility, repository visibility, package registry availability, and process isolation are **not** license grants.

### 6.1 Exact-commit evidence

For every base/fix/oracle commit used by a case, T072 must record enough evidence to reproduce the license decision, including at minimum:

- canonical SPDX license expression;
- license evidence path(s) as they exist at that exact commit;
- Git blob object ID for each license evidence file;
- SHA-256 of each evidence file's bytes;
- whether relevant source/test files carry more specific SPDX identifiers or notices;
- and a review note when the repository-level license is not sufficient to explain all material used by the case.

License evidence is checked at **both** base and fix state. A license file that changes across the case boundary is never assumed equivalent.

### 6.2 SPDX representation

Use canonical identifiers and expressions from the SPDX License List and SPDX license-expression grammar. `AND`, `OR`, `WITH`, exceptions, and version qualifiers retain their actual meaning; they are not flattened into a single guessed label.

`NONE`, `NOASSERTION`, an unknown hosting-provider classification, or an unreviewed custom license is not sufficient for corpus acceptance.

A `LicenseRef-*` expression may be used only after the exact custom license text is independently reviewed for the benchmark's intended use and its evidence bytes are pinned. The use of `LicenseRef-*` does not itself authorize a case.

### 6.3 File-level and non-code material

Repository-level licensing must not overwrite more specific file-level terms. Any production source, regression test, fixture, generated artifact, data file, or other material necessary to reconstruct the case is checked for file-level notices or SPDX identifiers when present.

Submodules, vendored code, datasets, fonts, media, and other separately licensed assets are outside the donor repository's root license unless evidence proves otherwise. A case depending materially on them is rejected until each required component is separately pinned and reviewed.

### 6.4 Fail closed

If the exact license grant or obligations relevant to the benchmark cannot be determined with reasonable documentary evidence, the candidate is ineligible. The benchmark never treats "public on GitHub" or "open source" as a substitute for an exact license decision.

This policy records engineering provenance; it is not a claim that Ascout provides legal advice.

## 7. Reproducibility contract

A benchmark case is reproducible only when another reviewer can reconstruct the measured state from the manifest without relying on the original author's local checkout.

### 7.1 Required T072 identity fields

T072 will define the machine-readable manifest, but every accepted case must carry enough information to reconstruct at least:

- stable `case_id` and case class (`selection` or `gap`);
- canonical upstream repository URL;
- exact base/fix/oracle commit IDs and required parent relationship;
- exact tree IDs for those commits;
- production path set and historical regression-test path set;
- deterministic reconstruction mode and any derived-tree identity;
- package manager, lockfile path, and lockfile blob/digest;
- relevant Node/tool constraints discoverable from the pinned source;
- exact license expression and evidence digests;
- regression-test oracle identity;
- independent ground-truth method and evidence digest(s);
- provenance links for human review;
- and explicit exclusion/limitation notes.

T072 may add fields needed to encode this contract, but may not replace exact identities with floating labels.

### 7.2 Derived benchmark state

When a selection case requires a derived baseline to keep the regression test unchanged, that state is never represented as an upstream commit.

The reconstruction recipe must be deterministic from pinned upstream objects, and the harness must record the resulting tree identity/digest before measurement. Replaying the same case must either reproduce that identity or fail closed.

### 7.3 Dependency reconstruction

Dependency installation is not part of metadata acquisition. When T075 later executes a case:

- the committed lockfile is authoritative;
- frozen/immutable install semantics are required (`npm ci`, pnpm frozen-lockfile, Yarn immutable equivalent as appropriate);
- install must not rewrite the lockfile or product source;
- exact package-manager version is recorded when the upstream project pins one;
- toolchain/environment versions used by the benchmark run are recorded;
- and any required install script executes only inside the T075 isolation boundary.

A case whose dependencies can no longer be reconstructed is unavailable, not silently upgraded.

### 7.4 Measured-state cleanliness

Immediately before every measured selector/Ascout run, the harness must verify the intended source tree and working-tree reconstruction. Oracle artifacts and labels live outside the measured repository namespace.

After each run, unexpected donor-tree mutation is evidence of an invalid or drifted benchmark run, not something the harness cleans and ignores.

### 7.5 Upstream disappearance

The manifest's Git objects remain the canonical identity even if a branch moves or a repository disappears. A future mirror/archive may be added only if it is demonstrably the same Git objects and its provenance is recorded. A substitute repository or similar-looking commit cannot silently replace an unavailable case.

## 8. Independent ground truth

Ground truth is frozen **before** evaluating Ascout for the case.

### Selection oracle

For each selection case:

- identify the historical regression test(s) independently from the fix history/review;
- prove they expose the pre-fix behavior in the reconstructed baseline and pass with the production fix applied;
- record stable project-native selectors/test IDs;
- confirm the full suite contains the oracle test(s);
- and record the full-suite outcome as the reference selection set for recall accounting.

Selector recall is then computed against this frozen oracle. A test selected because its file is changed does not count as a valid historical affected-selection demonstration; the measured diff must satisfy the anti-leakage construction in section 3.1.

### Gap oracle

For each gap case:

- reconstruct the production fix without the regression-test patch;
- run an independent project-native full test scope with coverage;
- normalize only the coverage evidence needed to determine execution of the reviewed changed executable lines;
- freeze the resulting per-line ground truth and its evidence digest;
- and only then compare Ascout's `EXERCISED` / `NOT_EXERCISED` / `UNRESOLVED` result.

The Ascout receipt, Ascout LCOV normalization, or Ascout changed-line intersection may not be used to create the benchmark's expected answer. Shared raw project-native coverage input is allowed; the oracle interpretation must remain independently reviewable.

### Flake rejection

An oracle must be stable enough to support its claim. If the targeted regression test, full suite, or independent coverage classification contradicts itself during case review, the case is rejected or explicitly reclassified before publication. T076 measures Ascout flake behavior; the founding oracle itself cannot be an unresolved flake.

## 9. Isolation and trust handoff to T075

Historical donor repositories are third-party code. T071/T072 do not execute them.

T075 must provide the isolated benchmark harness before any accepted case is executed as part of the benchmark. At minimum, that harness must ensure:

- an ephemeral per-case working directory;
- no inherited application secrets or developer credentials in donor processes;
- no automatic Git hooks or submodule initialization;
- bounded command time and cleanup;
- benchmark controller/oracle data stored outside the measured worktree;
- no mutation of the canonical acquisition cache by measured commands;
- and explicit recording of any network capability the harness does or does not enforce.

The benchmark must not claim network isolation unless the harness actually enforces and verifies it. Cases are nevertheless expected not to require live network services during measured verification.

This is benchmark isolation, not a new Ascout product claim that arbitrary third-party repositories are safe to execute.

## 10. Leakage controls

The benchmark is invalid if expected answers leak into the measured selector or receipt path.

During a measured run, none of the following may be injected into the donor repository or process environment unless it is naturally present in the reconstructed historical state:

- expected test IDs;
- expected selected-test sets;
- expected exercise states/counts;
- withheld regression-test content or paths for gap cases;
- expected exit codes;
- benchmark labels such as `must_select` or `must_gap`;
- or Ascout-specific config added only to force the expected result.

Any required Ascout config must correspond to a legitimate project discovery correction and be disclosed as part of the case. It cannot encode the oracle.

## 11. Case review lifecycle

A candidate progresses only through explicit states:

```text
CANDIDATE
  -> IDENTITY_VERIFIED
  -> LICENSE_CLEARED
  -> RECONSTRUCTION_VERIFIED
  -> ORACLE_VERIFIED
  -> ACCEPTED
```

Failure at any gate leaves the case unaccepted. T072's manifest must distinguish accepted cases from candidates if candidates are ever stored; benchmark metrics use only accepted cases.

A case must be re-reviewed if any identity-bearing manifest field, reconstruction recipe, license evidence, oracle evidence, or expected behavior changes.

## 12. Metrics handoff

T076 computes and publishes, at minimum:

- selection recall;
- false-PASS rate/count;
- gap classification accuracy;
- unresolved rate;
- cold and warm time under explicitly recorded cache conditions;
- drift detection;
- determinism;
- and flake classification behavior.

T077 asserts absolute integrity conditions:

```text
cross-tree evidence leakage = 0
binding-integrity violations = 0
stable material exercise gap returning exit 0 = 0
```

A stable run with remaining material `NOT_EXERCISED` or `UNRESOLVED` changed executable lines must map to exit `4` unless a higher-precedence condition applies.

T078 publishes every selector miss. The founding benchmark does not invent a pre-data 98% or similar threshold.

## 13. Rejection and maintenance

A previously accepted case is disabled rather than rewritten if:

- required Git objects become unavailable and no verified identical mirror exists;
- dependency reconstruction stops being reproducible;
- license evidence becomes incorrect or incomplete;
- the oracle is discovered to be flaky or contaminated;
- the case requires unsupported product behavior;
- or the reconstruction no longer produces the recorded identity.

Historical metric results must retain the manifest/case revision they were measured against. New case revisions do not retroactively rewrite prior benchmark evidence.

## 14. Normative references

The policy relies on primary specifications/documentation for identity and license representation:

- SPDX Specification 3.0.1, SPDX license expressions: https://spdx.github.io/spdx-spec/v3.0.1/annexes/spdx-license-expressions/
- SPDX License List: https://spdx.org/licenses/
- Git `git-cat-file` documentation: https://git-scm.com/docs/git-cat-file
- Git `git-clone` documentation (`--no-checkout` and object acquisition semantics): https://git-scm.com/docs/git-clone

The repository's canonical specification, plan, tasks, and founding master plan remain authoritative over this README if a conflict is found.

## 15. T071 completion boundary

T071 is complete when this policy is reviewed and merged. It does **not** by itself:

- select or accept a donor case;
- create `benchmarks/manifest.json`;
- download or redistribute donor source;
- execute donor code;
- implement the benchmark harness;
- calculate benchmark metrics;
- or publish benchmark claims.

Those are deliberately separated into T072–T078 so provenance, licensing, execution, and measurement remain independently reviewable.
