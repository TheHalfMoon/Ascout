import hashlib, json, shutil, subprocess, tempfile
from pathlib import Path

root=Path(tempfile.mkdtemp(prefix='t074-toolchain-'))

def run(repo,*args,raw=False):
 p=subprocess.run(['git','-C',str(repo),*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 return p.stdout if raw else p.stdout.decode()

def fetch_repo(name,url,ref,depth=2):
 r=root/name; subprocess.run(['git','init','-q',str(r)],check=True); subprocess.run(['git','-C',str(r),'remote','add','origin',url],check=True); subprocess.run(['git','-C',str(r),'fetch','-q','--filter=blob:none',f'--depth={depth}','origin',ref],check=True); return r

try:
 # Node 24.0.0 is the common benchmark runtime. Prove exact tag and bundled npm version.
 node=fetch_repo('node','https://github.com/nodejs/node.git','refs/tags/v24.0.0',1)
 tag=run(node,'rev-parse','FETCH_HEAD^{}').strip()
 npm_pkg=json.loads(run(node,'show',f'{tag}:deps/npm/package.json'))
 print('NODE_TAG_COMMIT='+tag)
 print('NODE_VERSION=24.0.0')
 print('NODE_BUNDLED_NPM_VERSION='+npm_pkg['version'])
 # Prove npm tag for bundled version exists in npm/cli.
 npmver=npm_pkg['version']
 npm=fetch_repo('npm','https://github.com/npm/cli.git',f'refs/tags/v{npmver}',1)
 print('NPM_TAG_COMMIT='+run(npm,'rev-parse','FETCH_HEAD^{}').strip())
 # Fastify exact lock/license/runtime/package metadata.
 fix='4176096a31f5b4c31512c36f578b08a596a72435'
 fast=fetch_repo('fastify','https://github.com/fastify/fastify.git',fix,2)
 base=run(fast,'show','-s','--format=%P',fix).strip()
 for p in ['package-lock.json','package.json','LICENSE','.github/workflows/ci.yml']:
  blob=run(fast,'rev-parse',f'{fix}:{p}').strip(); data=run(fast,'cat-file','blob',blob,raw=True)
  print('FASTIFY_'+p.replace('/','_').replace('.','_').upper()+'_BLOB='+blob)
  print('FASTIFY_'+p.replace('/','_').replace('.','_').upper()+'_SHA256='+hashlib.sha256(data).hexdigest())
 pkg=json.loads(run(fast,'show',f'{fix}:package.json'))
 lock=json.loads(run(fast,'show',f'{fix}:package-lock.json'))
 print('FASTIFY_LOCKFILE_VERSION='+str(lock['lockfileVersion']))
 print('FASTIFY_ENGINES_NODE='+str(pkg.get('engines',{}).get('node')))
 print('FASTIFY_SCRIPTS='+json.dumps({k:pkg['scripts'][k] for k in ['test','test:ci','unit']},sort_keys=True))
 ci=run(fast,'show',f'{fix}:.github/workflows/ci.yml')
 print('FASTIFY_CI_HAS_NODE24='+str('node-version: [24, 26]' in ci).lower())
 # Axios and Undici compact runtime assertions.
 for name,url,fix in [
  ('axios','https://github.com/axios/axios.git','f2b903fceaa0a02cefd77f6b4b123c679605aae9'),
  ('undici','https://github.com/nodejs/undici.git','e5b3364ddc620c0d1c61424d1278fc0965207477')]:
  r=fetch_repo(name,url,fix,2); pkg=json.loads(run(r,'show',f'{fix}:package.json')); lock=json.loads(run(r,'show',f'{fix}:package-lock.json'))
  print(name.upper()+'_ENGINES_NODE='+str(pkg.get('engines',{}).get('node')))
  print(name.upper()+'_LOCKFILE_VERSION='+str(lock['lockfileVersion']))
 print('T074_COMPACT_TOOLCHAIN_AUDIT=PASS')
 print('DONOR_CHECKOUT=NO')
 print('DONOR_DEPENDENCY_INSTALL=NO')
 print('DONOR_SCRIPT_EXECUTION=NO')
 print('DONOR_TEST_EXECUTION=NO')
finally:
 shutil.rmtree(root,ignore_errors=True)
