import copy, hashlib, json, re, shutil, subprocess, tempfile
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

m=json.loads(Path('benchmarks/manifest.json').read_text())
assert m['manifest_revision']==3 and len(m['cases'])==6
assert {c['case_id'] for c in m['cases']}=={
 'zod-scientific-exponents','zod-jitless-allows-eval','tanstack-streamed-query-reducer',
 'zustand-persist-latest-state','react-hook-form-value-as-date','trpc-streaming-onerror-cause'}
Draft202012Validator.check_schema(m['case_schema'])
v=Draft202012Validator(m['case_schema'],format_checker=FormatChecker())
gid=re.compile(r'^(?:[0-9a-f]{40}|[0-9a-f]{64})$')
root=Path(tempfile.mkdtemp(prefix='t073-exact-final-'))

def g(repo,*args,raw=False):
 p=subprocess.run(['git','-C',str(repo),*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 return p.stdout if raw else p.stdout.decode('utf-8')

try:
 for c in m['cases']:
  cid=c['case_id']; print('VERIFY',cid)
  assert c['case_revision']==2 and c['case_class']=='selection' and c['lifecycle_state']=='CASE_REVIEWED'
  assert c['oracle']['observation'] is None
  assert c['reconstruction']['derived_identity']['expected_digest'] is None
  assert c['reconstruction']['measured_diff_contains_regression_test_change'] is False
  v.validate(c)
  sh=c['reconstruction']['synthetic_head']
  assert sh['recipe_version']=='git-commit-object-v1' and sh['git_object_format']=='sha1'
  assert sh['tree_source']=='reconstruction.derived_identity.expected_digest'
  assert sh['parent_commit_ids']==[c['git']['base']['commit_id']]
  assert sh['object_hash_algorithm']=='sha1-git-object-header-plus-payload-v1'
  assert hashlib.sha256(sh['payload_template_utf8'].encode()).hexdigest()==sh['payload_template_sha256']
  assert sh['author']==sh['committer']=={'name':'Ascout Benchmark Harness','email':'ascout-benchmark@users.noreply.github.com','git_timestamp':'946684800 +0000'}
  assert sh['message_utf8']=='Ascout benchmark synthetic baseline v1\n'
  assert sh['encoding_header'] is None and sh['signing']=='forbidden' and sh['extra_headers']==[] and sh['result_commit_id'] is None
  sample_tree='1'*40; sample_parent=c['git']['base']['commit_id']
  payload=sh['payload_template_utf8'].replace('{derived_tree_id}',sample_tree).replace('{base_commit_id}',sample_parent).encode()
  pyhash=hashlib.sha1(b'commit '+str(len(payload)).encode()+b'\0'+payload).hexdigest()
  hp=subprocess.run(['git','hash-object','-t','commit','--stdin','--literally'],input=payload,stdout=subprocess.PIPE,check=True).stdout.decode().strip()
  assert pyhash==hp
  repo=root/cid; subprocess.run(['git','init','-q',str(repo)],check=True)
  subprocess.run(['git','-C',str(repo),'remote','add','origin',c['upstream']['canonical_url']],check=True)
  fix=c['git']['fix']['commit_id']; base=c['git']['base']['commit_id']
  subprocess.run(['git','-C',str(repo),'fetch','-q','--depth=3','--filter=blob:none','origin',fix],check=True)
  for role in ('base','fix','oracle'):
   r=c['git'][role]; assert gid.fullmatch(r['commit_id']) and gid.fullmatch(r['tree_id'])
   g(repo,'cat-file','-e',r['commit_id']+'^{commit}')
   assert g(repo,'rev-parse',r['commit_id']+'^{tree}').strip()==r['tree_id']
   assert g(repo,'show','-s','--format=%P',r['commit_id']).strip().split()==r['required_parent_ids']
  assert c['git']['fix']['required_parent_ids']==[base] and c['git']['oracle']==c['git']['fix']
  assert c['git']['relationship']['kind']=='direct_parent' and c['git']['relationship']['required_parent_commit_id']==base
  changed=set(g(repo,'diff','--name-only',base,fix).splitlines())
  for p in c['paths']['production']+c['paths']['regression_tests']:
   assert p in changed; g(repo,'cat-file','-e',f'{fix}:{p}')
   assert not g(repo,'cat-file','blob',f'{fix}:{p}',raw=True).startswith(b'version https://git-lfs.github.com/spec/v1')
  for p in c['paths']['production']: g(repo,'cat-file','-e',f'{base}:{p}')
  ar=c['reconstruction']['ancillary_review']
  ancillary=changed-set(c['paths']['production'])-set(c['paths']['regression_tests'])
  assert set(ar['changed_paths'])==ancillary
  keep=set(ar['preserved_allowlist']); drop=set(ar['excluded_from_derived_baseline'])
  assert not (keep&drop) and keep|drop==ancillary
  if cid=='tanstack-streamed-query-reducer':
   assert ancillary=={'.changeset/fair-peaches-deny.md'} and not keep and drop==ancillary
   absent=subprocess.run(['git','-C',str(repo),'cat-file','-e',f'{base}:.changeset/fair-peaches-deny.md'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   assert absent.returncode!=0
   assert 'Fix streamedQuery reducer being called twice' in g(repo,'show',f'{fix}:.changeset/fair-peaches-deny.md')
  else: assert ancillary==set() and keep==set() and drop==set()
  lock=c['runtime']['lockfile']; lb=g(repo,'rev-parse',f'{fix}:{lock["path"]}').strip(); assert lb==lock['blob_id']
  assert hashlib.sha256(g(repo,'cat-file','blob',lb,raw=True)).hexdigest()==lock['sha256']
  for role in ('base','fix','oracle'):
   ref=c['git'][role]['commit_id']; lr=c['licensing'][role]; assert lr['spdx_expression']=='MIT'
   for e in lr['evidence']:
    b=g(repo,'rev-parse',f'{ref}:{e["path"]}').strip(); data=g(repo,'cat-file','blob',b,raw=True)
    assert b==e['blob_id'] and hashlib.sha256(data).hexdigest()==e['sha256'] and data.startswith(b'MIT License')
  assert not [x for x in g(repo,'ls-tree','-r',fix).splitlines() if x.startswith('160000 ')]
  for tid in c['oracle']['specification']['regression_test_ids']:
   leaf=tid.split(' > ')[-1]
   assert any(leaf in g(repo,'cat-file','blob',f'{fix}:{p}') for p in c['paths']['regression_tests'])
  cmd=c['oracle']['specification']['ground_truth_procedure'][1]
  assert cmd.startswith('Pinned T075 project-native command contract') and 'file-level success alone is not oracle evidence' in cmd
  pkg=json.loads(g(repo,'cat-file','blob',f'{fix}:package.json')); pm=c['runtime']['package_manager_version']
  if cid=='react-hook-form-value-as-date':
   a=g(repo,'cat-file','blob',f'{fix}:.github/actions/install-dependencies/action.yml')
   assert 'version: 11.7.0' in a and 'node-version: 22' in a and pm=='11.7.0'
   assert pkg['scripts']['test']=='jest --config ./scripts/jest/jest.config.js' and '--findRelatedTests src/logic/validateField.ts' in cmd
  else: assert pkg.get('packageManager')==f'pnpm@{pm}'
  if cid.startswith('zod-'): assert pkg['scripts']['test']=='vitest run' and 'pnpm exec vitest related packages/zod/src/v4/core/util.ts --run' in cmd
  if cid=='tanstack-streamed-query-reducer':
   q=json.loads(g(repo,'cat-file','blob',f'{fix}:packages/query-core/package.json'))
   assert pkg['scripts']['test']=='pnpm run test:ci' and q['scripts']['test:lib']=='vitest'
   assert g(repo,'cat-file','blob',f'{fix}:.nvmrc').strip()=='24.8.0' and c['runtime']['node_version']=='24.8.0'
  if cid=='zustand-persist-latest-state': assert pkg['scripts']['test:spec']=='vitest run'
  if cid=='trpc-streaming-onerror-cause': assert pkg['scripts']['test']=='vitest' and 'plain-project non-watch comparator = `pnpm test -- --run`' in cmd
 # Negative schema gates.
 bad=copy.deepcopy(m['cases'][0]); del bad['reconstruction']['synthetic_head']; assert list(v.iter_errors(bad))
 bad=copy.deepcopy(m['cases'][0]); bad['reconstruction']['synthetic_head']['result_commit_id']='0'*40; assert list(v.iter_errors(bad))
 bad=copy.deepcopy(m['cases'][0]); bad['oracle']['observation']={'t075_run_id':'x','evidence_sha256':'0'*64,'valid_observation_count':2,'status':'ORACLE_VERIFIED'}; assert list(v.iter_errors(bad))
 for version in sorted({c['runtime']['node_version'] for c in m['cases']}):
  out=subprocess.run(['git','ls-remote','--tags','https://github.com/nodejs/node.git',f'refs/tags/v{version}'],check=True,stdout=subprocess.PIPE,text=True).stdout
  assert out.strip(),version
 print('T073 exact-head donor/schema/synthetic/ancillary/command evidence PASS')
finally:
 shutil.rmtree(root,ignore_errors=True)
