# Ascout Founding Benchmark Corpus Policy

**Task:** T071 — Define benchmark corpus acquisition, licensing, and reproducibility.
**Scope:** Founding M1 benchmark policy only. Case manifests are T072; reviewed case definitions are T073/T074; executable isolation and replay begin at T075; metrics and assertions are T076–T078.
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
8. **Trust boundary preservation.** No third-party install or repository command is executed during T071–T074. Executable replay begins only through the isolated benchmark harness authorized by T075.

If a candidate cannot satisfy these constraints without interpretation or hidden repair, it is rejected rather than weakened into the corpus.

## 3. Benchmark phase boundary

The task order deliberately separates **defining/reviewing historical cases** from **executing third-party code**.

### T071–T072: policy and machine-readable identity only

These tasks are non-executing. They may inspect Git objects and text metadata and may define the oracle specification, but they do not install dependencies or claim an observed replay result.

### T073–T074: reviewed case definitions only

These tasks may add selection/gap case definitions after identity, licensing, historical provenance, reconstruction recipe, and oracle specification are reviewed. A T073/T074 case is **not yet benchmark-active** and MUST NOT be described as replay-verified merely because its history looks suitable.

The case definition may state the expected historical regression test, expected reconstruction, and the independent ground-truth procedure that T075 will execute. It may also record non-executing evidence from exact Git objects, such as the regression-test patch and project configuration at pinned commits.

### T075: first executable boundary

Only the isolated T075 harness may install donor dependencies or execute donor tests/build scripts. T075 replays the previously reviewed reconstruction and oracle procedures. A case that cannot be reconstructed or whose oracle behavior does not match the reviewed specification fails closed.

### T076–T078: benchmark-active evidence

Metrics and integrity assertions use only cases that have passed T075 replay and independent oracle verification. A case definition that has not crossed the T075 execution gate is excluded from benchmark denominators and public benchmark claims.

This ordering prevents T071/T072/T073/T074 from quietly executing untrusted third-party repositories while avoiding a circular dependency in which a case would need the not-yet-implemented T075 harness in order to exist.

## 4. Corpus case classes

### 4.1 Selection case

A selection case asks: **given a production-only working-tree change, does each selector run the independently known regression test(s)?**

The historical upstream change must provide, at case-definition time:

- an exact pre-fix/base commit;
- an exact fix commit descended from that base through a reviewable relationship;
- one or more production changes relevant to the defect;
- one or more regression tests that independently demonstrate the behavior being fixed;
- a deterministic project-native way to identify those regression tests from pinned source metadata;
- and a reviewable project-native full-suite path intended to become the reference selector at T075.

The measured working-tree diff MUST NOT include the regression-test patch. Otherwise a selector can appear correct merely because the test file itself is changed.

For the common historical shape where the regression test was introduced or modified in the fix commit, the reviewed reconstruction will define a **derived benchmark baseline**:

1. start from the exact fix tree so the historical regression test exists in the benchmark baseline;
2. replace only the reviewed production-fix paths with their exact base-commit state;
3. record that derived tree as benchmark-derived state, never as an upstream commit;
4. record the regression test that is expected to expose the pre-fix behavior;
5. materialize only the production fix as the measured working-tree change;
6. record the regression test that is expected to pass after the production change;
7. at T075, execute the pre-fix/fix oracle checks and then run full suite, plain project test, native related selector, and Ascout against the same measured source state.

This construction keeps the regression test **present but unchanged** in the measured diff. It prevents changed-test leakage while retaining a real historical oracle.

A different reconstruction is allowed only when it preserves the same property: the independently known regression test must not become selected merely because the benchmark marks that test file changed.

The T073 case review validates that the reconstruction recipe is exact and historically justified. The claims that the regression test actually fails in the derived pre-fix state and passes after the production change become executable evidence only after T075 replay.

### 4.2 Gap case

A gap case asks: **with the historical production fix present but its regression-test change withheld, does Ascout report changed-code exercise state consistently with independent full-run coverage?**

At T074, the case definition pins a reconstruction procedure from exact upstream objects:

