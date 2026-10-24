import hashlib,json,pathlib,subprocess,sys,urllib.request
from acquire import download
from bench import ROOT,OUT,run,write,PY

def opengrep():
 m=json.loads((OUT/'opengrep-source.json').read_text());a=next(x for x in m['assets'] if x['name']=='opengrep_windows_x86.exe');dest=ROOT/'bin/opengrep'/a['name']
 if not dest.is_file():raise RuntimeError('Pinned OpenGrep executable missing; run replay --setup before offline replay')
 sha=hashlib.sha256(dest.read_bytes()).hexdigest()
 if a['digest']!='sha256:'+sha:raise RuntimeError('Release digest mismatch')
 (OUT/'opengrep-artifact.json').write_text(json.dumps({'asset':a,'observed_sha256':sha,'release_api_digest_match':True},indent=2)+'\n')
 d=ROOT/'fixtures/security';run('opengrep-version',[dest,'--version'],d)
 for n in range(2):run(f'opengrep-runtime-{n}',[dest,'--config','rule.yml','--json','--disable-version-check','--no-git-ignore','danger.js','safe.js','shadow.js'],d,timeout=90)
 run('opengrep-missing-local-rule',[dest,'--config','no-such-rule.yml','--json','--disable-version-check','danger.js'],d,timeout=45)

def osv():
 d=ROOT/'fixtures/osv';d.mkdir(parents=True,exist_ok=True)
 write(d,'package-lock.json',json.dumps({'name':'synthetic-only','version':'1.0.0','lockfileVersion':3,'requires':True,'packages':{'':{'name':'synthetic-only','version':'1.0.0','dependencies':{'lodash':'4.17.20'}},'node_modules/lodash':{'name':'lodash','version':'4.17.20','resolved':'https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz'}}}))
 exe=ROOT/'bin/osv/osv-scanner_windows_amd64.exe'
 for n in range(2):run(f'osv-offline-vulnerabilities-{n}',[exe,'scan','source','--offline','--offline-vulnerabilities','--all-packages','--format=json','--lockfile=package-lock.json'],d,timeout=60,extra={'OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY':str(d/'empty-db')})
 # Public advisory lookup for a synthetic coordinate, no repository source upload.
 for n in range(2):run(f'osv-runtime-online-{n}',[exe,'scan','source','--all-packages','--format=json','--lockfile=package-lock.json'],d,timeout=60)
 osv_malformed()

def osv_malformed():
 d=ROOT/'fixtures/osv-malformed';d.mkdir(parents=True,exist_ok=True)
 write(d,'package-lock.json','{broken')
 for n in range(2):run(f'osv-malformed-supported-extractor-{n}',[ROOT/'bin/osv/osv-scanner_windows_amd64.exe','scan','source','--offline','--format=json','--lockfile=package-lock.json'],d)

def provenance():
 for n in range(2):run(f'in-toto-runtime-{n}',[PY,ROOT/'provenance_probe.py',ROOT/'fixtures'/f'in-toto-runtime-{n}'],ROOT,timeout=45)

if __name__=='__main__':
 for name in sys.argv[1:]:{'opengrep':opengrep,'osv':osv,'osv-malformed':osv_malformed,'provenance':provenance}[name]()
