"""Publish the finalized combined review without rewriting the 28-member packet."""
import ast,hashlib,json,pathlib,re

root=pathlib.Path(__file__).resolve().parent
destination=root.parent/'engineering/main-control/qualification/self-browser-readiness/2026-10-27'
producer=root/'publish_dependencies.py'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(producer.read_bytes())=='87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
members,records={},[]
functions=[n for n in ast.parse(producer.read_text()).body if isinstance(n,ast.FunctionDef) and n.name in ['minimize','sanitize','add']]
exec(compile(ast.Module(body=functions,type_ignores=[]),str(producer),'exec'))
path=root/'browser-readiness-publication-review-eba4030.json'
assert sha(path.read_bytes())=='a3648312262cd5ae6563088fbb8ec47a1b7a72a587250b613da885e37321e042'
add(path.name,path)
add('review-sidecars.py',pathlib.Path(__file__))
for name,data in members.items():
    assert not (destination/name).exists()
    (destination/name).write_bytes(data)
manifest={'reviewed_head':'eba4030904c5cb7692b0febae0acc94596edc58e','reviewed_tree':'922e388f9d127b8ad30ddd12934ac057da49e338',
 'packet_sha256':'9de221cb302c8fb00d313c78d235e8feae54952a3cee9599095b77e10901b0c4','records':records,
 'notice':'Finalized fresh combined integrated/publication/privacy review, no findings; frozen28-member packet unchanged. Same OpenAI lineage is role separation, not provider-independent certification. Actual final-head setup/matrix/inner Self/eligibility and canonical/closing remote gates remain. Original adverse outcomes/UNKNOWN causes/E00/release blockers retained; no source/deadline/admission/UA-P07 or policy waiver.'}
(destination/'review-manifest.json').write_bytes((json.dumps(manifest,indent=2)+'\n').encode())
print(json.dumps({'sidecars':3,'records':records}))