1. checkout the exact base state;
2. materialize the reviewed production portion of the historical fix;
3. withhold the historical regression-test change from the measured repository state;
4. specify the project-native full-test + coverage command that T075 must execute independently;
5. specify which reviewed changed executable lines the oracle must classify as executed, not executed, or not reliably mappable;
6. specify that the independent oracle is frozen before Ascout is run on the same source state.

The withheld regression-test patch is oracle provenance, not measured input. It MUST NOT be present in the measured checkout, `.ascout/`, selector arguments, environment variables, benchmark-visible filenames, or other data available to Ascout or the project-native selector.

At T075, an oracle-only validation may temporarily reconstruct the historical regression test in a separate checkout to prove that the case corresponds to the historical behavior. That checkout is never the measured subject.

The per-line coverage classification is not considered observed ground truth until the T075 isolated replay executes and freezes it.

## 5. Candidate eligibility

A candidate is eligible for a T073/T074 **reviewed case definition** only when all applicable non-executing items below are reviewable and reproducible from pinned source metadata.

### Required before T073/T074 case-definition acceptance

- JavaScript/TypeScript project within the M1 ecosystem.
- Publicly retrievable canonical upstream Git repository.
- Full, unambiguous Git object IDs for all source commits used by the case.
- Reviewable relationship between base and fix states; merge commits require an explicit parent choice and rationale.
- Regression-test evidence tied to the historical fix.
- Project-native Vitest or Jest path visible in pinned metadata and usable by the future harness, or another already-authorized M1 path when the case purpose does not depend on unsupported semantics.
- A committed dependency lockfile for the measured state.
- A non-ambiguous package-manager/toolchain reconstruction from pinned project metadata.
- Deterministic targeted regression-test identity for selection cases.
- Review evidence that the intended full-suite/coverage path does not inherently require application secrets, private services, paid APIs, live production data, or unsupported product semantics.
- Clear licensing evidence at every upstream commit from which benchmark material is used.
- No unresolved file-level license conflict for source/test material involved in the case.

### Additional requirements before benchmark-active acceptance

T075 replay must additionally prove:

- dependency reconstruction succeeds under the isolated harness without silent lockfile/source repair;
- the historical/derived regression oracle behaves as specified;
- the project-native full suite and coverage path are executable under the recorded environment;
- no required secret/private/live-service dependency was missed during metadata review;
- the oracle is stable enough for the claim;
- and the measured reconstruction reproduces its recorded identity.

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
- unresolved flakiness in the oracle after T075 replay;
- unsupported native runner semantics that would require expanding Ascout merely to admit the case;
- or a reconstruction that exposes the withheld regression-test patch to the measured selector.

A rejected candidate may be reconsidered later only through an explicit plan/corpus review. It is never silently downgraded into a weaker case.

## 6. Acquisition policy

### 6.1 Metadata-first, execution-later

T071–T074 acquisition/review is non-executing. It may inspect Git objects and text metadata, but it MUST NOT:

- install donor dependencies;
- run donor package scripts, hooks, tests, build steps, generators, or binaries;
- initialize submodules automatically;
- execute Git hooks from the donor repository;
- or expose host credentials to donor code.

Executable dependency installation and test replay belong to the isolated T075 harness.

### 6.2 Canonical upstream identity

Each T072 manifest case schema and each T073/T074 case definition must record a canonical credential-free upstream URL and exact full commit IDs. Human-friendly repository names, branches, release tags, issue links, and pull-request links are provenance aids, not source identity.

For each recorded commit, acquisition must verify:

- the object exists;
- its Git object type is `commit`;
- the full object ID matches the manifest value;
- its exact tree object ID is recorded;
- every explicitly referenced parent exists and matches the intended reconstruction;
- and the relevant path objects can be resolved from that tree.

Git object inspection should use Git's object database (`git cat-file`, `git rev-parse`, `git ls-tree`, or equivalent exact-object operations). A downloaded archive filename or hosting-provider generated tarball hash is not a substitute for commit/tree identity.

### 6.3 No donor source committed by default

