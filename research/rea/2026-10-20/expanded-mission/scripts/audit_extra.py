import hashlib,json,pathlib,re,shutil,sys,urllib.request
from acquire import ROOT,OUT,download,gh
from bench import run,write,PY

def source(repo,name,paths):
 m=json.loads((OUT/(name+'-source.json')).read_text());dest=ROOT/'sources'/name
 missing=[]
 for path in paths:
  if name=='sentrdel':
   local=ROOT/'Sentrdel'/path
   if not local.exists():missing.append({'path':path,'reason':'not present at pin'});continue
   data=local.read_bytes();p=dest/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
  else:
   try:download('https://raw.githubusercontent.com/'+repo+'/'+m['commit']+'/'+path,dest/path)
   except Exception as e:missing.append({'path':path,'reason':str(e)});print(name,path,str(e));continue
  data=(dest/path).read_bytes();text=data.decode(errors='replace')
  m['source_files']=[x for x in m['source_files'] if x['path']!=path]
  m['source_files'].append({'path':path,'sha256':hashlib.sha256(data).hexdigest(),'lines':len(text.splitlines()),'declarations':[{'line':i,'text':s.strip()[:200]} for i,s in enumerate(text.splitlines(),1) if re.search(r'\b(def |fn |func |function |class |export (async )?function)',s)]})
 m.pop('error',None);m['missing_requested_files']=missing;m['status']='SOURCE_PARTIAL' if missing else 'SOURCE_ACQUIRED';(OUT/(name+'-source.json')).write_text(json.dumps(m,indent=2)+'\n')

def sources():
 source('TheHalfMoon/Sentrdel','sentrdel',['LICENSE','crates/sentrdel-schema/src/evidence.rs','crates/sentrdel-schema/src/finding.rs','crates/sentrdel-schema/src/coverage.rs','crates/sentrdel-engine/src/runner.rs','crates/sentrdel-engine/src/boundary.rs','crates/sentrdel-policy/src/kernel.rs','crates/sentrdel-review/src/sast.rs','crates/sentrdel-review/src/secrets.rs','crates/sentrdel-review/src/dependency.rs'])
 for name,repo,patterns in [('nx','nrwl/nx',[r'packages/nx/src/project-graph/affected/locators/.*\.ts$',r'packages/nx/src/project-graph/affected/affected-projects.ts$']),('pytest-impact','az-pz/pytest-impact',[r'^src/.*\.py$',r'^pyproject.toml$']),('testerarmy','tester-army/e2e',[r'packages/web/src/(engine|surface|browser-connection|site|security)\.ts$',r'packages/e2e/src/.*(exit|report|telemetry).*\.ts$']),('slsa','slsa-framework/slsa-verifier',[r'^cli/slsa-verifier/.*\.go$',r'^verifiers/internal/gha/.*(verify|bundle|provenance).*\.go$'])]:
  paths=json.loads((ROOT/'sources'/name/'paths.json').read_text());source(repo,name,[p for p in paths if any(re.search(rx,p) for rx in patterns)][:15])

def rea_inputs():
 slices={'nx':('nx',['dist/src/project-graph/affected/affected-project-graph.js']), 'stryker':('@stryker-mutator/core',['dist/src/mutants/mutant-test-planner.js']), 'testerarmy':('@e2e-dev/web',['dist/engine.js','dist/browser-connection.js'])}
 manifest=[]
 for name,(package,paths) in slices.items():
  d=ROOT/'rea-inputs'/name;d.mkdir(parents=True,exist_ok=True)
  for rel in paths:
   p=ROOT/'npm-tools/node_modules'/package/rel;target=d/p.name;shutil.copyfile(p,target);manifest.append({'candidate':name,'package':package,'package_relative_path':rel,'slice_name':name+'/'+p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 (OUT/'rea-input-slices.json').write_text(json.dumps({'method':'Unmodified selected files extracted from SRI-verified npm artifacts; dependencies intentionally not supplied; application graphs cannot prove whole-package semantics.','files':manifest},indent=2)+'\n')

def slsa():
 m=json.loads((OUT/'osv-source.json').read_text());a=next(x for x in m['assets'] if x['name']=='multiple.intoto.jsonl');dest=ROOT/'fixtures/slsa';dest.mkdir(parents=True,exist_ok=True);sha=download(a['browser_download_url'],dest/a['name']);(OUT/'slsa-input-provenance.json').write_text(json.dumps({'asset':a,'observed_sha256':sha,'release_api_match':a['digest']=='sha256:'+sha},indent=2)+'\n')
 def linux(p):return '/mnt/c/'+str(p).replace('\\','/')[3:]
 exe=ROOT/'bin/slsa/slsa-verifier-linux-amd64';art=ROOT/'bin/osv/osv-scanner_windows_amd64.exe'
 common=['wsl','-d','Ubuntu','--exec',linux(exe),'verify-artifact',linux(art),'--provenance-path',linux(dest/a['name']),'--source-uri','github.com/google/osv-scanner']
 for n in range(2):run(f'slsa-valid-{n}',common+['--source-tag',m['release']['tag_name']],ROOT,timeout=90)
 run('slsa-wrong-source',common[:-1]+['github.com/not-the-owner/not-the-repo'],ROOT,timeout=60)
 changed=dest/'tampered.exe';raw=art.read_bytes();changed.write_bytes(raw[:-1]+bytes([raw[-1]^1]));bad=common.copy();bad[6]=linux(changed)
 run('slsa-tampered',bad,ROOT,timeout=60)
 run('slsa-no-provenance',common[:7]+['--source-uri','github.com/google/osv-scanner'],ROOT,timeout=40)

if __name__=='__main__':
 for name in sys.argv[1:]:{'sources':sources,'rea_inputs':rea_inputs,'slsa':slsa}[name]()
