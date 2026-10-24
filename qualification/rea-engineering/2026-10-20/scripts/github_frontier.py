"""Capture live GitHub state; read only, no gate/billing/policy changes."""
import concurrent.futures,datetime,json,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parent
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
out=ROOT/'github-frontier'/stamp;out.mkdir(parents=True)
requests={
 'repository':['api','repos/TheHalfMoon/Ascout','--jq','{visibility:.visibility,private:.private,default_branch:.default_branch,permissions:.permissions}'],
 'main':['api','repos/TheHalfMoon/Ascout/commits/main','--jq','{sha:.sha,tree:.commit.tree.sha,message:.commit.message}'],
 'open-prs':['pr','list','--repo','TheHalfMoon/Ascout','--state','open','--limit','100','--json','number,title,headRefName,headRefOid,isDraft'],
 'rulesets':['api','repos/TheHalfMoon/Ascout/rulesets'],
 'protection':['api','repos/TheHalfMoon/Ascout/branches/main/protection'],
}
for number in [636,637,638,639,640,641]:
 requests['pr-'+str(number)]=['pr','view',str(number),'--repo','TheHalfMoon/Ascout','--json','number,headRefOid,baseRefOid,state,isDraft,mergeStateStatus,reviews,reviewDecision,statusCheckRollup']
for run in [39482504721,39482504882,39484966539,39484966569,39444579324,39444579369,39520405829,39520405995]:
 requests['run-'+str(run)]=['api','repos/TheHalfMoon/Ascout/actions/runs/'+str(run)]
 requests['jobs-'+str(run)]=['api','repos/TheHalfMoon/Ascout/actions/runs/'+str(run)+'/jobs']
def fetch(pair):
 name,arguments=pair
 process=subprocess.run(['gh',*arguments],capture_output=True,timeout=60)
 stdout=process.stdout.decode('utf-8',errors='replace');stderr=process.stderr.decode('utf-8',errors='replace')
 try:data=json.loads(stdout)
 except json.JSONDecodeError:data=stdout
 record={'at_utc':stamp,'argv':['gh',*arguments],'exit':process.returncode,'data':data,'stderr':stderr}
 (out/(name+'.json')).write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
 return name,record
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 records=dict(pool.map(fetch,requests.items()))
summary={'at_utc':stamp,'directory':str(out),'visibility':records['repository']['data'],'main':records['main']['data'],'errors':[{k:r[k] for k in ['argv','exit','stderr']} for r in records.values() if r['exit']!=0],'runs':[]}
for key,record in records.items():
 if key.startswith('run-'):
  d=record['data'];job_record=records['jobs-'+key[4:]];job_data=job_record['data']
  if record['exit']!=0 or not isinstance(d,dict) or not all(field in d for field in ['id','head_sha','run_attempt','status','conclusion']):
   summary['runs'].append({'request':key,'capture_state':'RUN_METADATA_UNAVAILABLE','native_exit':record['exit']});continue
  if job_record['exit']!=0 or not isinstance(job_data,dict) or not isinstance(job_data.get('jobs'),list):
   summary['runs'].append({'id':d['id'],'head_sha':d['head_sha'],'capture_state':'JOB_METADATA_UNAVAILABLE','native_exit':job_record['exit']});continue
  jobs=job_data['jobs']
  summary['runs'].append({'id':d['id'],'head_sha':d['head_sha'],'attempt':d['run_attempt'],'status':d['status'],'conclusion':d['conclusion'],'jobs':[{'id':j['id'],'name':j['name'],'status':j['status'],'conclusion':j['conclusion'],'steps':len(j['steps']),'completed_steps':len([s for s in j['steps'] if s['status']=='completed'])} for j in jobs]})
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary))
