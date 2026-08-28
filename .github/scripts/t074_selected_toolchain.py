import json, shutil, subprocess, tempfile
from pathlib import Path

root=Path(tempfile.mkdtemp(prefix='t074-selected-toolchain-'))
def run(repo,*args):
 p=subprocess.run(['git','-C',str(repo),*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True); return p.stdout
def repo(name,url,ref):
 r=root/name; subprocess.run(['git','init','-q',str(r)],check=True); subprocess.run(['git','-C',str(r),'remote','add','origin',url],check=True); subprocess.run(['git','-C',str(r),'fetch','-q','--filter=blob:none','--depth=1','origin',ref],check=True); return r
try:
 node=repo('node','https://github.com/nodejs/node.git','refs/tags/v24.0.0'); n=run(node,'rev-parse','FETCH_HEAD^{}').strip(); npmver=json.loads(run(node,'show',f'{n}:deps/npm/package.json'))['version']; assert npmver=='11.3.0'
 npm=repo('npm','https://github.com/npm/cli.git','refs/tags/v11.3.0'); npmc=run(npm,'rev-parse','FETCH_HEAD^{}').strip()
 yarn=repo('yarn','https://github.com/yarnpkg/yarn.git','refs/tags/v1.22.22'); yarnc=run(yarn,'rev-parse','FETCH_HEAD^{}').strip()
 print('NODE_24_0_0_TAG_COMMIT='+n)
 print('NODE_24_0_0_BUNDLED_NPM=11.3.0')
 print('NPM_11_3_0_TAG_COMMIT='+npmc)
 print('YARN_1_22_22_TAG_COMMIT='+yarnc)
 print('T074_SELECTED_TOOLCHAIN=PASS')
finally:
 shutil.rmtree(root,ignore_errors=True)
