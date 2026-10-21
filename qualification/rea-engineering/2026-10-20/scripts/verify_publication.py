"""Verify a pushed immutable evidence blob by downloading it through GitHub."""
import base64,hashlib,json,pathlib,subprocess,time
ROOT=pathlib.Path(__file__).resolve().parent
REPO=ROOT/'Ascout'
def run(*args):return subprocess.check_output(args,cwd=REPO).decode('utf-8')
head=run('git','rev-parse','HEAD').strip()
branch=run('git','branch','--show-current').strip()
ref=json.loads(run('gh','api','repos/TheHalfMoon/Ascout/git/ref/heads/'+branch))
assert ref['object']['sha']==head
path='qualification/rea-engineering/2026-10-20/evidence.zip'
blob=run('git','ls-tree',head,path).split()[2]
remote=json.loads(run('gh','api','repos/TheHalfMoon/Ascout/git/blobs/'+blob))
data=base64.b64decode(remote['content'])
lock=json.loads((REPO/pathlib.Path(path).parent/'evidence-lock.json').read_text())
digest=hashlib.sha256(data).hexdigest()
assert digest==lock['evidence_zip_sha256']
assert data==(REPO/path).read_bytes()
receipt={'verified_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'branch':branch,'commit':head,'blob':blob,'downloaded_bytes':len(data),'sha256':digest,'result':'REMOTE_REF_AND_DOWNLOADED_BLOB_MATCH','notice':'Integrity observation, not release approval.'}
out=ROOT/'publication-receipts';out.mkdir(exist_ok=True)
(out/(head+'.json')).write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
