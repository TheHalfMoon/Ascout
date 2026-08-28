import copy, hashlib, json, re, shutil, subprocess, tempfile
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

m=json.loads(Path('benchmarks/manifest.json').read_text())
assert m['manifest_revision']==6
selection=[c for c in m['cases'] if c['case_class']=='selection']
gaps=[c for c in m['cases'] if c['case_class']=='gap']
assert len(selection)==6 and len(gaps)==3
assert {c['case_id'] for c in gaps}=={'immer-prototype-undefined','axios-tojson-dag','undici-h2-late-response'}
expected_rev={'immer-prototype-undefined':1,'axios-tojson-dag':1,'undici-h2-late-response':2}
Draft202012Validator.check_schema(m['case_schema'])
v=Draft202012Validator(m['case_schema'],format_checker=FormatChecker())
for c in m['cases']: v.validate(c)

NODE_VERSION='24.0.0'; NODE_TAG='c5349f43cd66d2aa02d86414c9ed426f71d3ae48'; NPM_VERSION='11.3.0'; NPM_TAG='5bd086babba5f5b41548609405218c5e892bca7f'; YARN_VERSION='1.22.22'; YARN_TAG='740c38c3a962c30ddb344a919bbfb7065620714b'
root=Path(tempfile.mkdtemp(prefix='t074-exact-'))
def run(repo,*args,raw=False,check=True):
 p=subprocess.run(['git','-C',str(repo),*args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=check)
 return p.stdout if raw else p.stdout.decode('utf-8',errors='strict')
def exists(repo,spec): return subprocess.run(['git','-C',str(repo),'cat-file','-e',spec],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
def sha(data): return hashlib.sha256(data).hexdigest()
def added(repo,base,fix,path):
 out=set()
 for h in run(repo,'diff','--unified=0',base,fix,'--',path).splitlines():
  if not h.startswith('@@'): continue
  mm=re.search(r'\+(\d+)(?:,(\d+))?',h); assert mm
  start=int(mm.group(1)); count=int(mm.group(2) or '1'); out.update(range(start,start+count))
 return out
try:
 for c in gaps:
  cid=c['case_id']; print('VERIFY',cid)
  assert c['case_revision']==expected_rev[cid] and c['lifecycle_state']=='CASE_REVIEWED'
  assert c['oracle']['observation'] is None and c['reconstruction']['derived_identity']['expected_digest'] is None
  assert c['reconstruction']['mode']=='base_plus_production_fix' and c['reconstruction']['measured_diff_contains_regression_test_change'] is False
  assert 'synthetic_head' not in c['reconstruction']
  assert c['runtime']['node_version']==NODE_VERSION
  r=root/cid; subprocess.run(['git','init','-q',str(r)],check=True); subprocess.run(['git','-C',str(r),'remote','add','origin',c['upstream']['canonical_url']],check=True)
  fix=c['git']['fix']['commit_id']; base=c['git']['base']['commit_id']
  subprocess.run(['git','-C',str(r),'fetch','-q','--filter=blob:none','--depth=3','origin',fix],check=True)
  for role in ('base','fix','oracle'):
   x=c['git'][role]; run(r,'cat-file','-e',x['commit_id']+'^{commit}')
   assert run(r,'rev-parse',x['commit_id']+'^{tree}').strip()==x['tree_id']
   assert run(r,'show','-s','--format=%P',x['commit_id']).strip().split()==x['required_parent_ids']
  assert c['git']['fix']['required_parent_ids']==[base] and c['git']['oracle']==c['git']['fix']
  assert c['git']['relationship']['kind']=='direct_parent' and c['git']['relationship']['required_parent_commit_id']==base
  changed=set(run(r,'diff','--name-only',base,fix).splitlines()); assert changed==set(c['paths']['production']+c['paths']['regression_tests'])
  for p in c['paths']['production']:
   assert exists(r,f'{base}:{p}') and exists(r,f'{fix}:{p}')
  for item in c['oracle']['specification']['gap_changed_executable_lines']:
   p=item['path']; line=item['line']; assert p in c['paths']['production'] and line in added(r,base,fix,p)
   text=run(r,'show',f'{fix}:{p}').splitlines()[line-1].strip(); assert text and not text.startswith(('//','/*','*'))
  test_fix='\n'.join(run(r,'show',f'{fix}:{p}') for p in c['paths']['regression_tests'])
  for tid in c['oracle']['specification']['regression_test_ids']: assert tid in test_fix
  if cid=='undici-h2-late-response':
   assert all(not exists(r,f'{base}:{p}') for p in c['paths']['regression_tests'])
   proc='\n'.join(c['oracle']['specification']['ground_truth_procedure'])
   assert './node_modules/.bin/borp --timeout 180000 -p "test/http2-response-after-completion.js"' in proc
   assert '`npm exec -- borp' not in proc and 'no npm exec/npx/package download fallback is allowed' in proc
   assert any('network-backed executable resolution is forbidden' in x for x in c['limitations'])
  else:
   for p in c['paths']['regression_tests']:
    assert exists(r,f'{base}:{p}') and run(r,'rev-parse',f'{base}:{p}').strip()!=run(r,'rev-parse',f'{fix}:{p}').strip()
  lock=c['runtime']['lockfile']; blob=run(r,'rev-parse',f'{fix}:{lock["path"]}').strip(); data=run(r,'cat-file','blob',blob,raw=True)
  assert blob==lock['blob_id'] and sha(data)==lock['sha256']
  for role in ('base','fix','oracle'):
   lr=c['licensing'][role]; assert lr['spdx_expression']=='MIT'
   ref=c['git'][role]['commit_id']
   for e in lr['evidence']:
    b=run(r,'rev-parse',f'{ref}:{e["path"]}').strip(); d=run(r,'cat-file','blob',b,raw=True)
    assert b==e['blob_id'] and sha(d)==e['sha256'] and b'Permission is hereby granted' in d
  assert c['licensing']['file_level_review']['status']=='CLEAR'
  proc=c['oracle']['specification']['ground_truth_procedure']
  assert any('physically separate repository/worktree inaccessible to Ascout measurement' in s for s in proc)
  assert any('Destroy or quarantine oracle worktrees and evidence before selector/Ascout measurement' in s for s in proc)
  assert any('complete working-tree-vs-HEAD changed-path set to equal the listed production paths exactly' in s for s in c['reconstruction']['steps'])
  pkg=json.loads(run(r,'show',f'{fix}:package.json'))
  if cid=='immer-prototype-undefined':
   assert c['runtime']['package_manager']=='yarn' and c['runtime']['package_manager_version']==YARN_VERSION
   assert pkg['scripts']['test:src']=='vitest run' and pkg['scripts']['test']=='vitest run && yarn test:build && yarn test:flow'
   ci=run(r,'show',f'{fix}:.github/workflows/test.yml'); assert 'node-version: 24' in ci and 'yarn install' in ci
   assert f'{YARN_VERSION}' in c['runtime']['package_manager_version_provenance'] and YARN_TAG in c['runtime']['package_manager_version_provenance']
  elif cid=='axios-tojson-dag':
   assert c['runtime']['package_manager']=='npm' and c['runtime']['package_manager_version']==NPM_VERSION
   assert pkg['scripts']['test']=='npm run test:vitest' and pkg['scripts']['test:vitest:unit']=='vitest run --project unit'
   ci=run(r,'show',f'{fix}:.github/workflows/run-ci.yml'); assert 'node-version: 24.x' in ci and 'npm ci --ignore-scripts' in ci
   assert NPM_TAG in c['runtime']['package_manager_version_provenance']
  else:
   assert c['runtime']['package_manager']=='npm' and c['runtime']['package_manager_version']==NPM_VERSION and pkg['engines']['node']=='>=22.19.0'
   assert pkg['scripts']['test:h2:core']=='borp --timeout 180000 -p "test/+(http2|h2)*.js"'
   ci=run(r,'show',f'{fix}:.github/workflows/ci.yml'); assert "node-version: ['22', '24', '25', '26']" in ci
   assert NPM_TAG in c['runtime']['package_manager_version_provenance']
 # lifecycle fail-closed mutations
 sample=copy.deepcopy(gaps[0]); sample['oracle']['observation']={'t075_run_id':'x','evidence_sha256':'0'*64,'valid_observation_count':2,'status':'ORACLE_VERIFIED'}; assert list(v.iter_errors(sample))
 sample=copy.deepcopy(gaps[0]); sample['reconstruction']['derived_identity']['expected_digest']='0'*40; assert list(v.iter_errors(sample))
 sample=copy.deepcopy(gaps[0]); sample['licensing']['file_level_review']['status']='REJECTED'; assert list(v.iter_errors(sample))
 # independent exact toolchain tag proofs; metadata only, no donor execution
 for name,url,tag,expected in [('node','https://github.com/nodejs/node.git','v24.0.0',NODE_TAG),('npm','https://github.com/npm/cli.git','v11.3.0',NPM_TAG),('yarn','https://github.com/yarnpkg/yarn.git','v1.22.22',YARN_TAG)]:
  out=subprocess.run(['git','ls-remote','--tags',url,f'refs/tags/{tag}^{{}}'],stdout=subprocess.PIPE,text=True,check=True).stdout.strip()
  if not out: out=subprocess.run(['git','ls-remote','--tags',url,f'refs/tags/{tag}'],stdout=subprocess.PIPE,text=True,check=True).stdout.strip()
  assert out and out.split()[0]==expected,(name,out,expected)
 print('T074 exact-head donor/schema/gap-withholding/toolchain/command evidence PASS')
 print('DONOR_CHECKOUT=NO')
 print('DONOR_DEPENDENCY_INSTALL=NO')
 print('DONOR_SCRIPT_EXECUTION=NO')
 print('DONOR_TEST_EXECUTION=NO')
finally:
 shutil.rmtree(root,ignore_errors=True)
