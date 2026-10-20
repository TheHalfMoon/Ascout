"""Verify the published package and replay pinned synthetic probes on Windows.

No production changes, required model, paid endpoint or cloud execution.
Setup downloads public pinned packages/artifacts and preserves their digests.
"""
import argparse,base64,hashlib,json,os,pathlib,shutil,subprocess,sys,tarfile,urllib.request,venv,zipfile

HERE=pathlib.Path(__file__).resolve().parent
def digest(data):return hashlib.sha256(data).hexdigest()
def call(argv,cwd=None,env=None):
 result=subprocess.run([str(x) for x in argv],cwd=cwd,env=env,check=False)
 if result.returncode:raise RuntimeError('Setup/controller failed with exit '+str(result.returncode))
def fetch(url,dest,expected):
 dest.parent.mkdir(parents=True,exist_ok=True)
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Ascout-REA-frozen-replay'}),timeout=120) as f:data=f.read()
 if digest(data)!=expected:raise ValueError('Artifact SHA256 mismatch: '+dest.name)
 dest.write_bytes(data)
def verify():
 package=json.loads((HERE/'PACKAGE_MANIFEST.json').read_text(encoding='utf-8'))
 expected={item['path'] for item in package['files']}|{'PACKAGE_MANIFEST.json'}
 actual={p.relative_to(HERE).as_posix() for p in HERE.rglob('*') if p.is_file()}
 if actual!=expected:raise ValueError('Package file inventory mismatch')
 for item in package['files']:
  data=(HERE/item['path']).read_bytes()
  if len(data)!=item['bytes'] or digest(data)!=item['sha256']:raise ValueError('Package file mismatch: '+item['path'])
 lock=json.loads((HERE/'REPLAY_LOCK.json').read_text());raw=(HERE/'evidence.zip').read_bytes()
 if digest(raw)!=lock['evidence_zip_sha256']:raise ValueError('Evidence archive digest mismatch')
 with zipfile.ZipFile(HERE/'evidence.zip') as z:
  manifest=json.loads(z.read('MANIFEST.json'))
  names=z.namelist()
  if len(names)!=len(set(names)) or set(names)!={item['path'] for item in manifest['records']}|{'MANIFEST.json'}:raise ValueError('Archive member inventory mismatch')
  if any(pathlib.PurePosixPath(name).is_absolute() or '..' in pathlib.PurePosixPath(name).parts or '\\' in name for name in names):raise ValueError('Unsafe archive path')
  for item in manifest['records']:
   data=z.read(item['path'])
   if len(data)!=item['bytes'] or digest(data)!=item['sha256']:raise ValueError('Evidence member mismatch: '+item['path'])
 print('Verified archive and',len(manifest['records']),'sanitized member digests; this is integrity, not a security PASS.')
 return lock
def extract_binary(archive,target):
 # Materialize only regular top-level files, matching the original acquisition.
 if archive.suffix=='.zip':
  with zipfile.ZipFile(archive) as z:
   for item in z.infolist():
    if not item.is_dir() and pathlib.PurePosixPath(item.filename).name==item.filename and '\\' not in item.filename:
     dest=(target/item.filename).resolve();dest.relative_to(target.resolve());dest.write_bytes(z.read(item))
 elif archive.name.endswith('.tar.gz'):
  with tarfile.open(archive) as t:
   for item in t:
    if item.isfile() and '/' not in item.name and '\\' not in item.name:
     dest=(target/item.name).resolve();dest.relative_to(target.resolve());dest.write_bytes(t.extractfile(item).read())
