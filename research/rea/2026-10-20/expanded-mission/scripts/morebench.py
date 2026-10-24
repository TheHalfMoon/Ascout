import hashlib,json,pathlib,shutil,subprocess,sys,uuid,os
from bench import ROOT,OUT,PY,run,write
NODE=pathlib.Path(os.environ.get('ASCOUT_REA_NODE',shutil.which('node') or 'node'))
NPM=ROOT/'npm-tools/node_modules'

def nx():
 d=ROOT/'npm-tools/fixtures/nx';d.mkdir(parents=True,exist_ok=True)
 write(d,'package.json','{"name":"rea-nx-fixture","private":true}')
 write(d,'nx.json',json.dumps({'neverConnectToCloud':True,'plugins':[],'targetDefaults':{}}))
 for name in ['lib','app','other']:
  cfg={'name':name,'root':'packages/'+name,'targets':{'test':{'executor':'nx:run-commands','options':{'command':'node --test packages/'+name+'/test.mjs','cwd':'.'}}}}
  if name=='app':cfg['implicitDependencies']=['lib']
  write(d,'packages/'+name+'/project.json',json.dumps(cfg))
 write(d,'packages/lib/index.mjs','export function value() { return 1; }\n')
 write(d,'packages/app/index.mjs','export {value} from "../lib/index.mjs";\n')
 write(d,'packages/other/index.mjs','export const other = 7;\n')
 for name in ['lib','app']:
  write(d,'packages/'+name+'/test.mjs','import assert from "node:assert/strict"; import {value} from "./index.mjs"; assert.equal(value(),1);\n')
 write(d,'packages/other/test.mjs','import assert from "node:assert/strict"; import {other} from "./index.mjs"; assert.equal(other,7);\n')
 base=[NODE,NPM/'nx/dist/bin/nx.js']
 run('nx-full-baseline',[NODE,'--test','packages/lib/test.mjs','packages/app/test.mjs','packages/other/test.mjs'],d)
 write(d,'packages/lib/index.mjs','export function value() { return 99; }\n')
 for repeat in range(2):
  run(f'nx-affected-{repeat}',[*base,'show','projects','--affected','--files=packages/lib/index.mjs','--json'],d,timeout=90)
  run(f'nx-tasks-{repeat}',[*base,'affected','--target=test','--files=packages/lib/index.mjs','--skip-nx-cache','--outputStyle=static'],d,timeout=90)
 run('nx-full-mutated',[NODE,'--test','packages/lib/test.mjs','packages/app/test.mjs','packages/other/test.mjs'],d)
 cfg=json.loads((d/'packages/app/project.json').read_text());cfg.pop('implicitDependencies');write(d,'packages/app/project.json',json.dumps(cfg))
 run('nx-missing-explicit-edge',[*base,'show','projects','--affected','--files=packages/lib/index.mjs','--json'],d,timeout=90)
 run('nx-global-config',[*base,'show','projects','--affected','--files=nx.json','--json'],d,timeout=90)

def stryker():
 d=ROOT/'npm-tools/fixtures'/('stryker-'+uuid.uuid4().hex[:8]);d.mkdir(parents=True,exist_ok=True)
 write(d,'package.json','{"name":"rea-stryker-fixture","type":"commonjs","private":true}')
 write(d,'src.js','exports.isAdult = (age) => age >= 18;\n')
 cfg={'mutate':['src.js'],'testRunner':'command','commandRunner':{'command':'node --test test.cjs'},'coverageAnalysis':'off','reporters':['json','clear-text'],'concurrency':1,'timeoutMS':1000,'timeoutFactor':1.5,'tempDirName':'.stryker-tmp','cleanTempDir':'always','jsonReporter':{'fileName':'mutation.json'}}
 write(d,'stryker.conf.json',json.dumps(cfg))
 for strength,test in [('strong','assert.equal(isAdult(17),false);assert.equal(isAdult(18),true);assert.equal(isAdult(19),true);'),('weak','assert.equal(typeof isAdult(99),"boolean");')]:
  write(d,'test.cjs','const assert=require("node:assert/strict"); const {isAdult}=require("./src.js");'+test+'\n')
  run('stryker-'+strength+'-native',[NODE,'--test','test.cjs'],d)
  for repeat in range(2):
   cfg['jsonReporter']['fileName']=f'mutation-{strength}-{repeat}.json';write(d,'stryker.conf.json',json.dumps(cfg))
   run(f'stryker-{strength}-{repeat}',[NODE,NPM/'@stryker-mutator/core/bin/stryker.js','run','stryker.conf.json'],d,timeout=150)
   report=d/cfg['jsonReporter']['fileName']
   if report.exists():(OUT/f'stryker-{strength}-{repeat}-mutants.json').write_text(report.read_text())

