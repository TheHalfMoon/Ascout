import hashlib, json, re, shutil, subprocess, tempfile
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

BASE_MAIN='261f04ced40622567e34487b896cd5f08b1a251f'
NODE_VERSION='24.0.0'
NODE_TAG_COMMIT='c5349f43cd66d2aa02d86414c9ed426f71d3ae48'
NPM_VERSION='11.3.0'
NPM_TAG_COMMIT='5bd086babba5f5b41548609405218c5e892bca7f'
YARN_VERSION='1.22.22'
YARN_TAG_COMMIT='740c38c3a962c30ddb344a919bbfb7065620714b'

SPECS=[
 {
  'case_id':'immer-prototype-undefined','repo':'immerjs/immer','url':'https://github.com/immerjs/immer.git',
  'fix':'16e225b5a316d9ef6695e9aee45eab6e7bf4258a','production':['src/core/proxy.ts'],'tests':['__tests__/regressions.js'],
  'gap_lines':[('src/core/proxy.ts',244)],
  'test_ids':['#1160 assigning undefined to a key only present on the prototype is still stored as an own property'],
  'pm':'yarn','pm_version':YARN_VERSION,'lock':'yarn.lock','ci_path':'.github/workflows/test.yml','ci_blob':'04250bbc1c6208f7669988547b6b7a779bc36db2',
  'targeted':'yarn test:src __tests__/regressions.js','reference':'yarn test','license_path':'LICENSE',
  'provenance':['https://github.com/immerjs/immer/commit/16e225b5a316d9ef6695e9aee45eab6e7bf4258a','https://github.com/immerjs/immer/pull/1262'],
  'basis':'Upstream direct-parent fix #1262 changes one production predicate and adds a regression in __tests__/regressions.js for assigning undefined to a key inherited from the prototype. The historical regression test is independent upstream evidence and is withheld from the measured tree.',
 },
 {
  'case_id':'axios-tojson-dag','repo':'axios/axios','url':'https://github.com/axios/axios.git',
  'fix':'f2b903fceaa0a02cefd77f6b4b123c679605aae9','production':['lib/utils.js'],'tests':['tests/unit/utils.test.js'],
  'gap_lines':[('lib/utils.js',766),('lib/utils.js',770),('lib/utils.js',781),('lib/utils.js',785),('lib/utils.js',789),('lib/utils.js',798)],
  'test_ids':['should serialize a shared sibling object at every occurrence (DAG, not cycle)','should serialize a shared sibling array at every occurrence (DAG, not cycle)','should serialize shared sibling that itself contains a self-cycle','should serialize non-cyclic structures deeper than the old Array(10) cap'],
  'pm':'npm','pm_version':NPM_VERSION,'lock':'package-lock.json','ci_path':'.github/workflows/run-ci.yml','ci_blob':'bc12947acce17be957e73ee8f43baf111f1faccb',
  'targeted':'npm run test:vitest:unit -- tests/unit/utils.test.js','reference':'npm test','license_path':'LICENSE',
  'provenance':['https://github.com/axios/axios/commit/f2b903fceaa0a02cefd77f6b4b123c679605aae9','https://github.com/axios/axios/pull/10832','https://github.com/axios/axios/issues/10807'],
  'basis':'Upstream direct-parent fix #10832 replaces path-cycle tracking in toJSONObject and adds four unit regressions for shared DAG siblings, self-cycles inside shared nodes, and deep non-cyclic structures. The exact historical test change is independent upstream evidence and is withheld from the measured tree.',
 },
 {
  'case_id':'undici-h2-late-response','repo':'nodejs/undici','url':'https://github.com/nodejs/undici.git',
  'fix':'e5b3364ddc620c0d1c61424d1278fc0965207477','production':['lib/dispatcher/client-h2.js'],'tests':['test/http2-response-after-completion.js'],
  'gap_lines':[('lib/dispatcher/client-h2.js',1256)],
  'test_ids':['Should ignore a late http2 "response" delivered after request completion'],
  'pm':'npm','pm_version':NPM_VERSION,'lock':'package-lock.json','ci_path':'.github/workflows/ci.yml','ci_blob':'81a6041478440edd900c7ad9e9dda1c5946f503d',
  'targeted':'npm exec -- borp --timeout 180000 -p "test/http2-response-after-completion.js"','reference':'npm run test:h2:core','license_path':'LICENSE',
  'provenance':['https://github.com/nodejs/undici/commit/e5b3364ddc620c0d1c61424d1278fc0965207477','https://github.com/nodejs/undici/pull/5440'],
  'basis':'Upstream direct-parent fix #5440 adds a completed-request guard in the HTTP/2 response handler and a new regression test driven by fake socket/session/stream objects. The new historical test file is independent upstream evidence and remains absent from the measured tree until a physically separate T075 oracle reconstruction.',
 }
]

