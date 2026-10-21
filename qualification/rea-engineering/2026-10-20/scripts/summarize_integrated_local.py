"""Summarize completed captures without changing their results."""
import hashlib,json,pathlib,sys
root=pathlib.Path(__file__).resolve().parent
phase,prefix,head=sys.argv[1:];assert phase in ['phase-e02','phase-e04']
records=[]
for task in ['typecheck','build','full-suite']:
 candidates=[p for p in (root/'runs').glob(prefix+'-integrated-'+task+'-*.json') if json.loads(p.read_bytes())['state'] in ['EXECUTED','EXECUTED_RECOVERED']];assert len(candidates)==1
 path=candidates[0];record=json.loads(path.read_bytes())
 assert record['state'] in ['EXECUTED','EXECUTED_RECOVERED'] and record['source_unchanged'] and record['source_start']['head']==head
 streams={}
 for stream in ['stdout','stderr']:
  data=(root/'runs'/record[stream]).read_bytes()
  assert hashlib.sha256(data).hexdigest()==record[stream+'_sha256']
  streams[stream]=data.decode('utf-8',errors='replace')
 summary=[line.strip() for line in streams['stdout'].splitlines() if line.startswith((' Test Files ','      Tests ','   Duration '))]
 failures=[line.strip() for line in streams['stdout'].splitlines() if line.lstrip().startswith(('×','✗'))]
 records.append({'task':task,'execution_id':record['execution_id'],'capture_state':record['state'],'native_exit':record['exit'],'native_exit_method':record.get('native_exit_method','Original owning subprocess wait'),'source_unchanged':True,'source':record['source_start'],'wall_seconds':record.get('wall_seconds',record.get('wall_seconds_from_original_start')),'record_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'stdout_sha256':record['stdout_sha256'],'stderr_sha256':record['stderr_sha256'],'summary':summary,'failures':failures})
out={'head':head,'kind':'Orchestrator factual capture summary, not independent review or release approval','result':'PASS' if all(r['native_exit']==0 for r in records) else 'FAIL','controls':records,'notice':'Original failed/interrupted/selected-only controls remain preserved separately. Current hosted jobs are independent gates; a later pass cannot relabel an earlier failure.'}
(root/phase/'integrated-local-controls.json').write_bytes((json.dumps(out,indent=2)+'\n').encode())
print(json.dumps(out))
