"""Snapshot sanitized qualification evidence; never stages, pushes or changes product source."""
import argparse,hashlib,json,pathlib,re,time,zipfile
ROOT=pathlib.Path(__file__).resolve().parent;DEST=ROOT/'Ascout/qualification/rea-engineering/2026-10-20';DEST.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--exclude-phase',action='append',default=[]);options=parser.parse_args()
def sha(data):return hashlib.sha256(data).hexdigest()
def encode(obj):return (json.dumps(obj,indent=2,ensure_ascii=False)+'\n').encode()
linux_home_prefix='/'+'home/'
user_directory_component='Us'+'ers'
def sanitize(data):
 text=data.decode('utf-8-sig',errors='replace')
 workspace=str(ROOT.parent)
 for value in [workspace,workspace.replace('\\','/'),'/mnt/c/'+workspace.replace('\\','/')[3:]]:
  for power in [4,3,2,1,0]:text=text.replace(value.replace('\\','\\'*(2**power)),'<WORK>')
 text=re.sub(r'(?i)[a-z]:[\\/]+'+user_directory_component+r'[\\/]+[^\\/\s"\']+','<USERPROFILE>',text)
 text=re.sub(r'(?i)/mnt/[a-z]/'+user_directory_component+r'/[^/\s"\\]+','<WSL_USERPROFILE>',text)
 text=re.sub(r'(?i)(?<!\w)'+user_directory_component+r'[\\/]+[^\\/\s"\']+','<USERPROFILE>',text)
 text=re.sub(re.escape(linux_home_prefix)+r'[^/\s"\\]+','<LINUX_HOME>',text)
 return text.encode()
members={};records=[]
private_name_pattern=rb'(?<![A-Za-z0-9])'+re.escape(pathlib.Path.home().name.encode())+rb'(?![A-Za-z0-9])'
def add(name,path):
 data=path.read_bytes();published=sanitize(data)
 if name.startswith('rca-probes/host-memory-') and name.endswith('.json'):
  observation=json.loads(data)
  observation.pop('largest_private_processes',None)
  observation['privacy_notice']='Public derivative retains aggregate memory context only. Process inventory remains private; no task ownership or causal inference follows from memory usage.'
  published=sanitize(encode(observation))
 if name in members:
  assert members[name]==published,'Changed shared member during snapshot: '+name
  return
 if re.search(rb'gh[pousr]_[A-Za-z0-9]{30,}|glpat-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',published):raise ValueError('Credential-format match in '+name)
 if re.search(private_name_pattern,published,re.I) or re.search(rb'[A-Za-z]:[\\/]+'+user_directory_component.encode()+rb'[\\/]+|/mnt/[a-z]/'+user_directory_component.encode()+b'/|'+re.escape(linux_home_prefix.encode())+rb'[A-Za-z0-9_.-]+',published,re.I):raise ValueError('Host path remaining in '+name)
 members[name]=published;records.append({'path':name,'bytes':len(published),'sha256':sha(published),'original_sha256':sha(data),'transformed':data!=published})

def add_owned_fixture_png(name,path):
 # Only the independently inspected synthetic E04 browser fixture is eligible.
 allowed=(ROOT/'phase-e04/testerarmy').resolve()
 assert path.resolve().is_relative_to(allowed)
 data=path.read_bytes();assert data.startswith(b'\x89PNG\r\n\x1a\n')
 members[name]=data;records.append({'path':name,'bytes':len(data),'sha256':sha(data),'original_sha256':sha(data),'transformed':False,'privacy_scope':'Owned synthetic loopback fixture; failure screenshot visually inspected, no personal session or secret material.'})
completed=[];pending=[]
captures=[(path,json.loads(path.read_text(encoding='utf-8'))) for path in sorted((ROOT/'runs').glob('*.json'))]
active_streams={obj[key] for _,obj in captures if obj.get('state')=='RUNNING' for key in ['stdout','stderr'] if key in obj}
for path,obj in captures:
 if obj.get('state')=='RUNNING' or any(obj.get(key) in active_streams for key in ['stdout','stderr']):
  pending.append(obj.get('execution_id'));continue
 add('runs/'+path.name,path);completed.append(obj)
 for stream in ['stdout','stderr']:
  item=ROOT/'runs'/obj[stream]
  if item.exists():add('runs/'+item.name,item)
