"""Capture bounded native qualification without changing the repository or test selection."""
import argparse,concurrent.futures,hashlib,json,os,pathlib,platform,subprocess,sys,time,uuid
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'venv/Lib/site-packages'))
import psutil
HERE=pathlib.Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('name');p.add_argument('--cwd',type=pathlib.Path,default=HERE/'Ascout');p.add_argument('--timeout',type=int,default=1800)
separator=sys.argv.index('--');a=p.parse_args(sys.argv[1:separator]);argv=sys.argv[separator+1:]
if not argv:raise ValueError('No command')
allowed={'PATH','SYSTEMROOT','SYSTEMDRIVE','COMSPEC','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATHEXT','PROGRAMFILES','PROGRAMFILES(X86)','WINDIR','HOMEDRIVE','HOMEPATH','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE','OS'}
env={k:v for k,v in os.environ.items() if k.upper() in allowed};env.update({'CI':'true','DO_NOT_TRACK':'1','E2E_TELEMETRY_DISABLED':'1','GRAFT_TELEMETRY':'0','PYTHONDONTWRITEBYTECODE':'1'})
tmp=HERE/'tmp';tmp.mkdir(exist_ok=True);env['TMPDIR']=str(tmp)
out=HERE/'runs';out.mkdir(exist_ok=True);runid=str(uuid.uuid4());stem=out/(a.name+'-'+runid)
start=time.perf_counter();started=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());before={p.info['pid']:p.info.get('create_time') for p in psutil.process_iter(['pid','create_time'])};peak=0;cpu=0;timeout=False;owned=[]
try:head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=a.cwd,text=True).strip();status=subprocess.check_output(['git','status','--porcelain'],cwd=a.cwd,text=True)
except subprocess.CalledProcessError:head=None;status=None
with stem.with_suffix('.stdout.txt').open('wb') as stdout,stem.with_suffix('.stderr.txt').open('wb') as stderr:
 child=subprocess.Popen(argv,cwd=a.cwd,env=env,stdout=stdout,stderr=stderr)
 while child.poll() is None:
  try:
   processes=[psutil.Process(child.pid),*psutil.Process(child.pid).children(recursive=True)];rss=0;used=0
   for proc in processes:
    try:
     rss+=proc.memory_info().rss;t=proc.cpu_times();used+=t.user+t.system
     identity=(proc.pid,proc.create_time())
     if identity not in owned:owned.append(identity)
    except psutil.Error:pass
   peak=max(peak,rss);cpu=max(cpu,used)
  except psutil.Error:pass
  if time.perf_counter()-start>a.timeout:
   timeout=True
   for pid,created in reversed(owned):
    try:
     proc=psutil.Process(pid)
     if proc.create_time()==created:proc.kill()
    except psutil.Error:pass
   child.kill();break
  time.sleep(.1)
 child.wait()
record={'name':a.name,'run_id':runid,'started_at_utc':started,'argv':argv,'cwd':str(a.cwd.resolve()),'source_head':head,'worktree_status_before':status,'status':'TIMEOUT' if timeout else 'EXECUTED','exit':child.returncode,'wall_seconds':time.perf_counter()-start,'sampled_peak_tree_rss_bytes':peak,'sampled_live_tree_cpu_seconds':cpu,'resource_limits':'100ms samples; shared pages can double count; not final CPU accounting','platform':platform.platform(),'environment_names':sorted(env),'env_values':'not persisted; allowlisted host essentials plus telemetry-off/CI/TMPDIR','stdout':stem.with_suffix('.stdout.txt').name,'stderr':stem.with_suffix('.stderr.txt').name,'harness_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
for stream in ['stdout','stderr']:record[stream+'_sha256']=hashlib.sha256((out/record[stream]).read_bytes()).hexdigest()
stem.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print(json.dumps(record));sys.exit(0)
