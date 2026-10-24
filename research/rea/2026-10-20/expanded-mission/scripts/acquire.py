import concurrent.futures, hashlib, json, pathlib, re, subprocess, time, urllib.request, os

ROOT = pathlib.Path(os.environ.get('ASCOUT_REA_WORK',str(pathlib.Path(__file__).resolve().parent)))
OUT = pathlib.Path(os.environ.get('ASCOUT_REA_OUTPUT',str(ROOT / 'Ascout/research/rea/2026-10-20/expansion')))
OUT.mkdir(parents=True, exist_ok=True)

TARGETS = {
 'testmon': ('tarpas/pytest-testmon', [r'testmon/.*(pytest_testmon|testmon_core|process_code|db).*\.py$',r'^LICENSE']),
 'nx': ('nrwl/nx', [r'packages/nx/src/project-graph/affected/(affected-project-graph|locators/project-glob-changes|locators/workspace-projects)\.ts$',r'^LICENSE']),
 'reviewdog': ('reviewdog/reviewdog', [r'^(filter/(filter|diff_filter)|parser/sarif)\.go$',r'^LICENSE']),
 'sentrdel': ('TheHalfMoon/Sentrdel', [r'crates/sentrdel-(schema/src/(evidence|finding|coverage)|engine/src/(adapter|runner)|review/src/(sast|secrets|dependency)[^/]*|policy/src/kernel)\.rs$',r'^LICENSE']),
 'in-toto': ('in-toto/in-toto', [r'in_toto/(runlib|verifylib|models/link|models/layout)\.py$',r'^LICENSE']),
 'stryker': ('stryker-mutator/stryker-js', [r'packages/core/src/(process/(.*executor|.*dry-run).*|mutants/.*|reporters/json-reporter)\.ts$',r'^LICENSE']),
 'opengrep': ('opengrep/opengrep', [r'cli/src/semgrep/(formatter/sarif|commands/scan|semgrep_main)\.py$',r'^LICENSE']),
 'ast-grep': ('ast-grep/ast-grep', [r'crates/(cli/src/(scan|run|config).*|core/src/matcher)\.rs$',r'^LICENSE']),
 'osv': ('google/osv-scanner', [r'pkg/osvscanner/.*\.go$',r'internal/.*(offline|local).*\.go$',r'^LICENSE']),
 'gitleaks': ('gitleaks/gitleaks', [r'^(detect/detect|cmd/(git|dir|root))\.go$',r'^LICENSE']),
 'testerarmy': ('tester-army/e2e', [r'packages/[^/]+/src/.*(test|runner|browser|config).*\.[cm]?ts$',r'^LICENSE',r'^NOTICE']),
 'semgrep': ('semgrep/semgrep', [r'cli/src/semgrep/(formatter/sarif|commands/scan|semgrep_main)\.py$',r'^LICENSE']),
 'trivy': ('aquasecurity/trivy', [r'pkg/(scanner/local/scan|flag/db_flags|db/db)\.go$',r'^LICENSE']),
 'pytest-impact': ('az-pz/pytest-impact', [r'.*(plugin|graph|select|impact).*\.py$',r'^LICENSE']),
 'slsa': ('slsa-framework/slsa-verifier', [r'.*(verify_artifact|verify-artifact|options|slsa)\.go$',r'^LICENSE']),
 'rea': ('morluto/rea', [r'src/.*process.*\.[cm]?js$',r'^package.json$',r'^LICENSE']),
}

def gh(endpoint):
 p = subprocess.run(['gh','api',endpoint], capture_output=True, timeout=75)
 if p.returncode: raise RuntimeError(p.stderr.decode(errors='replace'))
 return json.loads(p.stdout)

def download(url, dest):
 req=urllib.request.Request(url,headers={'User-Agent':'Ascout-REA-research'})
 with urllib.request.urlopen(req,timeout=90) as response: data=response.read()
 dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(data)
 return hashlib.sha256(data).hexdigest()

def acquire(item):
 name,(repo,patterns)=item
 dest=ROOT/'sources'/name; dest.mkdir(parents=True,exist_ok=True)
 record={'candidate':name,'repository':repo,'observed_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
 try:
  info=gh('repos/'+repo); record['default_branch']=info['default_branch']; record['license_api']=info.get('license')
  head=gh('repos/'+repo+'/commits/'+info['default_branch']); record['live_head']=head['sha']
  try: release=gh('repos/'+repo+'/releases/latest')
  except Exception as e: release={'unavailable':str(e).strip(),'assets':[]}
  record['release']={k:release.get(k) for k in ['tag_name','html_url','published_at','unavailable']}
  record['assets']=[{k:a.get(k) for k in ['name','size','digest','browser_download_url']} for a in release['assets']]
  ref=release.get('tag_name') or record['live_head']
  # Existing proven reviewdog artifact is retained as a reproducible historical comparator.
  if name=='reviewdog': ref='v0.21.2'
  commit=gh('repos/'+repo+'/commits/'+ref); record['source_ref']=ref; record['commit']=commit['sha']; record['tree']=commit['commit']['tree']['sha']
  tree=gh('repos/'+repo+'/git/trees/'+record['tree']+'?recursive=1')
  record['tree_truncated']=tree.get('truncated',False)
  paths=[x['path'] for x in tree['tree'] if x['type']=='blob']; (dest/'paths.json').write_text(json.dumps(paths))
  selected=[p for p in paths if any(re.search(rx,p) for rx in patterns)][:24]
  record['source_files']=[]
  for p in selected:
   sha=download('https://raw.githubusercontent.com/'+repo+'/'+record['commit']+'/'+p,dest/p)
   data=(dest/p).read_text(errors='replace')
   funcs=[{'line':i,'text':s.strip()[:200]} for i,s in enumerate(data.splitlines(),1) if re.search(r'\b(def |fn |func |function |class |export (async )?function)',s)]
   record['source_files'].append({'path':p,'sha256':sha,'lines':len(data.splitlines()),'declarations':funcs})
  record['status']='SOURCE_ACQUIRED'
 except Exception as e: record['status']='INCOMPLETE';record['error']=str(e)
 (OUT/(name+'-source.json')).write_text(json.dumps(record,indent=2)+'\n')
 print(name,record['status'],record.get('commit',''),len(record.get('source_files',[])),flush=True)
 return record

if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: list(pool.map(acquire,TARGETS.items()))