The Ascout repository stores benchmark metadata and Ascout-owned harness code. By default it does **not** commit:

- donor source trees;
- `node_modules` or package caches;
- copied regression-test source;
- copied production patches;
- vendor archives;
- generated lockfiles;
- or third-party license text merely for convenience.

T073/T074 cases should reference exact upstream Git objects and deterministic reconstruction metadata. If a later task needs to redistribute donor material, that is a separate explicit license/provenance decision with attribution and notice obligations handled before merge.

### 6.4 Acquisition cache

A local benchmark acquisition cache may retain Git objects outside measured worktrees. It is non-authoritative and rebuildable from manifest identities. Cache presence never changes case identity or ground truth.

A cache hit must still re-verify the requested commit and tree IDs before materialization. A stale cache may make acquisition fail; it may not cause a different commit to be accepted.

## 7. Licensing policy

Git accessibility, repository visibility, package registry availability, and process isolation are **not** license grants.

### 7.1 Exact-commit evidence

For every base/fix/oracle commit used by a case, T072/T073/T074 metadata must record enough evidence to reproduce the license decision, including at minimum:

- canonical SPDX license expression;
- license evidence path(s) as they exist at that exact commit;
- Git blob object ID for each license evidence file;
- SHA-256 of each evidence file's bytes;
- whether relevant source/test files carry more specific SPDX identifiers or notices;
- and a review note when the repository-level license is not sufficient to explain all material used by the case.

License evidence is checked at **both** base and fix state. A license file that changes across the case boundary is never assumed equivalent.

### 7.2 SPDX representation

Use canonical identifiers and expressions from the SPDX License List and SPDX license-expression grammar. `AND`, `OR`, `WITH`, exceptions, and version qualifiers retain their actual meaning; they are not flattened into a single guessed label.

`NONE`, `NOASSERTION`, an unknown hosting-provider classification, or an unreviewed custom license is not sufficient for corpus acceptance.

A `LicenseRef-*` expression may be used only after the exact custom license text is independently reviewed for the benchmark's intended use and its evidence bytes are pinned. The use of `LicenseRef-*` does not itself authorize a case.

### 7.3 File-level and non-code material

Repository-level licensing must not overwrite more specific file-level terms. Any production source, regression test, fixture, generated artifact, data file, or other material necessary to reconstruct the case is checked for file-level notices or SPDX identifiers when present.

Submodules, vendored code, datasets, fonts, media, and other separately licensed assets are outside the donor repository's root license unless evidence proves otherwise. A case depending materially on them is rejected until each required component is separately pinned and reviewed.

### 7.4 Fail closed

If the exact license grant or obligations relevant to the benchmark cannot be determined with reasonable documentary evidence, the candidate is ineligible. The benchmark never treats "public on GitHub" or "open source" as a substitute for an exact license decision.

This policy records engineering provenance; it is not a claim that Ascout provides legal advice.

## 8. Reproducibility contract

A benchmark case is reproducible only when another reviewer can reconstruct the intended measured state from the manifest/case definition without relying on the original author's local checkout.

### 8.1 Required T072 identity and oracle-specification fields

T072 defines the machine-readable manifest contract. Every reviewed case definition must carry enough information to reconstruct at least:

- stable `case_id` and case class (`selection` or `gap`);
- case lifecycle state;
- canonical upstream repository URL;
- exact base/fix/oracle commit IDs and required parent relationship;
- exact tree IDs for those commits;
- production path set and historical regression-test path set;
- deterministic reconstruction mode and any derived-tree identity recipe;
- package manager, lockfile path, and lockfile blob/digest;
- relevant Node/tool constraints discoverable from the pinned source;
- exact license expression and evidence digests;
- regression-test oracle identity;
- independent ground-truth **procedure/specification** to be executed at T075;
- provenance links for human review;
- and explicit exclusion/limitation notes.

Observed replay/coverage evidence digests do not exist before T075. The manifest/case schema must therefore distinguish **oracle specification** from later **oracle observation** rather than fabricating an evidence digest before execution.

