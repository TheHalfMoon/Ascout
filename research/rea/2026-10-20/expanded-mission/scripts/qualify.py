import json,pathlib,sys,subprocess,uuid,os,shutil
from bench import ROOT,OUT,PY,run,write
NODE=pathlib.Path(os.environ.get('ASCOUT_REA_NODE',shutil.which('node') or 'node'))
NPM=ROOT/'npm-tools/node_modules'

def focused():
 d=ROOT/'Ascout';files=[str(p.relative_to(d)) for p in sorted((d/'tests').glob('assurance-security-*.test.ts'))]
 files+=['pytest-basic-task.contract.test.ts','selection-account.contract.test.ts']
 run('ascout-focused-contracts',[NODE,d/'node_modules/vitest/vitest.mjs','run','--maxWorkers=1','--no-file-parallelism',*files],d,timeout=120)

def semgrep():
 d=ROOT/'fixtures/security'
 exe=ROOT/'venv/Scripts/semgrep.exe'
 run('semgrep-cli-version',[exe,'--version','--disable-version-check'],d,timeout=45)
 for n in range(2):run(f'semgrep-cli-runtime-{n}',[exe,'scan','--config','rule.yml','--json','--metrics=off','--disable-version-check','--no-git-ignore','danger.js','safe.js','shadow.js'],d,timeout=60)
 run('semgrep-cli-missing-rule',[exe,'scan','--config','absent-local.yml','--json','--metrics=off','--disable-version-check','danger.js'],d,timeout=45)

def nx_sequential():
 d=ROOT/'npm-tools/fixtures/nx'
 controls=[NODE,'--test','packages/lib/test.mjs','packages/app/test.mjs','packages/other/test.mjs']
 write(d,'packages/lib/index.mjs','export function value() { return 1; }\n')
 run('nx-replay-full-baseline',controls,d)
 write(d,'packages/lib/index.mjs','export function value() { return 99; }\n')
 run('nx-replay-full-mutated',controls,d)
 # Keep plugin isolation fixed and explicit. Previous Windows socket-worker failures are retained separately.
 cfg=json.loads((d/'packages/app/project.json').read_text());cfg['implicitDependencies']=['lib'];write(d,'packages/app/project.json',json.dumps(cfg))
 base=[NODE,NPM/'nx/dist/bin/nx.js','show','projects','--affected','--json']
 for n in range(2):run(f'nx-inprocess-affected-{n}',[*base,'--files=packages/lib/index.mjs'],d,extra={'NX_ISOLATE_PLUGINS':'false','NX_SKIP_UPDATE_CHECK':'true'},timeout=45)
 cfg.pop('implicitDependencies');write(d,'packages/app/project.json',json.dumps(cfg))
 for n in range(2):run(f'nx-inprocess-no-explicit-edge-{n}',[*base,'--files=packages/lib/index.mjs'],d,extra={'NX_ISOLATE_PLUGINS':'false','NX_SKIP_UPDATE_CHECK':'true'},timeout=45)
 run('nx-inprocess-global',[*base,'--files=nx.json'],d,extra={'NX_ISOLATE_PLUGINS':'false','NX_SKIP_UPDATE_CHECK':'true'},timeout=45)

def pytest_impact():
 source=ROOT/'sources/pytest-impact/src'
 d=ROOT/'fixtures'/('impact-'+uuid.uuid4().hex[:8]);d.mkdir(parents=True,exist_ok=True)
 for args in [['init','-q'],['config','user.name','REA Fixture'],['config','user.email','rea@example.invalid'],['config','core.autocrlf','false']]:subprocess.run(['git',*args],cwd=d,check=True,capture_output=True)
 write(d,'calc.py','def value():\n    return 1\n');write(d,'test_calc.py','from calc import value\ndef test_value():\n    assert value() == 1\n')
 write(d,'test_data.py','from pathlib import Path\ndef test_data():\n    assert Path("value.txt").read_text().strip() == "ok"\n');write(d,'value.txt','ok\n')
 subprocess.run(['git','add','.'],cwd=d,check=True);subprocess.run(['git','commit','-qm','fixture baseline'],cwd=d,capture_output=True,check=True)
 base=[PY,'-m','pytest','-p','pytest_impact.plugin','-vv','--impact','--impact-explain-json=impact.json']
 write(d,'calc.py','def value():\n    return 99\n')
 for n in range(2):
  report=d/f'source-{n}.json';args=[*base[:-1],'--impact-explain-json='+str(report)]
  run(f'pytest-impact-source-{n}',args,d,extra={'PYTHONPATH':str(source)},timeout=30)
  if report.exists():(OUT/f'pytest-impact-source-{n}-selection.json').write_text(report.read_text())
 run('pytest-impact-source-full',[PY,'-m','pytest','-vv'],d,timeout=30)
 write(d,'calc.py','def value():\n    return 1\n');write(d,'value.txt','bad\n')
 for n in range(2):
  report=d/f'data-{n}.json';args=[*base[:-1],'--impact-explain-json='+str(report)]
  run(f'pytest-impact-data-{n}',args,d,extra={'PYTHONPATH':str(source)},timeout=30)
  if report.exists():(OUT/f'pytest-impact-data-{n}-selection.json').write_text(report.read_text())
 run('pytest-impact-data-full',[PY,'-m','pytest','-vv'],d,timeout=30)

