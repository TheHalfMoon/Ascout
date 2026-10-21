"""Read-only last-moment gate capture; never approves or merges."""
import datetime,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parent
number=int(sys.argv[1]);head=sys.argv[2];base=sys.argv[3]
def gh(*args):return json.loads(subprocess.check_output(['gh',*args]))
pr=gh('pr','view',str(number),'--repo','TheHalfMoon/Ascout','--json','headRefOid,baseRefOid,state,isDraft,statusCheckRollup,reviews,mergeable,mergeStateStatus')
assert pr['state']=='OPEN' and pr['headRefOid']==head and pr['baseRefOid']==base
assert gh('api','repos/TheHalfMoon/Ascout/commits/main')['sha']==base
checks=pr['statusCheckRollup'];assert len(checks)==7
assert all(c['status']=='COMPLETED' and c['conclusion']=='SUCCESS' for c in checks)
for run in {c['detailsUrl'].split('/runs/')[1].split('/')[0] for c in checks}:
 metadata=gh('api',f'repos/TheHalfMoon/Ascout/actions/runs/{run}')
 assert metadata['head_sha']==head and metadata['status']=='completed' and metadata['conclusion']=='success'
 jobs=gh('api',f'repos/TheHalfMoon/Ascout/actions/runs/{run}/jobs?per_page=100')
 assert jobs['total_count']==len(jobs['jobs'])
 assert all(j['status']=='completed' and j['conclusion']=='success' for j in jobs['jobs'])
assert not any(r['state']=='CHANGES_REQUESTED' for r in pr['reviews'])
query='query($number:Int!){repository(owner:"TheHalfMoon",name:"Ascout"){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved}pageInfo{hasNextPage}}}}}'
threads=gh('api','graphql','-f','query='+query,'-F','number='+str(number))['data']['repository']['pullRequest']['reviewThreads']
assert not threads['pageInfo']['hasNextPage'] and all(t['isResolved'] for t in threads['nodes'])
assert pr['mergeable']=='MERGEABLE' and pr['mergeStateStatus'] in ['CLEAN','DRAFT']
out=root/'merges';out.mkdir(exist_ok=True)
record={'observed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'purpose':'last-moment read-only gate refresh; no approval or merge performed','number':number,'head':head,'base':base,'pr':pr,'review_threads':threads,'authority_reference':'Direct founder Spec018 completion instruction, governance-current/sequencing; task-specific reviews/qualification remain separately required.'}
(out/f'{number}-premerge.json').write_bytes((json.dumps(record,indent=2)+'\n').encode())
print(json.dumps({'number':number,'head':head,'base':base,'checks':len(checks),'conclusions':'all completed success','threads':len(threads['nodes']),'mergeable':pr['mergeable']}))