T072 may add fields needed to encode this contract, but may not replace exact identities with floating labels.

### 8.2 Derived benchmark state

When a selection case requires a derived baseline to keep the regression test unchanged, that state is never represented as an upstream commit.

Before T075, the case records a deterministic reconstruction recipe from pinned upstream objects and the identity algorithm the harness must apply. During T075, the harness materializes the recipe and records the resulting tree identity/digest. Replaying the same case must reproduce that identity or fail closed.

### 8.3 Dependency reconstruction

Dependency installation is not part of metadata acquisition. When T075 later executes a case:

- the committed lockfile is authoritative;
- frozen/immutable install semantics are required (`npm ci`, pnpm frozen-lockfile, Yarn immutable equivalent as appropriate);
- install must not rewrite the lockfile or product source;
- exact package-manager version is recorded when the upstream project pins one;
- toolchain/environment versions used by the benchmark run are recorded;
- and any required install script executes only inside the T075 isolation boundary.

A case whose dependencies can no longer be reconstructed is unavailable, not silently upgraded.

### 8.4 Measured-state cleanliness

Immediately before every measured selector/Ascout run, the T075 harness must verify the intended source tree and working-tree reconstruction. Oracle artifacts and labels live outside the measured repository namespace.

After each run, unexpected donor-tree mutation is evidence of an invalid or drifted benchmark run, not something the harness cleans and ignores.

### 8.5 Upstream disappearance

The manifest's Git objects remain the canonical identity even if a branch moves or a repository disappears. A future mirror/archive may be added only if it is demonstrably the same Git objects and its provenance is recorded. A substitute repository or similar-looking commit cannot silently replace an unavailable case.

## 9. Independent ground truth

Ground truth is split deliberately into a **reviewed oracle specification** before T075 and **observed oracle evidence** produced only by T075.

### Selection oracle specification — T073

For each selection case definition:

- identify the historical regression test(s) independently from the fix history/review;
- pin the exact source objects containing the production change and regression-test change;
- record stable project-native selector/test identity derivable from pinned metadata;
- define the derived/pre-fix and fixed reconstruction recipes;
- define the T075 assertion that the regression test must expose the pre-fix behavior and pass with the production fix;
- define the full-suite/native-related/Ascout comparison procedure;
- and document the historical evidence that justifies the oracle before executing it.

No runtime PASS/FAIL claim is made by T073 itself.

### Selection observed oracle — T075

The isolated harness must then:

- materialize the reviewed baseline identity;
- prove the targeted regression test exposes the pre-fix behavior;
- materialize only the production change in the measured diff;
- prove the regression test passes after that production change;
- prove the full suite contains/runs the oracle test(s);
- freeze the resulting oracle observation and evidence digests;
- and only then evaluate plain project test, native related selection, and Ascout against the same measured source state.

Selector recall is computed against this frozen oracle. A test selected because its file is changed does not count as a valid historical affected-selection demonstration; the measured diff must satisfy the anti-leakage construction in section 4.1.

### Gap oracle specification — T074

For each gap case definition:

- pin the production fix and historical regression-test patch independently of Ascout;
- define the production-only measured reconstruction;
- define the independent project-native full-test + coverage procedure;
- identify the reviewed changed executable lines whose coverage relationship must be classified;
- define how the oracle will interpret raw project-native coverage independently of Ascout;
- and document the historical evidence that justifies the case.

No per-line observed coverage classification is claimed by T074 itself.

### Gap observed oracle — T075

The isolated harness must then:

- reconstruct the production fix without the regression-test patch;
- run the independent project-native full test scope with coverage;
- normalize only the coverage evidence needed to determine execution of the reviewed changed executable lines using the separately reviewed oracle procedure;
- freeze the resulting per-line ground truth and its evidence digest;
- and only then compare Ascout's `EXERCISED` / `NOT_EXERCISED` / `UNRESOLVED` result.

The Ascout receipt, Ascout LCOV normalization, or Ascout changed-line intersection may not be used to create the benchmark's expected answer. Shared raw project-native coverage input is allowed; the oracle interpretation must remain independently reviewable.

