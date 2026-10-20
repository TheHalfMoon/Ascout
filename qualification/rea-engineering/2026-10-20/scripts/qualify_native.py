"""Source-bound native check capture with no live sampling overhead."""
import argparse,hashlib,json,os,pathlib,platform,subprocess,sys,time,uuid
HERE=pathlib.Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('name');p.add_argument('--cwd',type=pathlib.Path,required=True);p.add_argument('--timeout',type=int,default=3600)
sep=sys.argv.index('--');args=p.parse_args(sys.argv[1:sep]);argv=sys.argv[sep+1:]
if not argv:raise ValueError('Command is required')
cwd=args.cwd.resolve();out=HERE/'runs';out.mkdir(exist_ok=True);identity=args.name+'-'+str(uuid.uuid4());base=out/identity
def sha(data):return hashlib.sha256(data).hexdigest()
def source():
 def git(*words):return subprocess.check_output(['git',*words],cwd=cwd)
 return {'head':git('rev-parse','HEAD').decode().strip(),'head_tree':git('rev-parse','HEAD^{tree}').decode().strip(),'status':git('status','--porcelain=v1').decode('utf-8'),'diff_sha256':sha(git('diff','HEAD','--binary'))}
initial=source();script=pathlib.Path(__file__).read_bytes();snapshots=out/'harness';snapshots.mkdir(exist_ok=True);(snapshots/(sha(script)+'.py')).write_bytes(script)
record={'name':args.name,'execution_id':identity,'started_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'argv':argv,'cwd':str(cwd),'source_start':initial,'state':'RUNNING','outer_capture_deadline_seconds':args.timeout,'individual_deadlines_changed':False,'resource_sampling':'DISABLED: avoid process-tree observation overhead; no RSS/CPU measurement claimed','platform':platform.platform(),'harness_sha256':sha(script),'stdout':base.name+'.stdout.txt','stderr':base.name+'.stderr.txt'}
def persist():base.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
persist()
allowed={'PATH','SYSTEMROOT','SYSTEMDRIVE','COMSPEC','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATHEXT','PROGRAMFILES','PROGRAMFILES(X86)','WINDIR','HOMEDRIVE','HOMEPATH','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE','OS'}
env={k:v for k,v in os.environ.items() if k.upper() in allowed};env.update({'CI':'true','DO_NOT_TRACK':'1','E2E_TELEMETRY_DISABLED':'1','GRAFT_TELEMETRY':'0','PYTHONDONTWRITEBYTECODE':'1'})
tmp=HERE/'tmp';tmp.mkdir(exist_ok=True);env['TMPDIR']=str(tmp)
start=time.perf_counter()
with base.with_suffix('.stdout.txt').open('wb') as stdout,base.with_suffix('.stderr.txt').open('wb') as stderr:
 try:
  child=subprocess.Popen(argv,cwd=cwd,env=env,stdout=stdout,stderr=stderr);record['pid']=child.pid;persist()
  try:child.wait(timeout=args.timeout);record['state']='EXECUTED'
  except subprocess.TimeoutExpired:
   record['state']='OUTER_TIMEOUT'
   sys.path.insert(0,str(HERE.parent/'venv/Lib/site-packages'));import psutil
   try:
    owned=[(x.pid,x.create_time()) for x in psutil.Process(child.pid).children(recursive=True)]
    for pid,created in reversed(owned):
     try:
      q=psutil.Process(pid)
      if q.create_time()==created:q.kill()
     except psutil.Error:pass
   except psutil.Error:pass
   child.kill();child.wait()
  record['exit']=child.returncode
 except OSError as error:record.update(state='LAUNCH_ERROR',error=str(error),exit=None)
record['wall_seconds']=time.perf_counter()-start;record['source_end']=source();record['source_unchanged']=record['source_start']==record['source_end']
for stream in ['stdout','stderr']:record[stream+'_sha256']=sha((out/record[stream]).read_bytes())
record['finished_at_utc']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());persist()
print(json.dumps(record));sys.exit(0)
