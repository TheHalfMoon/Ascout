"""Publish finalized closing reviews alongside the unchanged Task024 packet."""
import ast, hashlib, json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent
destination = root.parent / 'engineering/main-control/qualification/browser-cleanup/2026-10-26-closeout'
assert len(sys.argv) == 3 and all(re.fullmatch('[a-f0-9]{64}', value) for value in sys.argv[1:])
producer = root / 'publish_dependencies.py'
assert hashlib.sha256(producer.read_bytes()).hexdigest() == '87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
functions = [node for node in ast.parse(producer.read_text()).body if isinstance(node, ast.FunctionDef) and node.name in ['minimize', 'sanitize', 'add']]
assert len(functions) == 3
members, records = {}, []
sha = lambda data: hashlib.sha256(data).hexdigest()
exec(compile(ast.Module(body=functions, type_ignores=[]), str(producer), 'exec'))
names = ['cleanup-closing-review-correctness-0d6b7e4.json', 'cleanup-closing-review-privacy-0d6b7e4.json']
for name, expected in zip(names, sys.argv[1:]):
    source = root / name
    assert sha(source.read_bytes()) == expected
    add(name, source)
add('closing-review-sidecars.py', pathlib.Path(__file__))
add('verify_cleanup_closing_sidecars.py', root / 'verify_cleanup_closing_sidecars.py')
add('verify_index_closing_sidecars.py', root / 'verify_index_closing_sidecars.py')
for name, data in members.items():
    assert not (destination / name).exists()
    (destination / name).write_bytes(data)
result = {'reviewed_head': '0d6b7e43277a8770606efa235c4bfbd140c2db06', 'unchanged_zip_sha256': '8efeacc837d774fdcb709a0e0caef8007f04a92172acdc322ba19dbd51a4bc2c', 'producer_sha256': sha(producer.read_bytes()), 'records': records, 'notice': 'Finalized fresh closing observations, shared OpenAI lineage; no security/provider certification, merge approval or release readiness. Hash arguments must come from finalized reports. Actual remote readback remains required. Frozen166-member packet unchanged.'}
(destination / 'closing-review-manifest.json').write_bytes((json.dumps(result, indent=2) + '\n').encode())
print(json.dumps(result))
