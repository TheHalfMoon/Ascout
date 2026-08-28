import copy
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

P = Path('benchmarks/manifest.json')
m = json.loads(P.read_text())
assert m['manifest_revision'] == 6
assert m['policy']['first_executable_task'] == 'T075'
assert m['policy']['donor_execution_before_t075'] is False

cases = m['cases']
gaps = [c for c in cases if c['case_class'] == 'gap']
assert [c['case_id'] for c in gaps] == [
    'immer-prototype-undefined',
    'axios-tojson-dag',
    'undici-h2-late-response',
]
immer = gaps[0]
assert immer['case_revision'] == 1
assert immer['lifecycle_state'] == 'CASE_REVIEWED'
assert immer['oracle']['observation'] is None
assert immer['reconstruction']['derived_identity']['expected_digest'] is None

# Make the independent full-suite coverage oracle machine-readable and mandatory for every gap case.
spec_props = m['case_schema']['properties']['oracle']['properties']['specification']['properties']
assert 'coverage_oracle' not in spec_props
spec_props['coverage_oracle'] = {
    'type': 'object',
    'additionalProperties': False,
    'required': [
        'full_test_coverage_command',
        'project_native_reference_command',
        'artifact',
        'artifact_digest_algorithm',
        'mapping',
        'freeze_before_ascout',
    ],
    'properties': {
        'full_test_coverage_command': {'type': 'string', 'minLength': 1},
        'project_native_reference_command': {'type': 'string', 'minLength': 1},
        'artifact': {
            'type': 'object',
            'additionalProperties': False,
            'required': ['format', 'path'],
            'properties': {
                'format': {'const': 'lcov'},
                'path': {'$ref': '#/$defs/repository_path'},
            },
        },
        'artifact_digest_algorithm': {'const': 'sha256'},
        'mapping': {
            'type': 'object',
            'additionalProperties': False,
            'required': [
                'source_identity',
                'line_set_source',
                'positive_hits',
                'zero_hits',
                'missing_or_ambiguous',
                'procedure',
            ],
            'properties': {
                'source_identity': {'const': 'repository-relative-path-and-line-v1'},
                'line_set_source': {'const': 'oracle.specification.gap_changed_executable_lines'},
                'positive_hits': {'const': 'EXERCISED'},
                'zero_hits': {'const': 'NOT_EXERCISED'},
                'missing_or_ambiguous': {'const': 'UNRESOLVED'},
                'procedure': {
                    'type': 'array',
                    'minItems': 1,
                    'items': {'type': 'string', 'minLength': 1},
                },
            },
        },
        'freeze_before_ascout': {'const': True},
    },
}

gap_cond = None
for item in m['case_schema']['allOf']:
    if item.get('if', {}).get('properties', {}).get('case_class', {}).get('const') == 'gap':
        gap_cond = item
        break
assert gap_cond is not None
req = gap_cond['then']['properties']['oracle']['properties']['specification']['required']
assert req == ['gap_changed_executable_lines']
req.append('coverage_oracle')

def coverage_oracle(command, reference, artifact):
    return {
        'full_test_coverage_command': command,
        'project_native_reference_command': reference,
        'artifact': {'format': 'lcov', 'path': artifact},
        'artifact_digest_algorithm': 'sha256',
        'mapping': {
            'source_identity': 'repository-relative-path-and-line-v1',
            'line_set_source': 'oracle.specification.gap_changed_executable_lines',
            'positive_hits': 'EXERCISED',
            'zero_hits': 'NOT_EXERCISED',
            'missing_or_ambiguous': 'UNRESOLVED',
            'procedure': [
                'T075 runs the exact full-test coverage command in the isolated measured reconstruction before any Ascout invocation and refuses network-backed executable resolution or an unexpected toolchain.',
                'T075 canonicalizes each LCOV SF record to one repository-relative production path and maps only the reviewed oracle.specification.gap_changed_executable_lines entries; duplicate, escaping, missing, or ambiguous source identities are UNRESOLVED.',
                'For each reviewed line, an exact LCOV DA hit count greater than zero is EXERCISED, an exact zero hit count is NOT_EXERCISED, and a missing/non-numeric/ambiguous DA record is UNRESOLVED; no selector output participates in this classification.',
                'T075 hashes the complete LCOV artifact with SHA-256 and freezes both the artifact identity and the line classifications before invoking Ascout; later selector results cannot modify the frozen oracle.',
            ],
        },
        'freeze_before_ascout': True,
    }

