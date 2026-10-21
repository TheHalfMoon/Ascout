"""Static checks of generated replay assets; never execute them."""
import ast,datetime,hashlib,json,pathlib,sys,zipfile
root=pathlib.Path(__file__).resolve().parent
publication=root/'Ascout/qualification/rea-engineering/2026-10-20'
archive_path=publication/'evidence.zip';errors=[];checked=[]
canonical_publisher=(root/'publish_evidence.py').read_bytes().replace(b'\r\n',b'\n')
published_publisher=(publication/'scripts/publish_evidence.py').read_bytes().replace(b'\r\n',b'\n')
publisher_roundtrip_identical=canonical_publisher==published_publisher
if not publisher_roundtrip_identical:errors.append({'file':'standalone/publish_evidence.py','message':'Publisher source differs after privacy roundtrip beyond line endings'})
with zipfile.ZipFile(archive_path) as archive:
 assert archive.testzip() is None
 candidates=[('standalone/'+p.name,p.read_bytes()) for p in (publication/'scripts').glob('*.py')]
 candidates.extend((name,archive.read(name)) for name in archive.namelist() if name.endswith('.py'))
 for name,data in candidates:
  try:ast.parse(data.decode('utf-8-sig'),filename=name)
  except SyntaxError as error:errors.append({'file':name,'line':error.lineno,'message':error.msg})
  checked.append({'file':name,'sha256':hashlib.sha256(data).hexdigest()})
 json_members=[name for name in archive.namelist() if name.endswith('.json')]
 for name in json_members:json.loads(archive.read(name))
 manifest=json.loads(archive.read('MANIFEST.json'))
 assert len(manifest['records'])==len({r['path'] for r in manifest['records']})
 for item in manifest['records']:
  data=archive.read(item['path'])
  assert hashlib.sha256(data).hexdigest()==item['sha256'] and len(data)==item['bytes']
record={'captured_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'kind':'Static generated-source syntax and archive-integrity check; no replay helper executed','publisher_roundtrip_identical':publisher_roundtrip_identical,'archive_sha256':hashlib.sha256(archive_path.read_bytes()).hexdigest(),'python_sources_checked':len(checked),'json_members_checked':len(json_members),'errors':errors,'checked':checked,'result':'PASS' if not errors else 'FAIL'}
out=root/'packet-review';out.mkdir(exist_ok=True)
(out/'published-syntax-latest.json').write_bytes((json.dumps(record,indent=2)+'\n').encode())
print(json.dumps({k:record[k] for k in ['result','python_sources_checked','json_members_checked','errors','archive_sha256']}))
sys.exit(1 if errors else 0)
