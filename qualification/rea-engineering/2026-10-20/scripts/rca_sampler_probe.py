"""Compare observation overhead on one unchanged native test; never a qualification gate."""
import concurrent.futures,hashlib,json,os,pathlib,subprocess,sys,time,uuid
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'venv/Lib/site-packages'))
import psutil
HERE=pathlib.Path(__file__).resolve().parent;cwd=HERE/'main-control';out=HERE/'rca-probes';out.mkdir(exist_ok=True)
baseenv={k:v for k,v in os.environ.items() if k.upper() in {'PATH','SYSTEMROOT','SYSTEMDRIVE','COMSPEC','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATHEXT','PROGRAMFILES','PROGRAMFILES(X86)','WINDIR','HOMEDRIVE','HOMEPATH','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE','OS'}}
baseenv.update(CI='true',DO_NOT_TRACK='1',TMPDIR=str(HERE/'tmp'))
argv=['node','node_modules/vitest/vitest.mjs','run','tests/git-tree-digest.test.ts','--maxWorkers=1','--reporter=verbose','-t','binds clean, staged, unstaged, deletion, and all nonignored untracked state']
records=[]
for sample in [None,0.02,0.1,None]:
 runid=str(uuid.uuid4());stem=out/runid;env=dict(baseenv);gitlog=stem.with_suffix('.git.jsonl')
 # Instrument all variants identically; only process sampling differs.
 env['NODE_OPTIONS']='--require='+str(HERE/'trace_git.cjs');env['ASCOUT_DIAGNOSTIC_LOG']=str(gitlog)
 source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=cwd,text=True).strip();state=subprocess.check_output(['git','status','--porcelain'],cwd=cwd,text=True)
 start=time.perf_counter();ram=psutil.virtual_memory().available;load=psutil.cpu_percent(interval=.2);peak=0;polls=0
 with stem.with_suffix('.stdout.txt').open('wb') as stdout,stem.with_suffix('.stderr.txt').open('wb') as stderr:
  child=subprocess.Popen(argv,cwd=cwd,env=env,stdout=stdout,stderr=stderr)
  if sample is None:child.wait(timeout=120)
  else:
   while child.poll() is None:
    try:
     processes=[psutil.Process(child.pid),*psutil.Process(child.pid).children(recursive=True)];rss=0
     for proc in processes:
      try:rss+=proc.memory_info().rss;t=proc.cpu_times()
      except psutil.Error:pass
     peak=max(peak,rss);polls+=1
    except psutil.Error:pass
    if time.perf_counter()-start>120:raise RuntimeError('Probe exceeded capture envelope; stop and inspect owned tree')
    time.sleep(sample)
  child.wait()
 counts={};duration=0
 if gitlog.exists():
  for line in gitlog.read_text().splitlines():
   x=json.loads(line);counts[x['operation']]=counts.get(x['operation'],0)+1;duration+=x['duration_ms']
 r={'run_id':runid,'source_head':source,'source_status':state,'mode':'instrumented diagnostic only','sampling_interval_seconds':sample,'sampler_iterations':polls,'wall_seconds':time.perf_counter()-start,'exit':child.returncode,'available_ram_start':ram,'host_cpu_start':load,'sampled_peak_tree_rss_bytes':peak if sample else None,'git_command_counts':counts,'summed_git_wall_ms':duration,'argv':argv,'source_end':subprocess.check_output(['git','rev-parse','HEAD'],cwd=cwd,text=True).strip(),'individual_deadlines_changed':False,'trace_sha256':hashlib.sha256((HERE/'trace_git.cjs').read_bytes()).hexdigest()}
 stem.with_suffix('.json').write_bytes((json.dumps(r,indent=2)+'\n').encode());records.append(r);print(json.dumps(r),flush=True)
(out/'comparison.json').write_bytes((json.dumps(records,indent=2)+'\n').encode())