# Surviving Immer case: add the missing independent full-suite coverage oracle and bump semantic revision.
immer['case_revision'] = 2
immer['oracle']['specification']['coverage_oracle'] = coverage_oracle(
    './node_modules/.bin/vitest run --coverage',
    'yarn coverage',
    'coverage/lcov.info',
)
immer['limitations'].append(
    'T074 now freezes a project-native full-suite LCOV oracle definition; no LCOV artifact, artifact digest, or line classification has been observed yet and T075 must establish them before Ascout runs.'
)

braintree = {
    'case_id': 'braintree-venmo-csp-nonce-web-login',
    'case_revision': 1,
    'case_class': 'gap',
    'lifecycle_state': 'CASE_REVIEWED',
    'upstream': {
        'canonical_url': 'https://github.com/braintree/braintree-web.git',
        'repository_name': 'braintree/braintree-web',
        'provenance_urls': [
            'https://github.com/braintree/braintree-web/commit/234edb7f3d541ad2df5c7a0d88db6135371c5090',
            'https://github.com/braintree/braintree-web/blob/234edb7f3d541ad2df5c7a0d88db6135371c5090/CHANGELOG.md',
        ],
    },
    'git': {
        'base': {
            'commit_id': 'ba7327135aa757aab5534d41d5871723bd06103a',
            'tree_id': '8926b6f79c45621f84b4cfa08cc61e55a835f929',
            'required_parent_ids': ['c095ba789822fd2070a9d4beff8606e4a795d0d4'],
        },
        'fix': {
            'commit_id': '234edb7f3d541ad2df5c7a0d88db6135371c5090',
            'tree_id': 'eb6faa1527c504c03bb6051bad43be3d27f391fe',
            'required_parent_ids': ['ba7327135aa757aab5534d41d5871723bd06103a'],
        },
        'oracle': {
            'commit_id': '234edb7f3d541ad2df5c7a0d88db6135371c5090',
            'tree_id': 'eb6faa1527c504c03bb6051bad43be3d27f391fe',
            'required_parent_ids': ['ba7327135aa757aab5534d41d5871723bd06103a'],
        },
        'relationship': {
            'kind': 'direct_parent',
            'required_parent_commit_id': 'ba7327135aa757aab5534d41d5871723bd06103a',
            'rationale': 'The reviewed fix commit has the exact benchmark base as its sole parent; the measured state applies only its Venmo production blob and withholds every other fix path.',
        },
    },
    'paths': {
        'production': ['src/venmo/venmo.js'],
        'regression_tests': ['test/venmo/unit/venmo.js'],
    },
    'reconstruction': {
        'mode': 'base_plus_production_fix',
        'steps': [
            'Checkout exact base commit ba7327135aa757aab5534d41d5871723bd06103a as measured HEAD with index and worktree equal to HEAD.',
            'Install only from the exact base package-lock under the pinned Node/npm identities at T075; the fix-side version/package-lock changes are ancillary release content and are not part of the measured reconstruction.',
            'Overlay only the exact src/venmo/venmo.js blob from fix commit 234edb7f3d541ad2df5c7a0d88db6135371c5090 as an unstaged production change.',
            'Keep test/venmo/unit/venmo.js byte-identical to its exact base blob and withhold CHANGELOG.md, package-lock.json, package.json, scripts/release, and every other fix-side byte from the measured repository.',
            'Require the complete worktree-vs-HEAD changed-path set to equal src/venmo/venmo.js exactly and reject staged or unexpected non-runtime untracked paths.',
            'At T075 record the deterministic derived Git tree identity and refuse replay if reconstruction identity, base lock bytes, or changed-path scope differs.',
        ],
        'measured_diff_contains_regression_test_change': False,
        'derived_identity': {'algorithm': 'git-tree', 'expected_digest': None},
    },
    'runtime': {
        'package_manager': 'npm',
        'package_manager_version': '10.8.2',
        'package_manager_version_provenance': 'Exact benchmark Node 20.19.0 commit bb1a61d8737feff534bb85368dab3b7c554c863d bundles npm 10.8.2; T075 must use that bundled npm and refuse any package-manager mismatch.',
        'lockfile': {
            'path': 'package-lock.json',
            'blob_id': '73ea6577e2620d3cdf2273a67b8b982bfc277b5a',
            'sha256': 'c24158baff68b62ce78928e80d232f503b5d16ae6cf1f5fd8f839aadec0c2717',
        },
        'node_version': '20.19.0',
        'node_constraint_provenance': [
            'Exact base .nvmrc blob 9a2a0e219c9b280eea2627cdcaa1bb40bc8351b3 selects Node v20.',
            'Benchmark resolves that major deterministically to Node 20.19.0, released before the historical fix; nodejs/node v20.19.0 resolves to commit bb1a61d8737feff534bb85368dab3b7c554c863d.',
        ],
        'immutable_harness_artifact': {
            'required': False,
            'sha256': None,
            'reason': 'Exact base Git objects, exact base package-lock bytes, exact Node/npm identities, and local Jest are sufficient; T075 must fail closed instead of substituting a floating image or downloaded executable.',
        },
    },
    'licensing': {
        'base': {
            'spdx_expression': 'MIT',
            'evidence': [{'path': 'LICENSE', 'blob_id': 'acda283de3dbf565711ceefac9ce0a1c8dcb57d5', 'sha256': '0368c2fe9950c9a838bf4dc1a6ee010e661accd7ce4b98b1203a921415f6e81c'}],
            'review_note': 'Exact base Git object contains the repository MIT license; target source/test files contain no narrower SPDX marker.',
        },
        'fix': {
            'spdx_expression': 'MIT',
            'evidence': [{'path': 'LICENSE', 'blob_id': 'acda283de3dbf565711ceefac9ce0a1c8dcb57d5', 'sha256': '0368c2fe9950c9a838bf4dc1a6ee010e661accd7ce4b98b1203a921415f6e81c'}],
            'review_note': 'Exact fix Git object retains the same reviewed MIT license; target source/test files contain no narrower SPDX marker.',
        },
        'oracle': {
            'spdx_expression': 'MIT',
            'evidence': [{'path': 'LICENSE', 'blob_id': 'acda283de3dbf565711ceefac9ce0a1c8dcb57d5', 'sha256': '0368c2fe9950c9a838bf4dc1a6ee010e661accd7ce4b98b1203a921415f6e81c'}],
            'review_note': 'Oracle revision is the exact reviewed fix state under the same MIT license.',
        },
        'file_level_review': {
            'status': 'CLEAR',
            'notes': 'Reviewed Venmo production and unit-test paths are covered by the repository MIT license; T074 redistributes no donor source or patch content.',
        },
    },
    'oracle': {
        'specification': {
            'regression_test_ids': ['passes style nonce with web login'],
            'historical_basis': 'Upstream direct-parent release commit 234edb7f3d541ad2df5c7a0d88db6135371c5090 changes Venmo CSP-nonce gating from _allowDesktop to _allowDesktopWebLogin, adds the named unit regression, and records the cspNonce web-login fix in CHANGELOG 3.117.1. The test change is independent upstream evidence and is withheld from the measured tree.',
            'ground_truth_procedure': [
                'Pinned T075 targeted oracle command: `BRAINTREE_JS_ENV=development ./node_modules/.bin/jest --config=test/venmo/jest.config.json --runInBand test/venmo/unit/venmo.js`. T075 must prove the named regression_test_id executed; file-level success alone is not oracle evidence.',
                'Measured reconstruction uses exact base HEAD and base package-lock bytes, overlays only src/venmo/venmo.js from the fix as an unstaged change, and leaves the historical regression-test file at exact base bytes; all ancillary release/version/lock changes from the fix remain withheld.',
                'Pre-fix oracle reconstruction is physically separate from the measured repository: apply only the exact historical test change to exact base production and require the named regression to fail as a valid test observation rather than setup/runner failure.',
                'Fixed oracle reconstruction applies the identical historical test bytes plus only the reviewed production blob and requires the named regression to pass under the identical pinned targeted command.',
                'Repeat valid pre-fix/fixed observations under the T075 determinism protocol, quarantine oracle-only worktrees/evidence, and never expose historical test assertions or oracle-only metadata to Ascout measurement.',
            ],
            'independence_statement': 'Ground truth is defined solely from exact upstream Git history, the upstream-authored regression, and a separately frozen full-suite coverage oracle; it is not derived from Ascout selection, coverage, receipts, or benchmark outcomes.',
            'gap_changed_executable_lines': [{'path': 'src/venmo/venmo.js', 'line': 87}],
            'coverage_oracle': coverage_oracle(
                'BRAINTREE_JS_ENV=development ./node_modules/.bin/jest --config=jest.config.json --runInBand --coverage --coverageReporters=lcov --coverageDirectory=coverage',
                'npm test',
                'coverage/lcov.info',
            ),
        },
        'observation': None,
    },
    'provenance': {
        'issue_or_pr_urls': [
            'https://github.com/braintree/braintree-web/commit/234edb7f3d541ad2df5c7a0d88db6135371c5090',
            'https://github.com/braintree/braintree-web/blob/234edb7f3d541ad2df5c7a0d88db6135371c5090/CHANGELOG.md',
        ],
        'review_notes': 'Reviewed T074 gap case from exact direct-parent upstream history. The fix has six changed paths, but measured reconstruction deliberately applies only the single production blob and withholds the regression test plus release/version/lock ancillary content. Definition-only metadata review performed without donor checkout/install/build/test execution.',
    },
    'limitations': [
        'T074 is definition-only: no donor dependency, script, build, test, LCOV artifact, or line classification has been executed or observed; T075 is the first execution task.',
        'The exact Node 20.19.0 patch is benchmark-owned resolution of the donor .nvmrc v20 constraint and must be enforced fail-closed by T075.',
        'The historical fix also changes release/version/package-lock content; the measured benchmark intentionally preserves exact base dependency metadata and overlays only the reviewed production blob.',
        'Only src/venmo/venmo.js:87 is claimed as the reviewed material exercise-gap target; T075 must classify it from the independently frozen LCOV artifact before Ascout runs.',
    ],
}