def trivy():
 d=ROOT/'fixtures/trivy';d.mkdir(parents=True,exist_ok=True)
 write(d,'bad.tf','resource "aws_s3_bucket_public_access_block" "bad" {\n bucket = "rea-only"\n block_public_acls = false\n block_public_policy = false\n ignore_public_acls = false\n restrict_public_buckets = false\n}\n')
 linux=lambda p:'/mnt/c/'+str(p).replace('\\','/')[3:]
 exe=ROOT/'bin/trivy/trivy';base=['wsl','-d','Ubuntu','--exec',linux(exe)]
 run('trivy-version',base+['--version'],ROOT,timeout=30)
 for n in range(2):run(f'trivy-config-offline-{n}',base+['config','--skip-check-update','--format','json',linux(d)],ROOT,timeout=60)
 run('trivy-db-missing',base+['fs','--scanners','vuln','--skip-db-update','--offline-scan','--format','json','--cache-dir',linux(d/'empty-cache'),linux(ROOT/'fixtures/osv')],ROOT,timeout=45)
 write(d,'bad.tf','resource "aws_s3_bucket" "rea" {\n bucket = "rea-local-fixture"\n}\nresource "aws_s3_bucket_public_access_block" "bad" {\n bucket = aws_s3_bucket.rea.id\n block_public_acls = false\n block_public_policy = false\n ignore_public_acls = false\n restrict_public_buckets = false\n}\n')
 for n in range(2):run(f'trivy-linked-config-{n}',base+['config','--skip-check-update','--format','json',linux(d)],ROOT,timeout=60)
 write(d,'bad.tf',(d/'bad.tf').read_text().replace('false','true'))
 run('trivy-block-controls-fixed',base+['config','--skip-check-update','--format','json',linux(d)],ROOT,timeout=60)

def review_helpers():
 graft=pathlib.Path(os.environ['APPDATA'])/'npm/node_modules/@nanonets/graft/dist/cli.js';ocr=pathlib.Path(os.environ['APPDATA'])/'npm/node_modules/@alibaba-group/open-code-review/bin/ocr.js'
 run('graft-static-build',[NODE,graft,'--dir',ROOT/'graft-research','build',ROOT/'Ascout','--only-dir','src/assurance','--no-gitignore','--no-ignore'],ROOT,timeout=120)
 run('graft-static-map',[NODE,graft,'--dir',ROOT/'graft-research','map',ROOT/'Ascout'],ROOT,timeout=60)
 run('alibaba-delegate-preview',[NODE,ocr,'delegate','preview','--repo',ROOT/'Ascout','--from','origin/main','--to','HEAD','--format','json'],ROOT,timeout=45)

def fullci():
 d=ROOT/'Ascout'
 (ROOT/'native-tmp').mkdir(parents=True,exist_ok=True)
 run('ascout-build',[NODE,d/'node_modules/typescript/bin/tsc','-p','tsconfig.json'],d,timeout=90)
 run('ascout-native-windows-single-worker',[NODE,d/'node_modules/vitest/vitest.mjs','run','--maxWorkers=1'],d,timeout=900,extra={'TMPDIR':str(ROOT/'native-tmp')})

if __name__=='__main__':
 for name in sys.argv[1:]:{'focused':focused,'semgrep':semgrep,'nx':nx_sequential,'impact':pytest_impact,'trivy':trivy,'helpers':review_helpers,'fullci':fullci}[name]()