root=Path(tempfile.mkdtemp(prefix='t074-build-'))
def g(repo,*args,raw=False):
 p=subprocess.run(['git','-C',str(repo),*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 return p.stdout if raw else p.stdout.decode('utf-8',errors='strict')
def exists(repo,spec):
 return subprocess.run(['git','-C',str(repo),'cat-file','-e',spec],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
def sha(data): return hashlib.sha256(data).hexdigest()
def clone_metadata(spec):
 r=root/spec['case_id']; subprocess.run(['git','init','-q',str(r)],check=True); subprocess.run(['git','-C',str(r),'remote','add','origin',spec['url']],check=True); subprocess.run(['git','-C',str(r),'fetch','-q','--filter=blob:none','--depth=3','origin',spec['fix']],check=True); return r
def revision(repo,commit):
 return {'commit_id':commit,'tree_id':g(repo,'rev-parse',commit+'^{tree}').strip(),'required_parent_ids':g(repo,'show','-s','--format=%P',commit).strip().split()}
def evidence(repo,ref,path):
 blob=g(repo,'rev-parse',f'{ref}:{path}').strip(); data=g(repo,'cat-file','blob',blob,raw=True); return {'path':path,'blob_id':blob,'sha256':sha(data)}
def license_review(repo,ref,path,role):
 ev=evidence(repo,ref,path); text=g(repo,'cat-file','blob',ev['blob_id']); assert 'Permission is hereby granted' in text and 'THE SOFTWARE IS PROVIDED' in text
 return {'spdx_expression':'MIT','evidence':[ev],'review_note':f'Exact {role} Git object contains the reviewed MIT license text; no license path changes in the target direct-parent delta.'}
def added_line_numbers(repo,base,fix,path):
 out=[]
 diff=g(repo,'diff','--unified=0',base,fix,'--',path)
 for line in diff.splitlines():
  if not line.startswith('@@'): continue
  m=re.search(r'\+(\d+)(?:,(\d+))?',line); assert m
  start=int(m.group(1)); count=int(m.group(2) or '1'); out.extend(range(start,start+count))
 return set(out)

def command_procedure(spec,test_base_exists):
 test_state=('preserve the regression-test path at its exact base blob in the measured repository' if test_base_exists else 'preserve the regression-test path as absent in the measured repository because the historical test file is new in the fix')
 return [
  f'Pinned T075 targeted oracle command: `{spec["targeted"]}`. Pinned project-native reference command: `{spec["reference"]}`. T075 must prove every listed regression_test_id executed; file-level success alone is not oracle evidence.',
  f'Measured reconstruction: checkout exact base commit as HEAD with index/worktree equal to HEAD; overlay only the listed production fix blobs as unstaged changes; {test_state}; require the complete working-tree-vs-HEAD changed-path set to equal the listed production paths exactly, with no staged or unexpected non-runtime untracked paths.',
  'Pre-fix oracle reconstruction: use a physically separate repository/worktree inaccessible to Ascout measurement, start from the same exact base state, apply only the exact historical regression-test change from the pinned fix commit while leaving production at base bytes, execute the pinned targeted oracle command, and require the historical regression to fail as a valid test observation rather than setup/runner failure.',
  'Fixed oracle reconstruction: in the same isolated oracle protocol, apply the identical historical regression-test bytes plus only the exact listed production fix blobs, execute the identical targeted command, and require the historical regression to pass.',
  'Repeat valid pre-fix/fixed oracle observations according to the benchmark determinism protocol. Destroy or quarantine oracle worktrees and evidence before selector/Ascout measurement; never copy the historical regression-test patch, expected assertions, or oracle-only metadata into the measured repository.',
  'At T075 record the measured derived tree identity and refuse replay if reconstruction identity, exact toolchain identity, regression-test withholding, changed-path set, or oracle isolation differs from this reviewed definition.'
 ]

try:
 path=Path('benchmarks/manifest.json'); manifest=json.loads(path.read_text()); assert manifest['manifest_revision']==4
 assert len([c for c in manifest['cases'] if c['case_class']=='selection'])==6
 assert len([c for c in manifest['cases'] if c['case_class']=='gap'])==0
 new=[]
 for spec in SPECS:
  print('BUILD',spec['case_id']); repo=clone_metadata(spec); fix=spec['fix']; fixrev=revision(repo,fix); assert len(fixrev['required_parent_ids'])==1; base=fixrev['required_parent_ids'][0]; baserev=revision(repo,base)
  changed=set(g(repo,'diff','--name-only',base,fix).splitlines()); assert changed==set(spec['production']+spec['tests'])
  # Verify only reviewed executable changed lines are named.
  for p,line in spec['gap_lines']:
   assert p in spec['production']; assert line in added_line_numbers(repo,base,fix,p)
   text=g(repo,'show',f'{fix}:{p}').splitlines()[line-1].strip(); assert text and not text.startswith('//') and not text.startswith('/*') and not text.startswith('*')
  # Exact historical regression identities must be present in the fix test blob.
  test_text='\n'.join(g(repo,'show',f'{fix}:{p}') for p in spec['tests'])
  for tid in spec['test_ids']: assert tid in test_text
  # Runtime / lock / CI provenance.
  lock_ev=evidence(repo,fix,spec['lock']); ci_ev=evidence(repo,fix,spec['ci_path']); assert ci_ev['blob_id']==spec['ci_blob']
  pkg=json.loads(g(repo,'show',f'{fix}:package.json'))
  if spec['case_id']=='immer-prototype-undefined':
   assert pkg['scripts']['test']=='vitest run && yarn test:build && yarn test:flow'; assert pkg['scripts']['test:src']=='vitest run'; assert spec['pm_version']==YARN_VERSION
   ci=g(repo,'show',f'{fix}:{spec["ci_path"]}'); assert 'node-version: 24' in ci and 'yarn install' in ci
   pmprov=f'Benchmark exact Yarn Classic pin {YARN_VERSION}, proven by yarnpkg/yarn tag v{YARN_VERSION} at {YARN_TAG_COMMIT}; exact donor yarn.lock is v1 and exact CI blob {spec["ci_blob"]} uses yarn install.'
   nodeprov=[f'Exact donor CI blob {spec["ci_blob"]} selects Node major 24.',f'Benchmark resolves that reviewed major deterministically to exact Node {NODE_VERSION}; nodejs/node v{NODE_VERSION} tag resolves to {NODE_TAG_COMMIT}.']
  else:
   assert spec['pm_version']==NPM_VERSION
   pmprov=f'Exact npm {NPM_VERSION} is bundled by nodejs/node v{NODE_VERSION} commit {NODE_TAG_COMMIT} (deps/npm/package.json) and independently pinned by npm/cli v{NPM_VERSION} tag commit {NPM_TAG_COMMIT}.'
   if spec['case_id']=='axios-tojson-dag':
    assert pkg['scripts']['test']=='npm run test:vitest'; assert pkg['scripts']['test:vitest:unit']=='vitest run --project unit'; ci=g(repo,'show',f'{fix}:{spec["ci_path"]}'); assert 'node-version: 24.x' in ci and 'npm ci --ignore-scripts' in ci
    nodeprov=[f'Exact donor CI blob {spec["ci_blob"]} selects Node 24.x and npm ci --ignore-scripts.',f'Benchmark resolves 24.x deterministically to exact Node {NODE_VERSION}; nodejs/node v{NODE_VERSION} tag resolves to {NODE_TAG_COMMIT}.']
   else:
    assert pkg['engines']['node']=='>=22.19.0'; assert pkg['scripts']['test:h2:core']=='borp --timeout 180000 -p "test/+(http2|h2)*.js"'; ci=g(repo,'show',f'{fix}:{spec["ci_path"]}'); assert "node-version: ['22', '24', '25', '26']" in ci
    nodeprov=[f'Exact donor package.json blob {g(repo,"rev-parse",f"{fix}:package.json").strip()} requires Node >=22.19.0.',f'Exact donor CI blob {spec["ci_blob"]} includes Node 24 in its test matrix.',f'Benchmark selects exact Node {NODE_VERSION}, whose tag resolves to {NODE_TAG_COMMIT}, satisfying both constraints.']
  # License evidence at each exact state.
  licbase=license_review(repo,base,spec['license_path'],'base'); licfix=license_review(repo,fix,spec['license_path'],'fix'); assert licbase['evidence'][0]['blob_id']==licfix['evidence'][0]['blob_id']
  test_base_exists=all(exists(repo,f'{base}:{p}') for p in spec['tests'])
  case={
   'case_id':spec['case_id'],'case_revision':1,'case_class':'gap','lifecycle_state':'CASE_REVIEWED',
   'upstream':{'canonical_url':spec['url'],'repository_name':spec['repo'],'provenance_urls':spec['provenance']},
   'git':{'base':baserev,'fix':fixrev,'oracle':fixrev,'relationship':{'kind':'direct_parent','required_parent_commit_id':base,'rationale':'The benchmark definition measures exactly the reviewed direct-parent production delta; the pinned fix commit has the exact base commit as its sole parent.'}},
   'paths':{'production':spec['production'],'regression_tests':spec['tests']},
   'reconstruction':{'mode':'base_plus_production_fix','steps':[
      f'Checkout exact base commit {base} as measured HEAD with index and worktree equal to HEAD.',
      'Overlay only the exact listed production-path blobs from the pinned fix commit into the measured worktree without staging them.',
      ('Keep every listed regression-test path byte-identical to its exact base blob; do not apply the historical regression-test change to the measured repository.' if test_base_exists else 'Keep every listed regression-test path absent because it is new in the fix; do not create the historical regression-test file in the measured repository.'),
      'Require the complete working-tree-vs-HEAD changed-path set to equal the listed production paths exactly; reject staged changes, regression-test changes, ancillary fix content, or unexpected non-runtime untracked paths.',
      'At T075 record the deterministic derived Git tree identity and refuse replay if a repeated reconstruction differs.'
    ],'measured_diff_contains_regression_test_change':False,'derived_identity':{'algorithm':'git-tree','expected_digest':None}},
   'runtime':{'package_manager':spec['pm'],'package_manager_version':spec['pm_version'],'package_manager_version_provenance':pmprov,'lockfile':lock_ev,'node_version':NODE_VERSION,'node_constraint_provenance':nodeprov,'immutable_harness_artifact':{'required':False,'sha256':None,'reason':'The reviewed donor state is reproducible from exact Git objects, exact lockfile bytes, and exact Node/package-manager identities; T075 must refuse any toolchain mismatch rather than rely on a floating packaged image.'}},
   'licensing':{'base':licbase,'fix':licfix,'oracle':licfix,'file_level_review':{'status':'CLEAR','notes':'Reviewed target production and regression-test paths are covered by the repository MIT license at the exact base/fix/oracle states; T074 redistributes no donor source or patch content.'}},
   'oracle':{'specification':{'regression_test_ids':spec['test_ids'],'historical_basis':spec['basis'],'ground_truth_procedure':command_procedure(spec,test_base_exists),'independence_statement':'Ground truth is defined solely from exact upstream Git history and the upstream-authored regression test change. It is not derived from Ascout selection, coverage, receipts, or benchmark outcomes.','gap_changed_executable_lines':[{'path':p,'line':line} for p,line in spec['gap_lines']]},'observation':None},
   'provenance':{'issue_or_pr_urls':spec['provenance'],'review_notes':f'Reviewed T074 gap case from exact direct-parent upstream history. Changed paths are exactly {spec["production"] + spec["tests"]}; measured reconstruction withholds the historical regression-test change and applies only production blobs. Definition-only review used Git-object metadata; no donor checkout for execution, install, script, build, or test occurred.'},
   'limitations':['T074 is definition-only: no donor code, dependency, script, build, or test execution has occurred; all oracle observations remain unknown until T075.','The exact Node/package-manager selection is benchmark-owned but constrained by exact upstream CI/engine metadata and must be enforced fail-closed by T075.','Only the listed changed executable production lines are claimed as the historical material exercise-gap target; T075 must determine actual stable exercise evidence without inferring it from this definition.']
  }
  new.append(case)
 manifest['manifest_revision']=5; manifest['cases'].extend(new)
 assert len([c for c in manifest['cases'] if c['case_class']=='gap'])==3
 keys=[(c['case_id'],c['case_revision']) for c in manifest['cases']]; assert len(keys)==len(set(keys))
 Draft202012Validator.check_schema(manifest['case_schema']); validator=Draft202012Validator(manifest['case_schema'],format_checker=FormatChecker())
 for c in manifest['cases']: validator.validate(c)
 for c in new:
  assert c['oracle']['observation'] is None and c['reconstruction']['derived_identity']['expected_digest'] is None and 'synthetic_head' not in c['reconstruction']
 path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
 print('T074 three-case manifest build PASS')
 print('CASES='+','.join(c['case_id'] for c in new))
 print('DONOR_CHECKOUT=NO')
 print('DONOR_DEPENDENCY_INSTALL=NO')
 print('DONOR_SCRIPT_EXECUTION=NO')
 print('DONOR_TEST_EXECUTION=NO')
finally:
 shutil.rmtree(root,ignore_errors=True)
