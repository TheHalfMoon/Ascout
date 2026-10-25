"""Read back actual Task023 closing sidecars and optional forward readback receipt."""
import ast, base64, datetime, hashlib, json, pathlib, subprocess, sys

root = pathlib.Path(__file__).resolve().parent
repo = root.parent / 'engineering/main-control'
head, branch = sys.argv[1:]
prefix = 'qualification/git-index-observation/2026-10-25-closeout'
def get(path):
    return json.loads(subprocess.check_output(['rtk', 'proxy', 'gh', 'api', 'repos/TheHalfMoon/Ascout/' + path]))
assert get('commits/' + branch)['sha'] == head
manifest = json.loads((repo / prefix / 'closing-review-manifest.json').read_text())
names = ['closing-review-manifest.json'] + [item['path'] for item in manifest['records']]
if (repo / prefix / 'REMOTE_READBACK.json').exists():
    names.append('REMOTE_READBACK.json')
records = []
for name in names:
    assert pathlib.PurePosixPath(name).name == name and pathlib.Path(name).suffix in ['.json', '.py']
    item = get('contents/' + prefix + '/' + name + '?ref=' + head)
    remote = base64.b64decode(item['content'])
    assert remote == (repo / prefix / name).read_bytes()
    if name.endswith('.json'): json.loads(remote)
    else: ast.parse(remote.decode())
    digest = hashlib.sha256(remote).hexdigest()
    expected = next((value for value in manifest['records'] if value['path'] == name), None)
    if expected: assert digest == expected['published_sha256'] and len(remote) == expected['bytes']
    records.append({'path': name, 'git_blob': item['sha'], 'sha256': digest, 'bytes': len(remote)})
result = {'observed_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'head': head, 'branch': branch, 'prefix': prefix, 'remote_ref_and_all_sidecar_bytes_verified': True, 'records': records, 'notice': 'Actual remote evidence durability only; no authentication of minimized originals, release readiness or gate waiver.'}
(root / ('index-closing-sidecars-readback-' + head[:7] + '.json')).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
