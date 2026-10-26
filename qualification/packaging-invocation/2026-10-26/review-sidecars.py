"""Publish finalized integrated/privacy reports separately; never rewrite the frozen ZIP."""
import ast, hashlib, json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent
destination = root.parent / 'engineering/main-control/qualification/packaging-invocation/2026-10-26'
producer = root / 'publish_dependencies.py'
assert hashlib.sha256(producer.read_bytes()).hexdigest() == '87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
assert len(sys.argv) == 3 and all(re.fullmatch('[a-f0-9]{64}', value) for value in sys.argv[1:])
members, records = {}, []
sha = lambda data: hashlib.sha256(data).hexdigest()
functions = [node for node in ast.parse(producer.read_text()).body if isinstance(node, ast.FunctionDef) and node.name in ['minimize', 'sanitize', 'add']]
assert len(functions) == 3
exec(compile(ast.Module(body=functions, type_ignores=[]), str(producer), 'exec'))
for name, expected in zip(['packaging-integration-509d89e.json', 'packaging-publication-509d89e.json'], sys.argv[1:]):
    source = root / name
    assert sha(source.read_bytes()) == expected
    add(name, source)
add('review-sidecars.py', pathlib.Path(__file__))
for name, data in members.items():
    assert not (destination / name).exists()
    (destination / name).write_bytes(data)
manifest = {'reviewed_head': '509d89e56a3636d9da9ae6a276f34f21070d4834', 'records': records, 'notice': 'Finalized fresh integration/publication observations, shared OpenAI lineage. Frozen76member ZIP unchanged. Actual final-head CI/Self/eligibility and canonical/postmerge/closing remote gates remain separate. No release approval, provider-independent certification, authority or historical failure erasure.'}
(destination / 'review-manifest.json').write_bytes((json.dumps(manifest, indent=2) + '\n').encode())
print(json.dumps({'sidecars': len(members) + 1, 'records': records}))
