import base64, hashlib, json, subprocess, yaml

REPO='react-hook-form/react-hook-form'
BASE='47546bbc80557aa5cc4eb2daf2062a27c557137b'
FIX='d7118f40a50aa7783481e9a9b77a703302b94814'
NODE_COMMIT='aa4c77582be995286fc6e00aaf530dc7ade102a9'
PNPM_COMMIT='1e82e001cd5316fa2ab792a7c19bdeb0c498084b'

def api(path):
    p=subprocess.run(['gh','api',path],check=True,text=True,capture_output=True)
    return json.loads(p.stdout)

def content_at(repo, path, ref):
    p=subprocess.run(['gh','api',f'repos/{repo}/contents/{path}','--method','GET','-f',f'ref={ref}'],check=True,text=True,capture_output=True)
    return json.loads(p.stdout)

def blob_bytes(sha):
    b=api(f'repos/{REPO}/git/blobs/{sha}')
    return base64.b64decode(b['content'])

def tree_map(tree_sha):
    t=api(f'repos/{REPO}/git/trees/{tree_sha}?recursive=1')
    assert not t.get('truncated')
    return {x['path']:x for x in t['tree']}

def sha256(data): return hashlib.sha256(data).hexdigest()

base=api(f'repos/{REPO}/git/commits/{BASE}')
fix_rest=api(f'repos/{REPO}/commits/{FIX}')
fix_git=api(f'repos/{REPO}/git/commits/{FIX}')
assert [p['sha'] for p in fix_rest['parents']]==[BASE]
assert fix_git['tree']['sha']=='4df4511116d85a6003b36dddca79f56bab7bd53b'
changed=[f['filename'] for f in fix_rest['files']]
assert sorted(changed)==sorted(['src/__tests__/logic/validateField.test.tsx','src/logic/validateField.ts'])

bt=tree_map(base['tree']['sha']); ft=tree_map(fix_git['tree']['sha'])
for path in ['package.json','pnpm-lock.yaml','LICENSE','scripts/jest/jest.config.js','.github/actions/install-dependencies/action.yml','src/logic/validateField.ts','src/__tests__/logic/validateField.test.tsx']:
    assert path in bt
pkg=json.loads(blob_bytes(bt['package.json']['sha']))
lock_raw=blob_bytes(bt['pnpm-lock.yaml']['sha'])
lock=yaml.safe_load(lock_raw)
ci=blob_bytes(bt['.github/actions/install-dependencies/action.yml']['sha']).decode()
jest_cfg=blob_bytes(bt['scripts/jest/jest.config.js']['sha']).decode()
prod_fix=blob_bytes(ft['src/logic/validateField.ts']['sha']).decode()
test_fix=blob_bytes(ft['src/__tests__/logic/validateField.test.tsx']['sha']).decode()
assert pkg['scripts']['test']=='jest --config ./scripts/jest/jest.config.js'
assert pkg['scripts']['test:coverage']=='pnpm test --coverage'
assert pkg['engines']['node']=='>=18.0.0'
assert 'version: 11.7.0' in ci and 'node-version: 22' in ci
assert 'collectCoverageFrom' in jest_cfg and "projects: getProjects()" in jest_cfg
assert lock['importers']['.']['devDependencies']['jest']['version'].startswith('30.4.2')
assert "should return min error when the field value is already a Date object (valueAsDate)" in test_fix
lines=prod_fix.splitlines()
changed_exec=[]
for i,line in enumerate(lines,1):
    if '!isDateObject(inputValue)' in line:
        changed_exec.append(i)
assert changed_exec and len(changed_exec)==1

node_pkg=content_at('nodejs/node','package.json',NODE_COMMIT)
node_pkg=json.loads(base64.b64decode(node_pkg['content']))
assert node_pkg['version']=='22.23.2'
pnpm_pkg=content_at('pnpm/pnpm','pnpm/package.json',PNPM_COMMIT)
pnpm_pkg=json.loads(base64.b64decode(pnpm_pkg['content']))
assert pnpm_pkg['version']=='11.7.0'

for tm in (bt,ft):
    lic=blob_bytes(tm['LICENSE']['sha'])
    assert b'Permission is hereby granted, free of charge' in lic
    for path in ['src/logic/validateField.ts','src/__tests__/logic/validateField.test.tsx']:
        assert 'SPDX-License-Identifier:' not in blob_bytes(tm[path]['sha']).decode(errors='replace')

out={
 'repository':REPO,
 'base':{'commit':BASE,'tree':base['tree']['sha'],'parents':[p['sha'] for p in base['parents']]},
 'fix':{'commit':FIX,'tree':fix_git['tree']['sha'],'parents':[p['sha'] for p in fix_git['parents']]},
 'changed_paths':changed,
 'production_path':'src/logic/validateField.ts',
 'regression_test_path':'src/__tests__/logic/validateField.test.tsx',
 'changed_executable_lines':changed_exec,
 'regression_test_id':'should return min error when the field value is already a Date object (valueAsDate)',
 'lockfile':{'path':'pnpm-lock.yaml','blob_id':bt['pnpm-lock.yaml']['sha'],'sha256':sha256(lock_raw)},
 'license_base':{'path':'LICENSE','blob_id':bt['LICENSE']['sha'],'sha256':sha256(blob_bytes(bt['LICENSE']['sha']))},
 'license_fix':{'path':'LICENSE','blob_id':ft['LICENSE']['sha'],'sha256':sha256(blob_bytes(ft['LICENSE']['sha']))},
 'package_json_blob':bt['package.json']['sha'],
 'jest_config_blob':bt['scripts/jest/jest.config.js']['sha'],
 'ci_toolchain_blob':bt['.github/actions/install-dependencies/action.yml']['sha'],
 'jest_version':lock['importers']['.']['devDependencies']['jest']['version'],
 'package_manager':'pnpm','package_manager_version':'11.7.0','pnpm_commit':PNPM_COMMIT,
 'node_version':'22.23.2','node_commit':NODE_COMMIT,
 'coverage_command':'./node_modules/.bin/jest --config ./scripts/jest/jest.config.js --runInBand --coverage --coverageReporters=lcov --coverageDirectory=coverage',
 'project_native_coverage_reference':'pnpm test:coverage',
 'coverage_artifact':'coverage/lcov.info',
 'donor_checkout':'NO','donor_install':'NO','donor_execution':'NO'
}
print(json.dumps(out,indent=2,sort_keys=True))
print('T074_RHF_METADATA_PASS')
