import base64, hashlib, json, re, subprocess

REPO='braintree/braintree-web'
BASE='ba7327135aa757aab5534d41d5871723bd06103a'
FIX='234edb7f3d541ad2df5c7a0d88db6135371c5090'
NODE_COMMIT='bb1a61d8737feff534bb85368dab3b7c554c863d'

def api(path):
    p=subprocess.run(['gh','api',path],check=True,text=True,capture_output=True)
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
fix=api(f'repos/{REPO}/commits/{FIX}')
assert [p['sha'] for p in fix['parents']]==[BASE]
assert base['tree']['sha']=='8926b6f79c45621f84b4cfa08cc61e55a835f929'
assert fix['commit']['tree']['sha']=='eb6faa1527c504c03bb6051bad43be3d27f391fe'
changed=[f['filename'] for f in fix['files']]
expected=['CHANGELOG.md','package-lock.json','package.json','scripts/release','src/venmo/venmo.js','test/venmo/unit/venmo.js']
assert sorted(changed)==sorted(expected)

bt=tree_map(base['tree']['sha']); ft=tree_map(fix['commit']['tree']['sha'])
for path in ['package.json','package-lock.json','LICENSE','.nvmrc','jest.config.json','test/venmo/jest.config.json','src/venmo/venmo.js','test/venmo/unit/venmo.js']:
    assert path in bt

pkg=json.loads(blob_bytes(bt['package.json']['sha']))
lock_raw=blob_bytes(bt['package-lock.json']['sha']); lock=json.loads(lock_raw)
root_jest=json.loads(blob_bytes(bt['jest.config.json']['sha']))
venmo_jest=json.loads(blob_bytes(bt['test/venmo/jest.config.json']['sha']))
nvmrc=blob_bytes(bt['.nvmrc']['sha']).decode().strip()
prod_fix=blob_bytes(ft['src/venmo/venmo.js']['sha']).decode()
test_fix=blob_bytes(ft['test/venmo/unit/venmo.js']['sha']).decode()
assert pkg['scripts']['test']=='BRAINTREE_JS_ENV=development jest --config=jest.config.json'
assert root_jest['collectCoverage'] is True
assert venmo_jest['coverageDirectory']=='<rootDir>/../../test/venmo/coverage'
assert venmo_jest['testMatch']==['**/unit/**/*.js']
assert nvmrc=='v20'
assert lock['packages']['node_modules/jest']['version'].startswith('29.')
assert 'passes style nonce with web login' in test_fix
lines=prod_fix.splitlines()
assert lines[86].strip()=='(this._mobileWebFallBack || this._allowDesktopWebLogin) &&'

# Exact Node 20.19.0 existed before the donor fix and bundles npm 10.8.2.
node_npm=json.loads(api(f'repos/nodejs/node/contents/deps/npm/package.json?ref={NODE_COMMIT}')['content'].encode() and base64.b64decode(api(f'repos/nodejs/node/contents/deps/npm/package.json?ref={NODE_COMMIT}')['content']))
assert node_npm['version']=='10.8.2'

# Root MIT evidence is unchanged across base/fix; relevant source/test files have no narrower SPDX marker.
for rev,tm in [('base',bt),('fix',ft)]:
    lic=blob_bytes(tm['LICENSE']['sha'])
    assert b'Permission is hereby granted, free of charge' in lic
    for path in ['src/venmo/venmo.js','test/venmo/unit/venmo.js']:
        text=blob_bytes(tm[path]['sha']).decode(errors='replace')
        assert 'SPDX-License-Identifier:' not in text

out={
 'repository':REPO,
 'base':{'commit':BASE,'tree':base['tree']['sha'],'parents':[p['sha'] for p in base['parents']]},
 'fix':{'commit':FIX,'tree':fix['commit']['tree']['sha'],'parents':[p['sha'] for p in fix['parents']]},
 'changed_paths':changed,
 'production_path':'src/venmo/venmo.js',
 'regression_test_path':'test/venmo/unit/venmo.js',
 'changed_executable_lines':[87],
 'regression_test_id':'passes style nonce with web login',
 'lockfile':{'path':'package-lock.json','blob_id':bt['package-lock.json']['sha'],'sha256':sha256(lock_raw)},
 'license_base':{'path':'LICENSE','blob_id':bt['LICENSE']['sha'],'sha256':sha256(blob_bytes(bt['LICENSE']['sha']))},
 'license_fix':{'path':'LICENSE','blob_id':ft['LICENSE']['sha'],'sha256':sha256(blob_bytes(ft['LICENSE']['sha']))},
 'package_json_blob':bt['package.json']['sha'],
 'nvmrc':{'blob_id':bt['.nvmrc']['sha'],'value':nvmrc},
 'root_jest_config_blob':bt['jest.config.json']['sha'],
 'venmo_jest_config_blob':bt['test/venmo/jest.config.json']['sha'],
 'jest_version':lock['packages']['node_modules/jest']['version'],
 'node_version':'20.19.0','node_commit':NODE_COMMIT,'npm_version':'10.8.2',
 'coverage_command':'BRAINTREE_JS_ENV=development ./node_modules/.bin/jest --config=jest.config.json --runInBand --coverage --coverageReporters=lcov --coverageDirectory=coverage',
 'coverage_artifact':'coverage/lcov.info',
 'donor_checkout':'NO','donor_install':'NO','donor_execution':'NO'
}
print(json.dumps(out,indent=2,sort_keys=True))
print('T074_BRAINTREE_METADATA_PASS')