def browser_run_report(name,cli,d,timeout=50):
 report=d/'.e2e/report.json';published=OUT/(name+'-report.json');binding=OUT/(name+'-report-binding.json')
 # A previous report must never become evidence for this invocation.
 for path in [report,published,binding]:path.unlink(missing_ok=True)
 result=run(name,cli,d,timeout=timeout)
 info={'run_id':result['run_id'],'started_at_utc':result['started_at_utc'],'process_status':result['status'],'process_exit':result.get('exit'),'report_present':report.is_file(),'binding_method':'fresh unique fixture; report removed immediately before this invocation; only newly produced bytes retained'}
 if report.is_file():
  raw=report.read_bytes();published.write_text(raw.decode().replace(str(ROOT),'<WORK>'),encoding='utf-8')
  info.update({'original_report_sha256':hashlib.sha256(raw).hexdigest(),'published_report_sha256':hashlib.sha256(published.read_bytes()).hexdigest(),'report':published.name})
 binding.write_text(json.dumps(info,indent=2)+'\n',encoding='utf-8')
 return result

def e2e():
 d=ROOT/'npm-tools/fixtures'/('e2e-'+uuid.uuid4().hex[:8]);d.mkdir(parents=True,exist_ok=True)
 write(d,'package.json','{"name":"rea-e2e-fixture","type":"module","private":true}')
 # Use the already installed browser by its exact executable rather than implicit browser downloads.
 browser=pathlib.Path(os.environ.get('ASCOUT_REA_BROWSER',str(pathlib.Path(os.environ['LOCALAPPDATA'])/'ms-playwright/chromium-1243/chrome-win64/chrome.exe')))
 write(d,'e2e.config.ts','import { web } from "@e2e-dev/web"; export default {targets:[{engine:web({connect:{cdpEndpoint:()=>"http://127.0.0.1:18964"}}),app:{url:"http://127.0.0.1:18963"}}], retries:0,workers:1,timeout:15000,assertionTimeout:1000,trace:"off",video:"off"};\n')
 write(d,'tests/site.e2e.ts','import {test} from "@e2e-dev/web"; import {expect} from "e2e"; test("click updates count",async({app,screen})=>{await app.open("/");await screen.getByRole("button",{name:"Increment"}).click();await expect(screen.getByRole("status")).toHaveText("1");});\n')
 write(d,'index.html','<!doctype html><button onclick="document.querySelector(\'output\').textContent=\'1\'">Increment</button><output role="status">0</output>')
 server=subprocess.Popen([str(PY),'-m','http.server','18963','--bind','127.0.0.1'],cwd=d,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 chrome=subprocess.Popen([str(browser),'--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=18964','--user-data-dir='+str(d/'chrome-profile'),'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
 try:
  import time;time.sleep(1)
  cli=[NODE,NPM/'e2e/dist/cli/bin.js','run','--reporter=json','--no-cache']
  for repeat in range(2):
   browser_run_report(f'testerarmy-runtime-positive-{repeat}',cli,d)
  write(d,'index.html','<!doctype html><button>Increment</button><output role="status">0</output>')
  browser_run_report('testerarmy-runtime-negative',cli,d)
  browser_run_report('testerarmy-runtime-empty', [*cli,'--grep=NO_SUCH_TEST'],d,timeout=30)
 finally:
  server.terminate();server.wait(timeout=5)
  import psutil
  try:
   for child in psutil.Process(chrome.pid).children(recursive=True):
    try:child.terminate()
    except psutil.Error:pass
  except psutil.Error:pass
  chrome.terminate()
  try:chrome.wait(timeout=5)
  except subprocess.TimeoutExpired:chrome.kill();chrome.wait(timeout=5)

def native():
 d=ROOT/'Ascout'
 run('ascout-typecheck',[NODE,d/'node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit'],d,timeout=120)
 run('ascout-native-full',[NODE,d/'node_modules/vitest/vitest.mjs','run'],d,timeout=300)

if __name__=='__main__':
 for name in sys.argv[1:]:{'nx':nx,'stryker':stryker,'e2e':e2e,'native':native}[name]()
