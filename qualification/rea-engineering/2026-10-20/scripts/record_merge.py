"""Read back a completed merge and assert its ordered parents and feature tree."""
import datetime,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parent
number=int(sys.argv[1]);expected_head=sys.argv[2];expected_base=sys.argv[3]
def api(path):return json.loads(subprocess.check_output(['gh','api','repos/TheHalfMoon/Ascout/'+path]))
pr=api('pulls/'+str(number));assert pr['merged'] and pr['state']=='closed'
assert pr['head']['sha']==expected_head
merge=api('commits/'+pr['merge_commit_sha']);main=api('commits/main');head=api('commits/'+expected_head)
assert [p['sha'] for p in merge['parents']]==[expected_base,expected_head]
assert main['sha']==merge['sha']
assert merge['commit']['tree']['sha']==head['commit']['tree']['sha']
record={'observed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pr':pr['html_url'],'state':pr['state'],'merged':True,'merged_at':pr['merged_at'],'head':expected_head,'base':expected_base,'merge':merge['sha'],'main':main['sha'],'ordered_parents':[p['sha'] for p in merge['parents']],'merge_tree':merge['commit']['tree']['sha'],'head_tree':head['commit']['tree']['sha'],'tree_equal':True,'github_signature_verification':{k:merge['commit']['verification'][k] for k in ['verified','reason','verified_at']},'notice':'Read-back and GitHub-reported signature status; final integrated-main test result remains separately required.'}
out=root/'merges';out.mkdir(exist_ok=True);(out/(str(number)+'.json')).write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8');print(json.dumps(record))
