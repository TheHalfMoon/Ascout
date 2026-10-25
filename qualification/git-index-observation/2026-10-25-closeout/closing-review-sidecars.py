"""Completed Task023 closing reviews outside the immutable 143-member packet."""
import ast, hashlib, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent
destination = root.parent / 'engineering/main-control/qualification/git-index-observation/2026-10-25-closeout'
producer = root / 'publish_dependencies.py'
assert hashlib.sha256(producer.read_bytes()).hexdigest() == '87d1e9597dc89e9727821808a7790089d50b4574c012aa1f30f6a9f8770b32d1'
module = ast.parse(producer.read_text())
functions = [node for node in module.body if isinstance(node, ast.FunctionDef) and node.name in ['minimize', 'sanitize', 'add']]
assert len(functions) == 3
members, records = {}, []
sha = lambda data: hashlib.sha256(data).hexdigest()
exec(compile(ast.Module(body=functions, type_ignores=[]), str(producer), 'exec'))
for name, expected in [('index-closing-review-correctness-1a50491.json', '40f3023ac23a3f747ad07d85081b158e4b8befb9cdd198b643d063a4f538fc54'), ('index-closing-review-privacy-1a50491.json', '3b24a5ea1a3c9810f9de86e2088ae92c7ebd22a9de5dd60c6900af320fb1bda3')]:
    source = root / name
    assert sha(source.read_bytes()) == expected
    add(name, source)
add('closing-review-sidecars.py', pathlib.Path(__file__))
for name, data in members.items():
    (destination / name).write_bytes(data)
result = {'reviewed_head': '1a504912f00c376ed3d1fe1ce19d9e63aabe883c', 'unchanged_zip_sha256': '9c3b34654688fe75153862e43de47cdd2699904f8a7cfe40178337e7c8c80885', 'producer_sha256': sha(producer.read_bytes()), 'records': records, 'notice': 'Finalized fresh closing observations, shared OpenAI lineage; no security certification, merge approval or release readiness. Remote readback remains separately required. Frozen143-member ZIP unchanged.'}
(destination / 'closing-review-manifest.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
