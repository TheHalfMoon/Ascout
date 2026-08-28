import hashlib, json
from pathlib import Path

p=Path('benchmarks/manifest.json')
m=json.loads(p.read_text())
assert m['manifest_revision']==2 and len(m['cases'])==6
m['manifest_revision']=3
r=m['case_schema']['properties']['reconstruction']
r['properties']['synthetic_head']={
 'type':'object','additionalProperties':False,
 'required':['recipe_version','git_object_format','tree_source','parent_commit_ids','object_hash_algorithm','payload_template_utf8','payload_template_sha256','author','committer','message_utf8','encoding_header','signing','extra_headers','result_commit_id'],
 'properties':{
  'recipe_version':{'const':'git-commit-object-v1'},'git_object_format':{'const':'sha1'},
  'tree_source':{'const':'reconstruction.derived_identity.expected_digest'},
  'parent_commit_ids':{'type':'array','minItems':1,'uniqueItems':True,'items':{'$ref':'#/$defs/git_object_id'}},
  'object_hash_algorithm':{'const':'sha1-git-object-header-plus-payload-v1'},
  'payload_template_utf8':{'type':'string','minLength':1},'payload_template_sha256':{'$ref':'#/$defs/sha256'},
  'author':{'$ref':'#/$defs/synthetic_git_identity'},'committer':{'$ref':'#/$defs/synthetic_git_identity'},
  'message_utf8':{'const':'Ascout benchmark synthetic baseline v1\n'},'encoding_header':{'type':'null'},
  'signing':{'const':'forbidden'},'extra_headers':{'type':'array','maxItems':0},
  'result_commit_id':{'oneOf':[{'$ref':'#/$defs/git_object_id'},{'type':'null'}]}
 }}
r['properties']['ancillary_review']={
 'type':'object','additionalProperties':False,
 'required':['changed_paths','preserved_allowlist','excluded_from_derived_baseline','review_note'],
 'properties':{
  'changed_paths':{'type':'array','uniqueItems':True,'items':{'$ref':'#/$defs/repository_path'}},
  'preserved_allowlist':{'type':'array','uniqueItems':True,'items':{'$ref':'#/$defs/repository_path'}},
  'excluded_from_derived_baseline':{'type':'array','uniqueItems':True,'items':{'$ref':'#/$defs/repository_path'}},
  'review_note':{'type':'string','minLength':1}}}
m['case_schema']['$defs']['synthetic_git_identity']={
 'type':'object','additionalProperties':False,'required':['name','email','git_timestamp'],
 'properties':{'name':{'const':'Ascout Benchmark Harness'},'email':{'const':'ascout-benchmark@users.noreply.github.com'},'git_timestamp':{'const':'946684800 +0000'}}}
