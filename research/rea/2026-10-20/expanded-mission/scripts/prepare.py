import hashlib,json,pathlib,subprocess,sys,tarfile,zipfile,urllib.request
from acquire import ROOT,OUT,download

def run(name,args,cwd=ROOT,env=None,timeout=240):
 import os,time,platform
 start=time.time()
 try:
  p=subprocess.run(args,cwd=cwd,env=env,capture_output=True,timeout=timeout)
  result={'name':name,'argv':args,'exit':p.returncode,'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace'),'wall_seconds':time.time()-start,'platform':platform.platform(),'status':'EXECUTED'}
 except Exception as e:result={'name':name,'argv':args,'status':'ERROR','error':str(e),'wall_seconds':time.time()-start}
 # Only synthetic data and public tool output. Keep host path private in shared research.
 for key in ['stdout','stderr','error']:
  if key in result:result[key]=result[key].replace(str(ROOT),'<WORK>').replace(str(ROOT).replace('\\','/'),'<WORK>')
 result['argv']=[str(a).replace(str(ROOT),'<WORK>') for a in args]
 (OUT/(name+'.json')).write_text(json.dumps(result,indent=2)+'\n')
 print(name,result['status'],result.get('exit'),round(result['wall_seconds'],3),flush=True)
 return result

def binaries():
 names={'reviewdog':r'Windows_x86_64.tar.gz$', 'gitleaks':r'windows_x64.zip$', 'ast-grep':r'app-x86_64-pc-windows-msvc.zip$', 'osv':r'osv-scanner_windows_amd64.exe$', 'opengrep':r'opengrep-core_linux_x86$', 'trivy':r'Linux-64bit.tar.gz$', 'slsa':r'slsa-verifier-linux-amd64$'}
 for name,rx in names.items():
  m=json.loads((OUT/(name+'-source.json')).read_text()); selected=[a for a in m['assets'] if __import__('re').search(rx,a['name'])]
  if not selected:
   print(name,'NO_MATCH', [a['name'] for a in m['assets']][:35],flush=True); continue
  a=selected[0]; dest=ROOT/'bin'/name/a['name']
  try:
   observed=download(a['browser_download_url'],dest); expected=a['digest']
   if expected and expected!='sha256:'+observed:raise RuntimeError('Release API digest mismatch')
   checks=[]
   for check in m['assets']:
    if check['name'] in ['checksums.txt','gitleaks_checksums.txt'] or check['name'].endswith('_checksums.txt'):
     cp=dest.parent/check['name']; download(check['browser_download_url'],cp)
     checks=[line for line in cp.read_text().splitlines() if a['name'] in line]
     if checks and observed not in checks[0]:raise RuntimeError('Published checksum mismatch')
   if dest.name.endswith('.zip'):
    with zipfile.ZipFile(dest) as z:
     for entry in z.infolist():
      if pathlib.PurePosixPath(entry.filename).name==entry.filename and not entry.is_dir():z.extract(entry,dest.parent)
   elif dest.name.endswith('.tar.gz'):
    with tarfile.open(dest) as t:
     for entry in t:
      if entry.isfile() and '/' not in entry.name and '\\' not in entry.name:
       (dest.parent/entry.name).write_bytes(t.extractfile(entry).read())
   record={'asset':a,'observed_sha256':observed,'release_api_digest_match':expected=='sha256:'+observed,'published_checksum_lines':checks,'local_files':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size} for p in dest.parent.iterdir() if p.is_file()]}
   (OUT/(name+'-artifact.json')).write_text(json.dumps(record,indent=2)+'\n')
   print(name,'DOWNLOADED',a['name'],flush=True)
  except Exception as e:
   (OUT/(name+'-artifact-error.json')).write_text(json.dumps({'error':str(e),'asset':a},indent=2))
   print(name,'DOWNLOAD_ERROR',str(e),flush=True)

if __name__=='__main__':
 if sys.argv[1]=='pip':
  run('python-install',[str(ROOT/'venv/Scripts/python.exe'),'-m','pip','install','--disable-pip-version-check','--report',str(ROOT/'python-install-report.json'),'pytest-testmon==2.2.0','in-toto==3.1.0','psutil==7.2.2'],timeout=240)
 elif sys.argv[1]=='binaries':binaries()
