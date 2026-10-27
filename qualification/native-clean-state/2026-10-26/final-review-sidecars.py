"""Append finalized metadata delta; keep the immutable packet and prior reviews."""
import ast,hashlib,json,pathlib,re

root=pathlib.Path(__file__).resolve().parent
destination=root.parent/'engineering/main-control/qualification/native-clean-state/2026-10-26'
producer=root/'publish_dependencies.py'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(producer.read_bytes())=='87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
members,records={},[]
functions=[n for n in ast.parse(producer.read_text()).body if isinstance(n,ast.FunctionDef) and n.name in ['minimize','sanitize','add']]
exec(compile(ast.Module(body=functions,type_ignores=[]),str(producer),'exec'))
source=root/'clean-state-final-delta-d1de35e.json'
assert sha(source.read_bytes())=='8e1a100f65eaabe163c5c5e2edfc33d6407abd74c26c65a8e4940117469e3634'
add(source.name,source)
add('final-review-sidecars.py',pathlib.Path(__file__))
for name,data in members.items():
    assert not (destination/name).exists()
    (destination/name).write_bytes(data)
path=destination/'review-manifest.json'
manifest=json.loads(path.read_text())
manifest['records'].extend(records)
manifest['final_metadata_delta_review']={'head':'d1de35ed2095a15db04aeac5ed3333fd97a6b95e','original_sha256':'8e1a100f65eaabe163c5c5e2edfc33d6407abd74c26c65a8e4940117469e3634','verdict':'NO_SCOPED_FINDINGS','limits':'Finalized report publication is bookkeeping after review; source/test/packet leaves unchanged. Actual last-head CI, Self truth, eligibility, canonical/postmerge/closing remote gates remain separate.'}
path.write_bytes((json.dumps(manifest,indent=2)+'\n').encode())
print(json.dumps({'sidecars':len(manifest['records'])+1,'records_added':records}))
