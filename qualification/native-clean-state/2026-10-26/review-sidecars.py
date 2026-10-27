"""Publish finalized reviews without rewriting the fixed 118-member packet."""
import ast,hashlib,json,pathlib,re

root=pathlib.Path(__file__).resolve().parent
destination=root.parent/'engineering/main-control/qualification/native-clean-state/2026-10-26'
producer=root/'publish_dependencies.py'
sha=lambda value:hashlib.sha256(value).hexdigest()
assert sha(producer.read_bytes())=='87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
members,records={},[]
functions=[n for n in ast.parse(producer.read_text()).body if isinstance(n,ast.FunctionDef) and n.name in ['minimize','sanitize','add']]
exec(compile(ast.Module(body=functions,type_ignores=[]),str(producer),'exec'))
for name,digest in [('clean-state-integrated-review-a757b2a.json','17d67f376d63eae2366e0e5f563155777ec826e5f77339fd38a3c5daf1aa4853'),('clean-state-publication-review-a757b2a.json','f5f4b761c46eaa85100bbfcbde502594d06a5571b76eb56a4d53d1307ace6516')]:
    source=root/name;assert sha(source.read_bytes())==digest
    add(name,source)
add('review-sidecars.py',pathlib.Path(__file__))
for name,data in members.items():
    assert not (destination/name).exists()
    (destination/name).write_bytes(data)
manifest={'reviewed_head':'a757b2a37ed82d67147e410c159c485d0f1e2219','reviewed_tree':'8e63eded02bd2f3f7fd0c91b586daea29c551044',
 'packet_sha256':'64d613267d3acb6b56294a23fcecf06aab5b3dc6d45d2fa31bd0650cccce2723','records':records,
 'notice':'Finalized fresh integrated and privacy/publication reviews, no scoped must-fix. Shared OpenAI lineage, not provider-independent certification. Frozen118-member packet unchanged; exact-head CI/Self/live eligibility and canonical/postmerge/closing remote gates remain. All local failures and unknown original initialization cause retained; E00/release BLOCKED.'}
(destination/'review-manifest.json').write_bytes((json.dumps(manifest,indent=2)+'\n').encode())
print(json.dumps({'sidecars':4,'records':records}))
