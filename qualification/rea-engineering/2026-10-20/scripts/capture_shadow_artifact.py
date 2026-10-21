"""Retain actual GitHub shadow bytes; no workflow or product changes."""
import datetime,hashlib,io,json,pathlib,subprocess,sys,zipfile
root=pathlib.Path(__file__).resolve().parent
phase,run,head=sys.argv[1:]
assert phase in ['phase-e01','phase-e02','phase-e03','phase-e04'] and run.isdecimal()
def raw(path):return subprocess.check_output(['gh','api','repos/TheHalfMoon/Ascout/'+path])
def api(path):return json.loads(raw(path))
def sha(data):return hashlib.sha256(data).hexdigest()
metadata=api('actions/runs/'+run);assert metadata['head_sha']==head
listing=api('actions/runs/'+run+'/artifacts?per_page=100')
matches=[a for a in listing['artifacts'] if a['name']=='self-verification-'+head and not a['expired']]
assert len(matches)==1
artifact=matches[0];data=raw('actions/artifacts/'+str(artifact['id'])+'/zip')
assert artifact['digest']=='sha256:'+sha(data)
out=root/phase/'ci-shadow-artifact';out.mkdir(exist_ok=False)
(out/'artifact-metadata.json').write_bytes((json.dumps(artifact,indent=2)+'\n').encode())
(out/'artifact.zip').write_bytes(data)
allowed={'self-verification-envelope.json','self-verification-receipt.json','selector-shadow-observation.json'}
z=zipfile.ZipFile(io.BytesIO(data));assert z.testzip() is None
files=[i for i in z.infolist() if not i.is_dir()]
assert len(files)==3 and {pathlib.PurePosixPath(i.filename).name for i in files}==allowed
assert sum(i.file_size for i in files)<20*1024*1024
for item in files:
 value=z.read(item);json.loads(value)
 (out/pathlib.PurePosixPath(item.filename).name).write_bytes(value)
envelope=json.loads((out/'self-verification-envelope.json').read_bytes())
receipt=(out/'self-verification-receipt.json').read_bytes();body=json.loads(receipt)
assert envelope['receipt_sha256']==sha(receipt)
assert envelope['verifier_head_sha']==envelope['subject_target_head_sha']==head
assert envelope['verifier_head_tree_sha']==envelope['subject_target_tree_sha']==api('commits/'+head)['commit']['tree']['sha']
assert envelope['classification']=='SHADOW_NON_GATING' and envelope['receipt_exit_code'] in [0,1,3,4]
summary={'captured_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'run':int(run),'run_attempt':metadata['run_attempt'],'head':head,'artifact':artifact['id'],'archive_sha256':sha(data),'archive_digest_matches_github':True,'receipt_sha256':sha(receipt),'envelope':envelope,'tasks':[{'task_id':t['task_id'],'status':t['status'],'reason_code':t.get('reason_code'),'observations':t.get('observations')} for t in body['tasks']],'receipt_summary':body['summary'],'notice':'Source/hash retention observation only. Canonical Spec006 permits shadow receipt exits0/1/3/4; valid capture is not a clean receipt or release approval.'}
(out/'capture.json').write_bytes((json.dumps(summary,indent=2)+'\n').encode())
print(json.dumps(summary))