### Flake rejection

An oracle must be stable enough to support its claim. If T075 finds that the targeted regression test, full suite, or independent coverage classification contradicts itself, the case is not benchmark-active. It is rejected or returned to case review/reclassification before T076. T076 measures Ascout flake behavior; the founding oracle itself cannot be an unresolved flake.

## 10. Isolation and trust handoff to T075

Historical donor repositories are third-party code. T071–T074 do not execute them.

T075 must provide the isolated benchmark harness before any case becomes benchmark-active. At minimum, that harness must ensure:

- an ephemeral per-case working directory;
- no inherited application secrets or developer credentials in donor processes;
- no automatic Git hooks or submodule initialization;
- bounded command time and cleanup;
- benchmark controller/oracle data stored outside the measured worktree;
- no mutation of the canonical acquisition cache by measured commands;
- and explicit recording of any network capability the harness does or does not enforce.

The benchmark must not claim network isolation unless the harness actually enforces and verifies it. Cases are nevertheless expected not to require live network services during measured verification.

This is benchmark isolation, not a new Ascout product claim that arbitrary third-party repositories are safe to execute.

## 11. Leakage controls

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

## 12. Case review lifecycle

A case has two distinct acceptance boundaries.

### Definition lifecycle — T072/T073/T074

```text
CANDIDATE
  -> IDENTITY_VERIFIED
  -> LICENSE_CLEARED
  -> RECONSTRUCTION_SPECIFIED
  -> ORACLE_SPECIFIED
  -> CASE_REVIEWED
```

`CASE_REVIEWED` means the case is sufficiently pinned and reviewed to hand to T075. It does **not** mean donor code has executed or the oracle has been observed.

### Executable lifecycle — T075+

```text
CASE_REVIEWED
  -> RECONSTRUCTION_REPLAYED
  -> ORACLE_VERIFIED
  -> BENCHMARK_ACTIVE
```

Failure at any gate leaves the case non-active. T076–T078 metrics use only `BENCHMARK_ACTIVE` cases.

The manifest/case records must distinguish these lifecycle states. A case must be re-reviewed if any identity-bearing field, reconstruction recipe, license evidence, oracle specification/observation, or expected behavior changes.

## 13. Metrics handoff

T076 computes and publishes, at minimum, over benchmark-active cases:

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

## 14. Rejection and maintenance

A previously reviewed or benchmark-active case is disabled rather than rewritten if:

- required Git objects become unavailable and no verified identical mirror exists;
- dependency reconstruction stops being reproducible;
- license evidence becomes incorrect or incomplete;
- the oracle is discovered to be flaky or contaminated;
- the case requires unsupported product behavior;
- or the reconstruction no longer produces the recorded identity.

Historical metric results must retain the manifest/case revision they were measured against. New case revisions do not retroactively rewrite prior benchmark evidence.

## 15. Normative references

The policy relies on primary specifications/documentation for identity and license representation:

- SPDX Specification 3.0.1, SPDX license expressions: https://spdx.github.io/spdx-spec/v3.0.1/annexes/spdx-license-expressions/
- SPDX License List: https://spdx.org/licenses/
- Git `git-cat-file` documentation: https://git-scm.com/docs/git-cat-file
- Git `git-clone` documentation (`--no-checkout` and object acquisition semantics): https://git-scm.com/docs/git-clone

The repository's canonical specification, plan, tasks, and founding master plan remain authoritative over this README if a conflict is found.

## 16. T071 completion boundary

T071 is complete when this policy is reviewed and merged. It does **not** by itself:

- select or accept a donor case;
- create `benchmarks/manifest.json`;
- download or redistribute donor source;
- execute donor code;
- implement the benchmark harness;
- calculate benchmark metrics;
- or publish benchmark claims.

T072 defines the manifest contract; T073/T074 add reviewed non-executing case definitions; T075 is the first executable replay/oracle boundary; T076–T078 measure only benchmark-active cases. This separation keeps provenance, licensing, execution, and measurement independently reviewable and consistent with the canonical task order.