rhf = {
    'case_id': 'react-hook-form-valueasdate-minmax',
    'case_revision': 1,
    'case_class': 'gap',
    'lifecycle_state': 'CASE_REVIEWED',
    'upstream': {
        'canonical_url': 'https://github.com/react-hook-form/react-hook-form.git',
        'repository_name': 'react-hook-form/react-hook-form',
        'provenance_urls': [
            'https://github.com/react-hook-form/react-hook-form/commit/d7118f40a50aa7783481e9a9b77a703302b94814',
            'https://github.com/react-hook-form/react-hook-form/pull/13646',
        ],
    },
    'git': {
        'base': {
            'commit_id': '47546bbc80557aa5cc4eb2daf2062a27c557137b',
            'tree_id': '80967ec8c33f541d823d6628335f65dc77cab52a',
            'required_parent_ids': ['c96ab19818519c7560b43cb712539a0c8cae48ac'],
        },
        'fix': {
            'commit_id': 'd7118f40a50aa7783481e9a9b77a703302b94814',
            'tree_id': '4df4511116d85a6003b36dddca79f56bab7bd53b',
            'required_parent_ids': ['47546bbc80557aa5cc4eb2daf2062a27c557137b'],
        },
        'oracle': {
            'commit_id': 'd7118f40a50aa7783481e9a9b77a703302b94814',
            'tree_id': '4df4511116d85a6003b36dddca79f56bab7bd53b',
            'required_parent_ids': ['47546bbc80557aa5cc4eb2daf2062a27c557137b'],
        },
        'relationship': {
            'kind': 'direct_parent',
            'required_parent_commit_id': '47546bbc80557aa5cc4eb2daf2062a27c557137b',
            'rationale': 'Merged PR #13646 produced a direct-parent fix commit whose exact parent is the reviewed benchmark base and whose changed paths are only one production file and one regression-test file.',
        },
    },
    'paths': {
        'production': ['src/logic/validateField.ts'],
        'regression_tests': ['src/__tests__/logic/validateField.test.tsx'],
    },
    'reconstruction': {
        'mode': 'base_plus_production_fix',
        'steps': [
            'Checkout exact base commit 47546bbc80557aa5cc4eb2daf2062a27c557137b as measured HEAD with index and worktree equal to HEAD.',
            'Install only from exact base pnpm-lock.yaml under pinned pnpm 11.7.0 and exact Node 22.23.2 at T075.',
            'Overlay only the exact src/logic/validateField.ts blob from fix commit d7118f40a50aa7783481e9a9b77a703302b94814 as an unstaged production change.',
            'Keep src/__tests__/logic/validateField.test.tsx byte-identical to its exact base blob; do not apply the historical regression-test change to the measured repository.',
            'Require the complete worktree-vs-HEAD changed-path set to equal src/logic/validateField.ts exactly and reject staged or unexpected non-runtime untracked paths.',
            'At T075 record the deterministic derived Git tree identity and refuse replay if reconstruction identity, exact toolchain identity, lockfile bytes, or changed-path scope differs.',
        ],
        'measured_diff_contains_regression_test_change': False,
        'derived_identity': {'algorithm': 'git-tree', 'expected_digest': None},
    },
    'runtime': {
        'package_manager': 'pnpm',
        'package_manager_version': '11.7.0',
        'package_manager_version_provenance': 'Exact donor CI composite-action blob 4d5af5eef50eb1d6051a8d186f817bdbc972ab30 pins pnpm 11.7.0; pnpm/pnpm v11.7.0 resolves to commit 1e82e001cd5316fa2ab792a7c19bdeb0c498084b.',
        'lockfile': {
            'path': 'pnpm-lock.yaml',
            'blob_id': '49f6fde69682f104a2c65bec4552be4a6eeba643',
            'sha256': '7acb3dc72842c76da85d5a9dd0e8c589c18250c2b2e46b0dbe4948798df0d14a',
        },
        'node_version': '22.23.2',
        'node_constraint_provenance': [
            'Exact donor CI composite-action blob 4d5af5eef50eb1d6051a8d186f817bdbc972ab30 selects Node 22 and pnpm 11.7.0; package.json engines permit Node >=18.0.0.',
            'Benchmark resolves Node 22 deterministically to v22.23.2, published 2026-07-29 before PR #13646 merged; nodejs/node v22.23.2 resolves to commit aa4c77582be995286fc6e00aaf530dc7ade102a9.',
        ],
        'immutable_harness_artifact': {
            'required': False,
            'sha256': None,
            'reason': 'Exact donor CI constraints, exact pnpm lock bytes, exact Node/pnpm identities, and local Jest are sufficient; T075 must fail closed rather than resolve a floating package-manager/runtime or downloaded executable.',
        },
    },
    'licensing': {
        'base': {
            'spdx_expression': 'MIT',
            'evidence': [{'path': 'LICENSE', 'blob_id': '139faf48e1b4926a8743bc7a5bd67287f43f0dd0', 'sha256': 'e8eeb472f0a5889c2c51625b86a3f9b8630680adb9f49a125352e2e426392780'}],
            'review_note': 'Exact base Git object contains the repository MIT license; target source/test files contain no narrower SPDX marker.',
        },
        'fix': {
            'spdx_expression': 'MIT',
            'evidence': [{'path': 'LICENSE', 'blob_id': '139faf48e1b4926a8743bc7a5bd67287f43f0dd0', 'sha256': 'e8eeb472f0a5889c2c51625b86a3f9b8630680adb9f49a125352e2e426392780'}],
            'review_note': 'Exact fix Git object retains the same reviewed MIT license; target source/test files contain no narrower SPDX marker.',
        },
        'oracle': {
            'spdx_expression': 'MIT',
            'evidence': [{'path': 'LICENSE', 'blob_id': '139faf48e1b4926a8743bc7a5bd67287f43f0dd0', 'sha256': 'e8eeb472f0a5889c2c51625b86a3f9b8630680adb9f49a125352e2e426392780'}],
            'review_note': 'Oracle revision is the exact reviewed fix state under the same MIT license.',
        },
        'file_level_review': {
            'status': 'CLEAR',
            'notes': 'Reviewed validateField production and regression-test paths are covered by the repository MIT license; T074 redistributes no donor source or patch content.',
        },
    },
    'oracle': {
        'specification': {
            'regression_test_ids': ['should return min error when the field value is already a Date object (valueAsDate)'],
            'historical_basis': 'Merged upstream PR #13646 fixes valueAsDate min/max validation by excluding Date instances from the numeric branch and adds the named regression. The PR records that the new test fails on old code and passes with the fix and that upstream used Node 22 plus pnpm 11.7.0; T074 treats those statements as historical provenance, not as T075 observations.',
            'ground_truth_procedure': [
                'Pinned T075 targeted oracle command: `./node_modules/.bin/jest --config ./scripts/jest/jest.config.js --runInBand src/__tests__/logic/validateField.test.tsx`. T075 must prove the named regression_test_id executed; file-level success alone is not oracle evidence.',
                'Measured reconstruction uses exact base HEAD and base pnpm-lock bytes, overlays only src/logic/validateField.ts from the fix as an unstaged change, and leaves the historical regression-test path at exact base bytes.',
                'Pre-fix oracle reconstruction is physically separate from the measured repository: apply only the exact historical regression-test change to base production and require the named regression to fail as a valid test observation rather than setup/runner failure.',
                'Fixed oracle reconstruction applies the identical historical test bytes plus only the reviewed production blob and requires the named regression to pass under the identical pinned targeted command.',
                'Repeat valid pre-fix/fixed observations under the T075 determinism protocol, quarantine oracle-only worktrees/evidence, and never expose historical test assertions or oracle-only metadata to Ascout measurement.',
            ],
            'independence_statement': 'Ground truth is defined solely from exact upstream Git/PR history, the upstream-authored regression, and a separately frozen full-suite coverage oracle; it is not derived from Ascout selection, coverage, receipts, or benchmark outcomes.',
            'gap_changed_executable_lines': [{'path': 'src/logic/validateField.ts', 'line': 140}],
            'coverage_oracle': coverage_oracle(
                './node_modules/.bin/jest --config ./scripts/jest/jest.config.js --runInBand --coverage --coverageReporters=lcov --coverageDirectory=coverage',
                'pnpm test:coverage',
                'coverage/lcov.info',
            ),
        },
        'observation': None,
    },
    'provenance': {
        'issue_or_pr_urls': [
            'https://github.com/react-hook-form/react-hook-form/pull/13646',
            'https://github.com/react-hook-form/react-hook-form/commit/d7118f40a50aa7783481e9a9b77a703302b94814',
        ],
        'review_notes': 'Reviewed T074 gap case from merged upstream PR #13646 and exact direct-parent Git objects. Changed paths are exactly src/logic/validateField.ts and src/__tests__/logic/validateField.test.tsx; measured reconstruction withholds the regression-test change. Definition-only metadata review used Git objects and PR metadata without donor checkout/install/build/test execution.',
    },
    'limitations': [
        'T074 is definition-only: no donor dependency, script, build, test, LCOV artifact, or line classification has been executed or observed; T075 is the first execution task.',
        'The exact Node 22.23.2 patch is benchmark-owned resolution of donor CI node-version 22 and must be enforced fail-closed by T075.',
        'Only src/logic/validateField.ts:140 is claimed as the reviewed material exercise-gap target; T075 must classify it from the independently frozen LCOV artifact before Ascout runs.',
    ],
}