a=m['case_schema']['allOf']
a[0:0]=[
 {'if':{'properties':{'case_class':{'const':'selection'}},'required':['case_class']},'then':{'properties':{'reconstruction':{'required':['synthetic_head','ancillary_review']}}}},
 {'if':{'properties':{'case_class':{'const':'selection'},'lifecycle_state':{'enum':['CANDIDATE','IDENTITY_VERIFIED','LICENSE_CLEARED','RECONSTRUCTION_SPECIFIED','ORACLE_SPECIFIED','CASE_REVIEWED']}},'required':['case_class','lifecycle_state']},'then':{'properties':{'reconstruction':{'properties':{'synthetic_head':{'properties':{'result_commit_id':{'type':'null'}}}}}}}},
 {'if':{'properties':{'case_class':{'const':'selection'},'lifecycle_state':{'enum':['RECONSTRUCTION_REPLAYED','ORACLE_VERIFIED','BENCHMARK_ACTIVE']}},'required':['case_class','lifecycle_state']},'then':{'properties':{'reconstruction':{'properties':{'synthetic_head':{'properties':{'result_commit_id':{'$ref':'#/$defs/git_object_id'}}}}}}}}
]
template='tree {derived_tree_id}\nparent {base_commit_id}\nauthor Ascout Benchmark Harness <ascout-benchmark@users.noreply.github.com> 946684800 +0000\ncommitter Ascout Benchmark Harness <ascout-benchmark@users.noreply.github.com> 946684800 +0000\n\nAscout benchmark synthetic baseline v1\n'
tsha=hashlib.sha256(template.encode()).hexdigest()
step2='Construct the derived pre-fix benchmark baseline from the exact fix tree by replacing the listed production-path blobs with their exact base-commit objects, preserving the listed regression-test bytes, and applying reconstruction.ancillary_review exactly: every base-to-fix changed path outside production/regression paths must be classified; preserve only preserved_allowlist paths and restore excluded paths to exact base-state bytes/presence (delete when absent in base). No unclassified base-to-fix changed path may remain.'
step4='At T075, after recording the derived Git tree identity, construct HEAD only from reconstruction.synthetic_head. Substitute the observed derived tree ID and pinned base commit ID into payload_template_utf8; the Git commit payload, parent order, author/committer identity and timestamp, message bytes, absence of encoding/signature/extra headers, and SHA-1 object hashing are fixed by that structured recipe. Record and require the deterministic resulting commit ID at RECONSTRUCTION_REPLAYED. Check out that HEAD with index/worktree equal to HEAD, overlay only listed production fix blobs unstaged, and require an exact production-only working-tree-vs-HEAD path set, unchanged regression-test bytes, no unexpected non-runtime untracked paths, and a non-clean worktree.'
fixed='At T075, materialize the reviewed fixed measured state by applying only the listed production fix blobs to the same derived baseline, preserving identical regression-test bytes and enforcing reconstruction.ancillary_review; execute the identical pinned regression-test identity and require it to pass.'
for c in m['cases']:
 assert c['case_revision']==1
 c['case_revision']=2
 base=c['git']['base']['commit_id']
 c['reconstruction']['synthetic_head']={
  'recipe_version':'git-commit-object-v1','git_object_format':'sha1','tree_source':'reconstruction.derived_identity.expected_digest','parent_commit_ids':[base],
  'object_hash_algorithm':'sha1-git-object-header-plus-payload-v1','payload_template_utf8':template,'payload_template_sha256':tsha,
  'author':{'name':'Ascout Benchmark Harness','email':'ascout-benchmark@users.noreply.github.com','git_timestamp':'946684800 +0000'},
  'committer':{'name':'Ascout Benchmark Harness','email':'ascout-benchmark@users.noreply.github.com','git_timestamp':'946684800 +0000'},
  'message_utf8':'Ascout benchmark synthetic baseline v1\n','encoding_header':None,'signing':'forbidden','extra_headers':[],'result_commit_id':None}
 if c['case_id']=='tanstack-streamed-query-reducer':
  c['reconstruction']['ancillary_review']={'changed_paths':['.changeset/fair-peaches-deny.md'],'preserved_allowlist':[],'excluded_from_derived_baseline':['.changeset/fair-peaches-deny.md'],'review_note':'The only changed ancillary path is newly added in fix, absent in base, and states the reducer defect; it leaks behavioral/oracle information and must be absent from the derived baseline.'}
 else:
  c['reconstruction']['ancillary_review']={'changed_paths':[],'preserved_allowlist':[],'excluded_from_derived_baseline':[],'review_note':'Exact fix metadata has no changed paths outside reviewed production/regression paths.'}
 c['reconstruction']['steps'][1]=step2
 c['reconstruction']['steps'][3]=step4
 c['oracle']['specification']['ground_truth_procedure'][3]=fixed
 c['provenance']['review_notes']+=' T073 anti-leakage review explicitly classifies every base-to-fix ancillary changed path and restores excluded paths to base-state presence/bytes before recording the derived tree.'
 c['limitations']=[x for x in c['limitations'] if 'globally fixed, versioned commit-object recipe' not in x]
 c['limitations'].append('The structured reconstruction.synthetic_head recipe is fully pinned before T075, but result_commit_id remains null until isolated replay observes the derived tree and deterministically computes the local commit ID; fabricating it before replay is forbidden.')
p.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n')
