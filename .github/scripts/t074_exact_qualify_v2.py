import copy
import hashlib
import json
import re
import shlex
import shutil
import subprocess
import tempfile
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

MANIFEST = Path('benchmarks/manifest.json')
m = json.loads(MANIFEST.read_text())
assert m['manifest_revision'] == 7
selection = [c for c in m['cases'] if c['case_class'] == 'selection']
gaps = [c for c in m['cases'] if c['case_class'] == 'gap']
assert len(selection) == 6
assert len(gaps) == 3
assert {c['case_id'] for c in gaps} == {
    'immer-prototype-undefined',
    'braintree-venmo-csp-nonce-web-login',
    'react-hook-form-valueasdate-minmax',
}
assert {c['case_id']: c['case_revision'] for c in gaps} == {
    'immer-prototype-undefined': 2,
    'braintree-venmo-csp-nonce-web-login': 1,
    'react-hook-form-valueasdate-minmax': 1,
}

Draft202012Validator.check_schema(m['case_schema'])
validator = Draft202012Validator(m['case_schema'], format_checker=FormatChecker())
for case in m['cases']:
    validator.validate(case)

# P1 regression guard: every gap case must fail schema validation when the
# independent coverage oracle is removed.
for case in gaps:
    probe = copy.deepcopy(case)
    del probe['oracle']['specification']['coverage_oracle']
    assert list(validator.iter_errors(probe)), case['case_id']

root = Path(tempfile.mkdtemp(prefix='t074-exact-v2-'))


