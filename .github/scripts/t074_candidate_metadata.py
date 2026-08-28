import hashlib, json, re, shutil, subprocess, tempfile
from pathlib import Path

CASES = [
    ('immer-prototype-undefined','https://github.com/immerjs/immer.git','16e225b5a316d9ef6695e9aee45eab6e7bf4258a',['src/core/proxy.ts'],['__tests__/regressions.js']),
    ('fastify-notfound-prehandler','https://github.com/fastify/fastify.git','4176096a31f5b4c31512c36f578b08a596a72435',['lib/four-oh-four.js'],['test/404s.test.js']),
    ('axios-tojson-dag','https://github.com/axios/axios.git','f2b903fceaa0a02cefd77f6b4b123c679605aae9',['lib/utils.js'],['tests/unit/utils.test.js']),
    ('undici-h2-late-response','https://github.com/nodejs/undici.git','e5b3364ddc620c0d1c61424d1278fc0965207477',['lib/dispatcher/client-h2.js'],['test/http2-response-after-completion.js']),
]

def run(repo,*args,raw=False,check=True):
    p=subprocess.run(['git','-C',str(repo),*args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=check)
    return p.stdout if raw else p.stdout.decode('utf-8',errors='replace')

def exists(repo,spec):
    return subprocess.run(['git','-C',str(repo),'cat-file','-e',spec],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0

def show(repo,ref,path,raw=False):
    return run(repo,'cat-file','blob',f'{ref}:{path}',raw=raw)

def sha256(data): return hashlib.sha256(data).hexdigest()

def added_lines(repo,base,fix,path):
    text=run(repo,'diff','--unified=0',base,fix,'--',path)
    out=[]
    for line in text.splitlines():
        if not line.startswith('@@'): continue
        m=re.search(r'\+(\d+)(?:,(\d+))?',line)
        if not m: continue
        start=int(m.group(1)); count=int(m.group(2) or '1')
        out.extend(range(start,start+count))
    return out

root=Path(tempfile.mkdtemp(prefix='t074-meta-'))
try:
    for cid,url,fix,prod,tests in CASES:
        repo=root/cid
        subprocess.run(['git','init','-q',str(repo)],check=True)
        subprocess.run(['git','-C',str(repo),'remote','add','origin',url],check=True)
        subprocess.run(['git','-C',str(repo),'fetch','-q','--filter=blob:none','--depth=3','origin',fix],check=True)
        parents=run(repo,'show','-s','--format=%P',fix).strip().split()
        assert len(parents)==1, (cid,parents)
        base=parents[0]
        if not exists(repo,base+'^{commit}'):
            subprocess.run(['git','-C',str(repo),'fetch','-q','--filter=blob:none','--depth=2','origin',base],check=True)
        base_parents=run(repo,'show','-s','--format=%P',base).strip().split()
        changed=[]
        for row in run(repo,'diff','--name-status',base,fix).splitlines():
            parts=row.split('\t'); changed.append({'status':parts[0],'paths':parts[1:]})
        changed_paths={p for row in changed for p in row['paths']}
        assert set(prod+tests) <= changed_paths
        meta={
            'case_id':cid,'url':url,'fix':fix,'fix_tree':run(repo,'rev-parse',fix+'^{tree}').strip(),
            'fix_parents':parents,'base':base,'base_tree':run(repo,'rev-parse',base+'^{tree}').strip(),
            'base_parents':base_parents,'changed':changed,'production':prod,'tests':tests,
            'production_added_lines':{p:added_lines(repo,base,fix,p) for p in prod},
            'production_fix_blobs':{},'test_base_fix_blobs':{},'metadata':{},'licenses':[]
        }
        for p in prod:
            meta['production_fix_blobs'][p]=run(repo,'rev-parse',f'{fix}:{p}').strip()
        for p in tests:
            meta['test_base_fix_blobs'][p]={
                'base':run(repo,'rev-parse',f'{base}:{p}').strip() if exists(repo,f'{base}:{p}') else None,
                'fix':run(repo,'rev-parse',f'{fix}:{p}').strip() if exists(repo,f'{fix}:{p}') else None,
            }
        for p in ['package.json','package-lock.json','pnpm-lock.yaml','yarn.lock','.nvmrc','.node-version','.tool-versions','LICENSE','LICENSE.md','license','license.md']:
            if exists(repo,f'{fix}:{p}'):
                data=show(repo,fix,p,raw=True); blob=run(repo,'rev-parse',f'{fix}:{p}').strip()
                meta['metadata'][p]={'blob':blob,'sha256':sha256(data),'text':data.decode('utf-8',errors='replace')[:12000]}
        for p in ['LICENSE','LICENSE.md','license','license.md']:
            for refname,ref in [('base',base),('fix',fix)]:
                if exists(repo,f'{ref}:{p}'):
                    data=show(repo,ref,p,raw=True); meta['licenses'].append({'role':refname,'path':p,'blob':run(repo,'rev-parse',f'{ref}:{p}').strip(),'sha256':sha256(data),'prefix':data.decode('utf-8',errors='replace')[:200]})
                    break
        # Inspect relevant CI/version provenance text without execution.
        workflow_files=run(repo,'ls-tree','-r','--name-only',fix,'.github/workflows').splitlines()
        ci_hits=[]
        for p in workflow_files:
            if not p.endswith(('.yml','.yaml')): continue
            text=show(repo,fix,p)
            if any(k in text for k in ['node-version','corepack','pnpm/action-setup','yarn','npm ci']):
                ci_hits.append({'path':p,'blob':run(repo,'rev-parse',f'{fix}:{p}').strip(),'relevant_lines':[x.strip() for x in text.splitlines() if any(k in x for k in ['node-version','corepack','pnpm/action-setup','version:','npm ci','yarn install','pnpm install'])][:80]})
        meta['ci_hits']=ci_hits[:12]
        print('CASE_JSON='+json.dumps(meta,separators=(',',':')))
    print('T074 metadata audit PASS')
    print('DONOR_CHECKOUT=NO')
    print('DONOR_DEPENDENCY_INSTALL=NO')
    print('DONOR_SCRIPT_EXECUTION=NO')
    print('DONOR_TEST_EXECUTION=NO')
finally:
    shutil.rmtree(root,ignore_errors=True)
