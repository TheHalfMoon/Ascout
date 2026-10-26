"""Preserve finalized Task026 closing reports beside the fixed forward packet."""
import ast, hashlib, json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent
destination = root.parent / 'engineering/main-control/qualification/native-timing-diagnosis/2026-10-26-closeout'
assert len(sys.argv) == 4 and re.fullmatch('[a-f0-9]{40}', sys.argv[1]) and all(re.fullmatch('[a-f0-9]{64}', value) for value in sys.argv[2:])
head = sys.argv[1]
producer = root / 'publish_dependencies.py'
assert hashlib.sha256(producer.read_bytes()).hexdigest() == '87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
functions = [node for node in ast.parse(producer.read_text()).body if isinstance(node, ast.FunctionDef) and node.name in ['minimize', 'sanitize', 'add']]
assert len(functions) == 3
members, records = {}, []
sha = lambda data: hashlib.sha256(data).hexdigest()
exec(compile(ast.Module(body=functions, type_ignores=[]), str(producer), 'exec'))
for kind, expected in zip(['correctness', 'privacy'], sys.argv[2:]):
    name = 'native-timing-closing-review-' + kind + '-' + head[:7] + '.json'
    source = root / name
    assert sha(source.read_bytes()) == expected
    add(name, source)
add('closing-review-sidecars.py', pathlib.Path(__file__))
add('verify_native_timing_closing_sidecars.py', root / 'verify_native_timing_closing_sidecars.py')
add('verify_index_closing_sidecars.py', root / 'verify_index_closing_sidecars.py')
for name, data in members.items():
    assert not (destination / name).exists()
    (destination / name).write_bytes(data)
lock = json.loads((destination / 'evidence-lock.json').read_text())
result = {'reviewed_head': head, 'unchanged_zip_sha256': lock['zip_sha256'], 'producer_sha256': sha(producer.read_bytes()), 'records': records, 'notice': 'Finalized fresh closing observations and original/derivative hashes, same OpenAI lineage. No provider-independent certification or release readiness. Frozen packet unchanged. Actual remote readback remains required before focused task closure, next canonical task or disposal.'}
(destination / 'closing-review-manifest.json').write_bytes((json.dumps(result, indent=2) + '\n').encode())
print(json.dumps(result))
