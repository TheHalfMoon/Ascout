"""Recover an already running owned native test using Windows process wait, not inferred logs."""
import datetime,hashlib,json,pathlib,psutil,subprocess,sys,time
root=pathlib.Path(__file__).resolve().parent
path=pathlib.Path(sys.argv[1]).resolve();assert path.parent==root/'runs'
record=json.loads(path.read_bytes());assert record['state']=='RUNNING'
original=path.read_bytes();identity=record['execution_id']
out=root/'runs'/(identity+'-recovered.json')
assert not out.exists()
process=psutil.Process(record['pid'])
expected_start=datetime.datetime.fromisoformat(record['started_at_utc'].replace('Z','+00:00')).timestamp()
created=process.create_time();assert abs(created-expected_start)<15
assert process.name().lower()=='node.exe'
assert 'npm-cli.js' in ' '.join(process.cmdline()) and 'test' in process.cmdline()
assert process.parent() is None,'Original capture parent remains live; do not duplicate it'
cwd=pathlib.Path(record['cwd'])
def source():
 def git(*args):return subprocess.check_output(['git',*args],cwd=cwd)
 return {'head':git('rev-parse','HEAD').decode().strip(),'head_tree':git('rev-parse','HEAD^{tree}').decode().strip(),'status':git('status','--porcelain=v1').decode('utf-8'),'diff_sha256':hashlib.sha256(git('diff','HEAD','--binary')).hexdigest()}
assert source()==record['source_start']
recovery={'name':record['name']+'-recovered','execution_id':identity+'-recovered','started_at_utc':record['started_at_utc'],'recovery_attached_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'argv':record['argv'],'cwd':record['cwd'],'source_start':record['source_start'],'state':'RUNNING','stdout':record['stdout'],'stderr':record['stderr'],'pid':process.pid,'created_epoch':created,'original_capture_record':path.name,'original_capture_record_sha256':hashlib.sha256(original).hexdigest(),'native_exit_method':'psutil Process.wait on original Windows process identity, using the OS process handle; exit is not inferred from log text.','notice':'Original parent interruption retained. No duplicate suite, process kill, changed source or changed native test deadline.'}
def persist():out.write_bytes((json.dumps(recovery,indent=2)+'\n').encode())
persist()
interrupted={**record,'state':'CAPTURE_PARENT_INTERRUPTED','capture_parent_tool_exit':1,'native_exit_at_interruption':None,'recovery_record':out.name,'interruption_notice':'Native Node remained alive with original PID/create time and original capture parent absent. Do not equate the wrapper exit with native test status.'}
path.write_bytes((json.dumps(interrupted,indent=2)+'\n').encode())
try:
 recovery['exit']=process.wait(timeout=3600)
 recovery['state']='EXECUTED_RECOVERED'
except psutil.TimeoutExpired:
 recovery['exit']=None;recovery['state']='RECOVERY_WAIT_TIMEOUT_NO_KILL'
recovery['source_end']=source();recovery['source_unchanged']=recovery['source_start']==recovery['source_end']
for stream in ['stdout','stderr']:recovery[stream+'_sha256']=hashlib.sha256((root/'runs'/record[stream]).read_bytes()).hexdigest()
recovery['finished_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
recovery['wall_seconds_from_original_start']=time.time()-expected_start
persist()