def setup(work,lock):
 work.mkdir(parents=True,exist_ok=False)
 evidence=work/'evidence';evidence.mkdir();tools=work/'npm-tools';tools.mkdir()
 with zipfile.ZipFile(HERE/'evidence.zip') as z:
  (tools/'package.json').write_bytes(z.read('locks/npm-package.json'))
  (tools/'package-lock.json').write_bytes(z.read('locks/npm-package-lock.json'))
  (work/'requirements.lock').write_bytes(z.read('locks/requirements.lock'))
  for name in z.namelist():
   if name.startswith('metadata/') and '/' not in name[len('metadata/'):]:
    (evidence/pathlib.PurePosixPath(name).name).write_bytes(z.read(name))
   prefix='fixtures/npm-tools/nx/'
   if name.startswith(prefix):
    dest=(tools/'fixtures/nx'/name[len(prefix):]).resolve();dest.relative_to((tools/'fixtures/nx').resolve());dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(name))
 for script in (HERE/'scripts').glob('*.py'):shutil.copyfile(script,work/script.name)
 venv.EnvBuilder(with_pip=True).create(work/'venv')
 py=work/'venv/Scripts/python.exe'
 call([py,'-m','pip','--isolated','install','--index-url','https://pypi.org/simple','--disable-pip-version-check','--require-hashes','-r',work/'requirements.lock'])
 node=pathlib.Path(shutil.which('node') or '')
 if not node.is_file():raise RuntimeError('Node 24 is required on PATH')
 npm=node.parent/'node_modules/npm/bin/npm-cli.js'
 if not npm.is_file():raise RuntimeError('Cannot locate npm CLI beside Node; install Node/npm before setup')
 call([node,npm,'ci','--ignore-scripts','--no-fund','--no-audit'],cwd=tools)
 for candidate,record in lock['release_artifacts'].items():
  asset=record['asset'];target=work/'bin'/candidate;archive=target/asset['name']
  fetch(asset['browser_download_url'],archive,record['observed_sha256']);extract_binary(archive,target)
 for name,source in lock['sources'].items():
  if name!='pytest-impact':continue
  for item in source['files']:
   path=item['path'];dest=work/'sources'/name/path;url='https://raw.githubusercontent.com/'+source['repository']+'/'+source['commit']+'/'+path
   fetch(url,dest,item['sha256'])
 for candidate in lock['python_wheels']:
  # Package wheels are optional REA inventory inputs. Runtime setup above uses the hash-locked set.
  print('Recorded wheel inventory identity:',candidate['file'],candidate['sha256'])
 print('Setup complete. No package lifecycle scripts were enabled.')
def main():
 p=argparse.ArgumentParser();p.add_argument('--work-dir',type=pathlib.Path);p.add_argument('--setup',action='store_true');p.add_argument('--run',nargs='*',choices=['testmon','reviewdog','security','semgrep','opengrep','nx','impact','stryker','e2e','provenance','osv','trivy','slsa']);p.add_argument('--network',action='store_true');p.add_argument('--browser',type=pathlib.Path);args=p.parse_args()
 lock=verify()
 if not args.setup and args.run is None:return
 if os.name!='nt':raise RuntimeError('This replay harness is Windows-specific; Linux targets additionally use WSL Ubuntu.')
 if not args.work_dir:raise ValueError('--work-dir is required for setup or execution')
 work=args.work_dir.resolve()
 if args.setup:setup(work,lock)
 if args.run is None:return
 env=dict(os.environ);env.update({'ASCOUT_REA_WORK':str(work),'ASCOUT_REA_OUTPUT':str(work/'evidence'),'DO_NOT_TRACK':'1','E2E_TELEMETRY_DISABLED':'1'})
 if args.browser:env['ASCOUT_REA_BROWSER']=str(args.browser.resolve())
 groups={'testmon':('bench.py','testmon'),'reviewdog':('bench.py','reviewdog'),'security':('bench.py','security'),'semgrep':('qualify.py','semgrep'),'opengrep':('extras.py','opengrep'),'nx':('qualify.py','nx'),'impact':('qualify.py','impact'),'stryker':('morebench.py','stryker'),'e2e':('morebench.py','e2e'),'provenance':('extras.py','provenance'),'osv':('extras.py','osv'),'trivy':('qualify.py','trivy'),'slsa':('audit_extra.py','slsa')}
 for candidate in args.run:
  if candidate in ['osv','slsa'] and not args.network:raise ValueError(candidate+' includes public network verification/queries; add --network to make that explicit')
  file,group=groups[candidate];call([work/'venv/Scripts/python.exe',work/file,group],cwd=work.parent,env=env)
 print('Replay outputs:',work/'evidence','— inspect oracle outcomes; controller success is not donor quality PASS.')
if __name__=='__main__':main()
