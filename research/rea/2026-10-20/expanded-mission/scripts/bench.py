import hashlib,json,os,pathlib,platform,subprocess,sys,time,uuid,xml.etree.ElementTree as ET
from prepare import ROOT,OUT
import psutil

ENV={k:v for k,v in os.environ.items() if k.upper() in ['PATH','SYSTEMROOT','COMSPEC','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATHEXT','PROGRAMFILES','PROGRAMFILES(X86)','WINDIR']}
ENV.update({'PYTHONDONTWRITEBYTECODE':'1','PYTEST_DISABLE_PLUGIN_AUTOLOAD':'1','E2E_TELEMETRY_DISABLED':'1','GRAFT_TELEMETRY':'0','NX_DAEMON':'false','NX_NO_CLOUD':'true','NX_SKIP_NX_CACHE':'true','CI':'true','DO_NOT_TRACK':'1','SEMGREP_SEND_METRICS':'off'})

def clean(s):
 roots=[str(ROOT),str(ROOT).replace('\\','/'),'/mnt/c/'+str(ROOT).replace('\\','/')[3:]]
 for root in roots:
  for levels in [3,2,1,0]:s=s.replace(root.replace('\\','\\'*(2**levels)),'<WORK>')
 return s

def fixture_manifest(cwd):
 files=[]
 if 'fixtures' in pathlib.Path(cwd).parts:
  for p in sorted(pathlib.Path(cwd).rglob('*')):
   rel=p.relative_to(cwd)
   if any(part.startswith('.') or part in ['chrome-profile','__pycache__','node_modules'] for part in rel.parts):continue
   if not p.is_file() or p.suffix not in ['.py','.js','.mjs','.cjs','.ts','.txt','.html','.tf','.yaml','.yml','.toml','.json']:continue
   if p.name in ['results.xml','mutation.json','impact.json'] or p.name.startswith('gitleaks-'):continue
   files.append({'path':rel.as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
  for p in pathlib.Path(cwd).glob('.testmondata*'):
   if p.is_file():files.append({'path':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
 return {'files':files,'sha256':hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()}
def run(name,argv,cwd,stdin=None,timeout=60,extra=None):
 env=dict(ENV);env.update(extra or {});start=time.perf_counter();peak=0;cpu=0;timed=False
 started=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());run_id=str(uuid.uuid4());manifest=fixture_manifest(cwd)
 harness={}
 snapshots=ROOT/'harness-versions';snapshots.mkdir(exist_ok=True)
 for script_name in ['acquire.py','prepare.py','bench.py','morebench.py','qualify.py','extras.py','provenance_probe.py','audit_extra.py']:
  p=ROOT/script_name
  if p.exists():
   data=p.read_bytes();digest=hashlib.sha256(data).hexdigest();harness[script_name]=digest
   dest=snapshots/(digest+'.py')
   if not dest.exists():dest.write_bytes(data)
 try:
  p=subprocess.Popen([str(a) for a in argv],cwd=cwd,env=env,stdin=subprocess.PIPE if stdin else subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  if stdin:p.stdin.write(stdin.encode());p.stdin.close();p.stdin=None
  # communicate in a thread so pipes cannot deadlock while sampling descendants.
  import concurrent.futures
  with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
   future=pool.submit(p.communicate)
   while not future.done():
    try:
     parent=psutil.Process(p.pid);procs=[parent,*parent.children(recursive=True)]
     rss=0;times=0
     for q in procs:
      try:rss+=q.memory_info().rss;t=q.cpu_times();times+=t.user+t.system
      except psutil.Error:pass
     peak=max(peak,rss);cpu=max(cpu,times)
    except psutil.Error:pass
    if time.perf_counter()-start>timeout:
     timed=True
     for q in reversed(procs):
      try:q.kill()
      except psutil.Error:pass
     p.kill()
    time.sleep(.02)
   stdout,stderr=future.result()
  record={'status':'TIMEOUT' if timed else 'EXECUTED','exit':p.returncode,'stdout':clean(stdout.decode(errors='replace')),'stderr':clean(stderr.decode(errors='replace')),'sampled_peak_tree_rss_bytes':peak,'sampled_max_tree_cpu_seconds':cpu}
 except Exception as e:record={'status':'ERROR','error':clean(str(e))}
 record.update({'name':name,'run_id':run_id,'started_at_utc':started,'fixture_manifest':manifest,'harness_sha256':harness,'argv':[clean(str(a)) for a in argv],'cwd':clean(str(cwd)),'platform':platform.platform(),'wall_seconds':time.perf_counter()-start,'resource_limitations':'20ms sampling; peak RSS sum can double-count shared pages; CPU is maximum observed live tree, not final accounting','environment':'allowlisted host essentials; no inherited provider keys; telemetry disabled where supported','stdin_sha256':hashlib.sha256(stdin.encode()).hexdigest() if stdin else None})
 serialized=json.dumps(record,indent=2)+'\n'
 (OUT/(name+'.json')).write_text(serialized)
 append_only=OUT/'runs';append_only.mkdir(exist_ok=True);(append_only/(run_id+'.json')).write_text(serialized)
 print(name,record['status'],record.get('exit'),round(record['wall_seconds'],3),flush=True)
 return record

def write(root,rel,data):p=root/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(data,encoding='utf-8',newline='\n')
PY=ROOT/'venv/Scripts/python.exe'
def pytest_fixture():
 session=uuid.uuid4().hex[:8]
 for repeat in range(2):
  for case in ['source','data','fixture']:
   d=ROOT/'fixtures'/f'testmon-{case}-{repeat}-{session}';d.mkdir(parents=True,exist_ok=True)
   write(d,'calc.py','def first():\n    return 1\n\ndef second():\n    return 2\n')
   write(d,'value.txt','ok\n')
   write(d,'conftest.py','import pytest\n@pytest.fixture\ndef number():\n    return 3\n')
   write(d,'test_calc.py','from calc import first, second\nfrom pathlib import Path\ndef test_first():\n    assert first() == 1\ndef test_second():\n    assert second() == 2\ndef test_data():\n    assert Path("value.txt").read_text().strip() == "ok"\ndef test_fixture(number):\n    assert number == 3\n')
   base=[PY,'-m','pytest','-p','testmon.pytest_testmon','-vv','--junitxml=results.xml']
   run(f'testmon-{case}-{repeat}-warm',[*base,'--testmon'],d)
   run(f'testmon-{case}-{repeat}-unchanged',[*base,'--testmon'],d)
   if case=='source':write(d,'calc.py','def first():\n    return 99\n\ndef second():\n    return 2\n')
   if case=='data':write(d,'value.txt','bad\n')
   if case=='fixture':write(d,'conftest.py','import pytest\n@pytest.fixture\ndef number():\n    return 99\n')
   expected={'source':'test_first','data':'test_data','fixture':'test_fixture'}[case]
   r=run(f'testmon-{case}-{repeat}-selected',[*base,'--testmon'],d)
   def names():
    try:return [x.attrib['name'] for x in ET.parse(d/'results.xml').iter('testcase')]
    except Exception:return []
   selected=names()
   full=run(f'testmon-{case}-{repeat}-full',[*base,'--no-testmon'],d);alltests=names()
   result={'case':case,'repeat':repeat,'expected_relevant':[expected],'selected':selected,'full_tests':alltests,'selection_recall':int(expected in selected),'missed_relevant':[] if expected in selected else [expected],'selected_exit':r.get('exit'),'full_exit':full.get('exit'),'selection_wall':r['wall_seconds'],'full_wall':full['wall_seconds'],'scope':'four-test controlled fixture; source/fixture mutation and non-Python data mutation; not project-native corpus'}
   (OUT/f'testmon-{case}-{repeat}-comparison.json').write_text(json.dumps(result,indent=2)+'\n')

def reviewdog():
 d=ROOT/'fixtures'/('reviewdog-'+uuid.uuid4().hex[:8]);d.mkdir(parents=True,exist_ok=True)
 for argv in [['git','init','-q'],['git','config','core.autocrlf','false'],['git','config','user.name','REA Fixture'],['git','config','user.email','rea@example.invalid']]:subprocess.run(argv,cwd=d,check=True,capture_output=True)
 write(d,'a.js','const first = 1;\nconst changed = 2;\nconst untouched = 3;\n');write(d,'b.js','const other = 0;\n')
 subprocess.run(['git','add','.'],cwd=d,check=True);subprocess.run(['git','commit','-qm','synthetic baseline'],cwd=d,check=True,capture_output=True)
 write(d,'a.js','const first = 1;\nconst changed = 20;\nconst untouched = 3;\n')
 def diag(rule,file='a.js',line=2,**extra):return dict(ruleId=rule,level='error',message={'text':rule},locations=[{'physicalLocation':{'artifactLocation':{'uri':file},'region':{'startLine':line,'startColumn':1}}}],**extra)
 results=[diag('changed'),diag('same-file',line=3),diag('other-file','b.js',1),diag('suppressed',suppressions=[{'kind':'external','status':'accepted'}]),diag('under-review',suppressions=[{'kind':'external','status':'underReview'}]),dict(ruleId='no-location',level='error',message={'text':'no-location'}),diag('traversal','../outside.js'),diag('uri','file:///outside.js')]
 sarif=json.dumps({'version':'2.1.0','runs':[{'tool':{'driver':{'name':'synthetic'}},'results':results}]});write(d,'input.sarif',sarif)
 for repeat in range(2):
  for mode in ['added','file','nofilter','diff_context']:
   r=run(f'reviewdog-{mode}-{repeat}',[ROOT/'bin/reviewdog/reviewdog.exe','-f=sarif','-reporter=rdjson','-filter-mode='+mode,'-diff=git diff --no-ext-diff HEAD'],d,stdin=sarif)
   try:rules=[x.get('code',{}).get('value',x.get('message')) for x in json.loads(r['stdout']).get('diagnostics',[])]
   except Exception:rules=None
   expected={'added':['changed','under-review'],'file':['changed','same-file','under-review'],'nofilter':['changed','same-file','other-file','under-review','traversal','uri'],'diff_context':['changed','same-file','under-review']}[mode]
   (OUT/f'reviewdog-{mode}-{repeat}-comparison.json').write_text(json.dumps({'raw_result_count':len(results),'emitted_rules':rules,'producer_suppression_completeness':'UNKNOWN from stdout alone','exit':r.get('exit'),'expected_donor_rules_from_source':expected,'matches_donor_source_expectation':rules==expected,'ascout_desired_policy':'retain raw no-location diagnostic as unresolved; count producer-suppressed and filtered observations separately'},indent=2)+'\n')
 run('reviewdog-malformed',[ROOT/'bin/reviewdog/reviewdog.exe','-f=sarif','-reporter=rdjson'],d,stdin='{bad')
 spellings=[('dot','./a.js'),('parent-clean','x/../a.js'),('case','A.js'),('percent','%61.js'),('absolute',str(d/'a.js'))]
 for repeat in range(2):
  report=json.dumps({'version':'2.1.0','runs':[{'tool':{'driver':{'name':'synthetic-paths'}},'results':[diag(label,path) for label,path in spellings]}]})
  run(f'reviewdog-paths-{repeat}',[ROOT/'bin/reviewdog/reviewdog.exe','-f=sarif','-reporter=rdjson','-filter-mode=added','-diff=git diff --no-ext-diff HEAD'],d,stdin=report)

def security():
 d=ROOT/'fixtures/security';d.mkdir(parents=True,exist_ok=True)
 write(d,'danger.js','export function danger(input) { return eval(input); }\n')
 write(d,'safe.js','export function safe(input) { return JSON.parse(input); }\nconst message = "eval(input)";\n')
 write(d,'shadow.js','function local(eval, input) { return eval(input); }\nglobalThis.shadowResult = local((value) => value, "safe");\n')
 run('security-shadow-native-syntax',['node','--check','shadow.js'],d)
 run('security-shadow-native-execution',['node','shadow.js'],d)
 write(d,'rule.yml','rules:\n- id: rea-eval\n  languages: [javascript]\n  message: Dynamic eval candidate\n  severity: ERROR\n  pattern: eval($X)\n')
 for repeat in range(2):run(f'ast-grep-{repeat}',[ROOT/'bin/ast-grep/ast-grep.exe','run','--pattern','eval($X)','--lang','javascript','--json',str(d)],d)
 run('ast-grep-invalid',[ROOT/'bin/ast-grep/ast-grep.exe','run','--pattern','eval($X)','--lang','not-a-language',str(d)],d)
 import random,string
 token='ghp_'+''.join(random.Random(20261020).sample(string.ascii_letters+string.digits,36))
 gitlab='gl'+'pat-'+''.join(random.Random(20261021).sample(string.ascii_letters+string.digits,20))
 write(d,'secrets.txt','token = "'+token+'"\ngitlab_token = "'+gitlab+'"\npublic_id = "not-a-secret"\n')
 for repeat in range(2):
  run(f'gitleaks-{repeat}',[ROOT/'bin/gitleaks/gitleaks.exe','dir',str(d),'--redact=100','--no-banner','--report-format=json','--report-path='+str(d/f'gitleaks-{repeat}.json')],d)
  if (d/f'gitleaks-{repeat}.json').exists():
   # Require the producer to redact before any shared persistence.
   raw=(d/f'gitleaks-{repeat}.json').read_text()
   if token in raw or gitlab in raw:raise RuntimeError('Producer report contains synthetic secret plaintext')
   (OUT/f'gitleaks-{repeat}-findings.json').write_text(clean(raw))
 write(d,'broken.toml','[broken')
 run('gitleaks-invalid',[ROOT/'bin/gitleaks/gitleaks.exe','dir',str(d),'--redact=100','--no-banner','--config='+str(d/'broken.toml')],d)
 for tool,args in [('osv',[ROOT/'bin/osv/osv-scanner_windows_amd64.exe','--version']),('gitleaks',[ROOT/'bin/gitleaks/gitleaks.exe','version']),('ast-grep',[ROOT/'bin/ast-grep/ast-grep.exe','--version']),('reviewdog',[ROOT/'bin/reviewdog/reviewdog.exe','--version'])]:run(tool+'-version',args,d)

if __name__=='__main__':
 for name in sys.argv[1:] or ['testmon','reviewdog','security']:
  {'testmon':pytest_fixture,'reviewdog':reviewdog,'security':security}[name]()