# Replace the two candidates that cannot meet the strengthened fail-closed coverage contract.
selection_cases = [c for c in cases if c['case_class'] == 'selection']
m['cases'] = selection_cases + [immer, braintree, rhf]
m['manifest_revision'] = 7

assert len(selection_cases) >= m['corpus_contract']['selection']['minimum_cases']
assert len(selection_cases) <= m['corpus_contract']['selection']['maximum_cases']
assert len([c for c in m['cases'] if c['case_class'] == 'gap']) == 3
assert [c['case_id'] for c in m['cases'] if c['case_class'] == 'gap'] == [
    'immer-prototype-undefined',
    'braintree-venmo-csp-nonce-web-login',
    'react-hook-form-valueasdate-minmax',
]

Draft202012Validator.check_schema(m['case_schema'])
validator = Draft202012Validator(m['case_schema'], format_checker=FormatChecker())
for c in m['cases']:
    validator.validate(c)
    if c['case_class'] == 'gap':
        assert c['lifecycle_state'] == 'CASE_REVIEWED'
        assert c['oracle']['observation'] is None
        assert c['reconstruction']['derived_identity']['expected_digest'] is None
        cov = c['oracle']['specification']['coverage_oracle']
        assert cov['freeze_before_ascout'] is True
        assert cov['artifact_digest_algorithm'] == 'sha256'
        assert cov['artifact']['format'] == 'lcov'
        assert './node_modules/.bin/' in cov['full_test_coverage_command']
        assert all(x not in cov['full_test_coverage_command'] for x in ['npx ', 'npm exec', 'pnpm dlx', 'yarn dlx'])

# Regression: schema must reject a gap case that omits the independent coverage oracle.
probe = copy.deepcopy(next(c for c in m['cases'] if c['case_class'] == 'gap'))
del probe['oracle']['specification']['coverage_oracle']
assert list(validator.iter_errors(probe)), 'gap without coverage_oracle unexpectedly validated'

P.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
print('T074 CodeRabbit coverage-oracle repair PASS')
print('MANIFEST_REVISION=7')
print('GAP_CASES=immer-prototype-undefined,braintree-venmo-csp-nonce-web-login,react-hook-form-valueasdate-minmax')
print('DONOR_EXECUTION=NO')
