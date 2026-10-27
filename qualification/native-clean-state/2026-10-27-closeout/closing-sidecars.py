"""Publish finalized closing reviews separately from the immutable 180-member ZIP."""
import ast,hashlib,json,pathlib,re,sys

root=pathlib.Path(__file__).resolve().parent
repo=root.parent/'engineering/main-control'
destination=repo/'qualification/native-clean-state/2026-10-27-closeout'
producer=root/'publish_dependencies.py'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(producer.read_bytes())=='87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
assert len(sys.argv)==3 and all(re.fullmatch('[a-f0-9]{64}',v) for v in sys.argv[1:])
members,records={},[]
functions=[n for n in ast.parse(producer.read_text()).body if isinstance(n,ast.FunctionDef) and n.name in ['minimize','sanitize','add']]
exec(compile(ast.Module(body=functions,type_ignores=[]),str(producer),'exec'))
for name,digest in zip(['clean-state-closing-review-correctness-4222e6c.json','clean-state-closing-review-privacy-4222e6c.json'],sys.argv[1:]):
    path=root/name;assert sha(path.read_bytes())==digest
    report=json.loads(path.read_text())
    assert report.get('reviewed_head',report.get('bindings',{}).get('reviewed_head','4222e6c2b3869506153702ee5458f38469a58021'))=='4222e6c2b3869506153702ee5458f38469a58021'
    add(name,path)
add('closing-sidecars.py',pathlib.Path(__file__))
add('close-after-readback.py',root/'close_clean_state_after_readback.py')
for name,data in members.items():
    assert not (destination/name).exists()
    (destination/name).write_bytes(data)
manifest={'reviewed_head':'4222e6c2b3869506153702ee5458f38469a58021','reviewed_tree':'7806a45adcad25b36336cc931d61f54e395e655d',
 'closing_packet_sha256':'15c7d6da54e77bcdbd3f2d07e475c24b80d5bd5ba7b4247abbf37fb16427dfb9','records':records,
 'notice':'Finalized clear fresh closing correctness/privacy reviews; same OpenAI lineage is role separation, not provider-independent certification. Frozen180-member packet unchanged. Actual closing core/member/sidecar remote readback remains required before focused closure; final bookkeeping revision must also be read back before next-task mutation. Self inner1/FLAKY/materially incomplete, UNKNOWN browser/initial fixture causes, localFAIL6plus hook and all historical limitations remain; E00/release BLOCKED. No paidfallback, D1gate, UA-P07, admission or source/deadline change.'}
(destination/'closing-review-manifest.json').write_bytes((json.dumps(manifest,indent=2)+'\n').encode())
path=destination/'REPORT.md'
path.write_bytes((path.read_text()+'\n\nFinalized fresh closing correctness and privacy reviews at4222e6c found no scoped must-fix. Both original and public derivative hashes are bound in closing-review-manifest.json; the frozen180-member ZIP is unchanged. Actual closing remote readback still precedes focused closure; no future remote proof or release is inferred.\n').encode())
print(json.dumps({'sidecars':len(records)+1,'records':records}))
