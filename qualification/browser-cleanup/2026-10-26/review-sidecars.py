"""Publish finalized reviews and frozen preparation source; never rewrite ZIP."""
import ast, hashlib, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent
destination = root.parent / 'engineering/main-control/qualification/browser-cleanup/2026-10-26'
producer = root / 'publish_dependencies.py'
assert hashlib.sha256(producer.read_bytes()).hexdigest() == '87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
functions = [node for node in ast.parse(producer.read_text()).body if isinstance(node, ast.FunctionDef) and node.name in ['minimize', 'sanitize', 'add']]
assert len(functions) == 3
members, records = {}, []
sha = lambda data: hashlib.sha256(data).hexdigest()
exec(compile(ast.Module(body=functions, type_ignores=[]), str(producer), 'exec'))
for name, expected in [('cleanup-review-integration-ee4fbb7.json', '23f03169df948c7a0445c251f06f7b8dec612db9df3f503ce0f9f152094b8268'), ('cleanup-publication-review-ee4fbb7.json', '0e0215f76e8f5fb2b6aac6086165d8535e176fa12facd63df9880d097e4205b1')]:
    source = root / name
    assert sha(source.read_bytes()) == expected
    add(name, source)
source = root.parent / 'engineering/phase-e04/testerarmy-control.mjs'
assert sha(source.read_bytes()) == 'bfd38ca3ce933c5a72fdc0dfc7d7aedde8b3ab71f637701c80fe7563d6373100'
add('preparation-source.mjs', source)
assert members['preparation-source.mjs'] == source.read_bytes()
add('review-sidecars.py', pathlib.Path(__file__))
for name, data in members.items():
    assert not (destination / name).exists()
    (destination / name).write_bytes(data)
manifest = {'reviewed_head': 'ee4fbb7143295028b2657fe9d396971917ee824d', 'records': records, 'notice': 'Finalized fresh review observations, shared OpenAI lineage. One worth-considering missing preparation-source item is addressed by publishing the exact frozen upstream driver separately, for historical derivation replay after restoring recorded paths. It is not the driver used in current native execution: use scripts/cleanup_testerarmy_control.mjs from the frozen ZIP for that. Original104-member ZIP unchanged; no merge approval, release readiness, independent-provider certification or gate waiver.'}
(destination / 'review-manifest.json').write_bytes((json.dumps(manifest, indent=2) + '\n').encode())
print(json.dumps({'sidecars': len(members) + 1, 'records': records}))