for path in sorted((ROOT/'runs/harness').glob('*.py')):add('harness/'+path.name,path)
for name in ['source-isolation-event.json','interrupted-run-disposition.json','tool-execution.json','plan-audit.json','dependency-plan-audit.json','governance-current.json','governance-sequencing.json','installation-topology.json','installation-diagnostic.json','installation-selection.json','installation-mutation.json','installation-browser.json','rca-findings.json','diagnosis-notes.md','npm-audit.json','npm-audit-production.json','dependency-enrichment.json','install-script-inventory.json','main-ci-jobs.json','research-ci-jobs.json','review-amendment-effective.json','all-branches.json','plan-ocr-preview.json','github-status.json','host-context-latest.json']:
 path=ROOT/name
 if path.exists():add('context/'+name,path)
for path in sorted((ROOT/'publication-receipts').glob('*.json')):add('publication-receipts/'+path.name,path)
for path in sorted((ROOT/'runs').glob('full-suite-main-serial-*.txt')):add('interrupted/'+path.name,path)
for phase in ['phase-e01','phase-e02','phase-e03','phase-e04','phase-e05']:
 if phase in options.exclude_phase:continue
 directory=ROOT/phase
 if not directory.exists():continue
 # Publish only finalized phase snapshots, not an actively changing builder directory.
 if not any(directory.glob('manifest*.json')):continue
 for path in sorted(directory.rglob('*')):
  if phase=='phase-e04' and path.suffix=='.png' and path.is_file() and path.is_relative_to(directory/'testerarmy'):
   add_owned_fixture_png('phases/'+phase+'/'+path.relative_to(directory).as_posix(),path);continue
  if path.is_file() and path.suffix in ['.json','.jsonl','.log','.txt','.md','.html','.mjs','.cjs','.py','.ts','.patch'] and 'node_modules' not in path.parts:
   add('phases/'+phase+'/'+path.relative_to(directory).as_posix(),path)
for path in sorted((ROOT/'rca-probes').glob('*')):
 if path.is_file():add('rca-probes/'+path.name,path)
for name in ['qualify_native.py','run_check.py','trace_git.cjs','rca_sampler_probe.py','premerge_gate.py','record_merge.py','verify_publication.py','github_frontier.py','capture_shadow_artifact.py','publish_evidence.py','recover_native_capture.py','summarize_integrated_local.py','check_publication_syntax.py']:
 add('scripts/'+name,ROOT/name);(DEST/'scripts').mkdir(exist_ok=True);(DEST/'scripts'/name).write_bytes(sanitize((ROOT/name).read_bytes()).replace(b'\r\n',b'\n'))
historical=ROOT.parent/'Ascout/research/rea/2026-10-20/expansion'
for name in ['ascout-native-full.json','ascout-native-windows-single-worker.json']:
 add('historical/'+name,historical/name)
if 'phase-e03' not in options.exclude_phase:
 for path in sorted(historical.glob('stryker-*-mutants.json')):add('frozen-stryker/'+path.name,path)
for path in sorted((ROOT/'github-frontier').rglob('*.json')):add('github-frontier/'+path.relative_to(ROOT/'github-frontier').as_posix(),path)
for path in sorted((ROOT/'merges').glob('*.json')):add('merges/'+path.name,path)
for path in sorted((ROOT/'research-integration').glob('*')):
 if path.is_file() and path.suffix in ['.json','.log','.txt','.md']:add('research-integration/'+path.name,path)
for path in sorted((ROOT/'packet-review').glob('*')):
 if path.is_file() and path.suffix in ['.json','.log','.txt','.md']:add('packet-review/'+path.name,path)
manifest={'schema_version':1,'authority':'QUALIFICATION_OBSERVATIONS_ONLY','notice':'Sanitized derivative; original/published hashes differ where host paths changed. Not canonical product receipts, authenticated attestations, or release approval. Pending live runs and explicitly active phase directories are excluded from this snapshot.','pending_runs_excluded':pending,'active_phase_directories_excluded':options.exclude_phase,'records':records}
members['MANIFEST.json']=encode(manifest)
with zipfile.ZipFile(DEST/'evidence.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(members.items()):z.writestr(name,data)
with zipfile.ZipFile(DEST/'evidence.zip') as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(set(z.namelist()))
 for item in records:assert sha(z.read(item['path']))==item['sha256']
lock={'created_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'evidence_zip_sha256':sha((DEST/'evidence.zip').read_bytes()),'archive_members':len(members),'finished_capture_records':len(completed),'pending_live_runs_excluded':pending,'active_phase_directories_excluded':options.exclude_phase,'scope':'bounded integrity/privacy scan; not security/release certification'}
(DEST/'evidence-lock.json').write_bytes(encode(lock));print(json.dumps(lock))