def run(repo: Path, *args: str, raw: bool = False) -> str | bytes:
    p = subprocess.run(
        ['git', '-C', str(repo), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return p.stdout if raw else p.stdout.decode('utf-8', errors='strict')


def exists(repo: Path, spec: str) -> bool:
    return subprocess.run(
        ['git', '-C', str(repo), 'cat-file', '-e', spec],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode == 0


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def added_lines(repo: Path, base: str, fix: str, path: str) -> set[int]:
    out: set[int] = set()
    diff = run(repo, 'diff', '--unified=0', base, fix, '--', path)
    assert isinstance(diff, str)
    for hunk in diff.splitlines():
        if not hunk.startswith('@@'):
            continue
        match = re.search(r'\+(\d+)(?:,(\d+))?', hunk)
        assert match
        start = int(match.group(1))
        count = int(match.group(2) or '1')
        out.update(range(start, start + count))
    return out


def resolved_tag(url: str, version: str) -> str:
    tag = f'v{version}'
    peeled = subprocess.run(
        ['git', 'ls-remote', '--tags', url, f'refs/tags/{tag}^{{}}'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    ).stdout.strip()
    if peeled:
        return peeled.split()[0]
    direct = subprocess.run(
        ['git', 'ls-remote', '--tags', url, f'refs/tags/{tag}'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    ).stdout.strip()
    assert direct, (url, tag)
    return direct.split()[0]


def referenced_script(command: str) -> str | None:
    parts = shlex.split(command)
    if not parts:
        return None
    tool = parts[0]
    if tool == 'npm':
        if len(parts) >= 2 and parts[1] in {'test', 'start'}:
            return parts[1]
        if len(parts) >= 3 and parts[1] == 'run':
            return parts[2]
    if tool in {'yarn', 'pnpm'}:
        if len(parts) >= 3 and parts[1] == 'run':
            return parts[2]
        if len(parts) >= 2 and not parts[1].startswith('-'):
            return parts[1]
    return None


try:
    for case in gaps:
        cid = case['case_id']
        print('VERIFY', cid)
        assert case['lifecycle_state'] == 'CASE_REVIEWED'
        assert case['oracle']['observation'] is None
        assert case['reconstruction']['derived_identity']['expected_digest'] is None
        assert case['reconstruction']['mode'] == 'base_plus_production_fix'
        assert case['reconstruction']['measured_diff_contains_regression_test_change'] is False
        assert 'synthetic_head' not in case['reconstruction']

        coverage = case['oracle']['specification']['coverage_oracle']
        assert coverage['freeze_before_ascout'] is True
        assert coverage['artifact']['format'] == 'lcov'
        assert coverage['artifact']['path'] == 'coverage/lcov.info'
        assert coverage['artifact_digest_algorithm'] == 'sha256'
        mapping = coverage['mapping']
        assert mapping['source_identity'] == 'repository-relative-path-and-line-v1'
        assert mapping['line_set_source'] == 'oracle.specification.gap_changed_executable_lines'
        assert mapping['positive_hits'] == 'EXERCISED'
        assert mapping['zero_hits'] == 'NOT_EXERCISED'
        assert mapping['missing_or_ambiguous'] == 'UNRESOLVED'
        assert mapping['procedure']
        full_cmd = coverage['full_test_coverage_command']
        ref_cmd = coverage['project_native_reference_command']
        assert full_cmd.startswith('./node_modules/.bin/')
        forbidden = ('npx ', 'npm exec', 'pnpm dlx', 'yarn dlx')
        lowered = full_cmd.lower()
        assert not any(token in lowered for token in forbidden)
        for test_path in case['paths']['regression_tests']:
            assert test_path not in full_cmd
        assert any('before invoking Ascout' in s for s in mapping['procedure'])
        assert any('SHA-256' in s or 'sha-256' in s.lower() for s in mapping['procedure'])

        repo = root / cid
        subprocess.run(['git', 'init', '-q', str(repo)], check=True)
        subprocess.run(
            ['git', '-C', str(repo), 'remote', 'add', 'origin', case['upstream']['canonical_url']],
            check=True,
        )
        fix = case['git']['fix']['commit_id']
        base = case['git']['base']['commit_id']
        subprocess.run(
            ['git', '-C', str(repo), 'fetch', '-q', '--filter=blob:none', '--depth=3', 'origin', fix],
            check=True,
        )

        for role in ('base', 'fix', 'oracle'):
            rev = case['git'][role]
            assert exists(repo, rev['commit_id'] + '^{commit}')
            tree = run(repo, 'rev-parse', rev['commit_id'] + '^{tree}')
            assert isinstance(tree, str) and tree.strip() == rev['tree_id']
            parents = run(repo, 'show', '-s', '--format=%P', rev['commit_id'])
            assert isinstance(parents, str)
            assert parents.strip().split() == rev['required_parent_ids']

        assert case['git']['fix']['required_parent_ids'] == [base]
        assert case['git']['oracle'] == case['git']['fix']
        assert case['git']['relationship']['kind'] == 'direct_parent'
        assert case['git']['relationship']['required_parent_commit_id'] == base

        changed_raw = run(repo, 'diff', '--name-only', base, fix)
        assert isinstance(changed_raw, str)
        changed = set(changed_raw.splitlines())
        required_changed = set(case['paths']['production'] + case['paths']['regression_tests'])
        assert required_changed <= changed
        extras = changed - required_changed
        ancillary = case['reconstruction'].get('ancillary_review')
        if extras:
            assert ancillary is not None
            assert extras <= set(ancillary['changed_paths'])
            assert extras <= set(ancillary['excluded_from_derived_baseline'])
            assert not (extras & set(ancillary['preserved_allowlist']))
        elif ancillary is not None:
            assert set(ancillary['changed_paths']) <= changed

        for path in case['paths']['production']:
            assert exists(repo, f'{base}:{path}') and exists(repo, f'{fix}:{path}')
        for item in case['oracle']['specification']['gap_changed_executable_lines']:
            path = item['path']
            line = item['line']
            assert path in case['paths']['production']
            assert line in added_lines(repo, base, fix, path)
            source = run(repo, 'show', f'{fix}:{path}')
            assert isinstance(source, str)
            text = source.splitlines()[line - 1].strip()
            assert text and not text.startswith(('//', '/*', '*'))

        regression_text_parts: list[str] = []
        for path in case['paths']['regression_tests']:
            assert exists(repo, f'{fix}:{path}')
            body = run(repo, 'show', f'{fix}:{path}')
            assert isinstance(body, str)
            regression_text_parts.append(body)
        regression_text = '\n'.join(regression_text_parts)
        for test_id in case['oracle']['specification']['regression_test_ids']:
            assert test_id in regression_text

        # The measured reconstruction starts from base and overlays only production
        # blobs, so the runtime lockfile must bind to the exact base tree.
        lock = case['runtime']['lockfile']
        lock_blob = run(repo, 'rev-parse', f'{base}:{lock["path"]}')
        assert isinstance(lock_blob, str)
        lock_blob = lock_blob.strip()
        lock_data = run(repo, 'cat-file', 'blob', lock_blob, raw=True)
        assert isinstance(lock_data, bytes)
        assert lock_blob == lock['blob_id']
        assert sha256(lock_data) == lock['sha256']

        for role in ('base', 'fix', 'oracle'):
            license_review = case['licensing'][role]
            assert license_review['spdx_expression'] == 'MIT'
            ref = case['git'][role]['commit_id']
            for evidence in license_review['evidence']:
                blob = run(repo, 'rev-parse', f'{ref}:{evidence["path"]}')
                assert isinstance(blob, str)
                blob = blob.strip()
                data = run(repo, 'cat-file', 'blob', blob, raw=True)
                assert isinstance(data, bytes)
                assert blob == evidence['blob_id']
                assert sha256(data) == evidence['sha256']
                assert b'Permission is hereby granted' in data
        assert case['licensing']['file_level_review']['status'] == 'CLEAR'

        steps = '\n'.join(case['reconstruction']['steps'])
        procedure = '\n'.join(case['oracle']['specification']['ground_truth_procedure'])
        assert 'complete working-tree-vs-HEAD changed-path set to equal the listed production paths exactly' in steps
        assert 'physically separate repository/worktree inaccessible to Ascout measurement' in procedure
        assert 'Destroy or quarantine oracle worktrees and evidence before selector/Ascout measurement' in procedure

        pkg_raw = run(repo, 'show', f'{base}:package.json')
        assert isinstance(pkg_raw, str)
        pkg = json.loads(pkg_raw)
        scripts = pkg.get('scripts', {})
        script = referenced_script(ref_cmd)
        assert script is not None and script in scripts, (cid, ref_cmd, script)
        binary = full_cmd.split()[0].rsplit('/', 1)[-1]
        deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
        assert binary in deps, (cid, binary)
        if binary == 'vitest' and '--coverage' in full_cmd:
            assert any(name.startswith('@vitest/coverage-') for name in deps)

        node_version = case['runtime']['node_version'].removeprefix('v')
        node_sha = resolved_tag('https://github.com/nodejs/node.git', node_version)
        node_provenance = '\n'.join(case['runtime']['node_constraint_provenance'])
        assert node_sha in node_provenance, (cid, node_version, node_sha)

        pm = case['runtime']['package_manager']
        pm_version = case['runtime']['package_manager_version']
        pm_urls = {
            'npm': 'https://github.com/npm/cli.git',
            'pnpm': 'https://github.com/pnpm/pnpm.git',
            'yarn': 'https://github.com/yarnpkg/yarn.git',
        }
        pm_sha = resolved_tag(pm_urls[pm], pm_version)
        assert pm_sha in case['runtime']['package_manager_version_provenance'], (cid, pm, pm_version, pm_sha)

        assert any('T074 is definition-only' in x for x in case['limitations'])
        assert any('LCOV' in x for x in case['limitations'])

    print('T074 repaired exact-head donor/schema/coverage/withholding/toolchain evidence PASS')
    print('DONOR_CHECKOUT=NO')
    print('DONOR_DEPENDENCY_INSTALL=NO')
    print('DONOR_SCRIPT_EXECUTION=NO')
    print('DONOR_TEST_EXECUTION=NO')
finally:
    shutil.rmtree(root, ignore_errors=True)
