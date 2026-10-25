// Independent deterministic fixture control, not an Ascout production dependency.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const output=dirname(fileURLToPath(import.meta.url));
const engineering=dirname(output),work=dirname(engineering),repo=join(engineering,'browser');
const require=createRequire(join(repo,'package.json'));
const {chromium}=require('playwright'),ts=require('typescript');
if(require('playwright/package.json').version!=='1.63.0')throw Error('Wrong Ascout Playwright pin');
const source=await readFile(join(repo,'tests/browser-text-assertion.integration.test.ts'),'utf8');
const ast=ts.createSourceFile('fixture.ts',source,ts.ScriptTarget.Latest,true);
let html;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='PAGE'&&ts.isStringLiteral(node.initializer))html=node.initializer.text;ts.forEachChild(node,visit);}
visit(ast);if(typeof html!=='string')throw Error('Missing literal fixture');
const sha=value=>createHash('sha256').update(value).digest('hex');
const fixtureRoot=join(work,'npm-tools','fixtures','engineering-e04-'+randomUUID());
await mkdir(fixtureRoot,{recursive:false});
let broken=false;
const server=createServer((_request,response)=>{response.writeHead(200,{'content-type':'text/html'});response.end(broken?html.replace(' Ready\nexact ','Broken UI state'):html);});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
let context;
const summary={kind:'INDEPENDENT_FIXTURE_CONTROL_ONLY',notice:'TesterArmy normalizes text and checks visibility. Ascout literal equality is separately tested; this does not add or attest an Ascout visibility API.',source_fixture_sha256:sha(source),html_sha256:sha(html),playwright:'1.63.0',executable_path:chromium.executablePath(),testerarmy:JSON.parse(await readFile(join(work,'npm-tools/node_modules/e2e/package.json'),'utf8')).version,web_engine:JSON.parse(await readFile(join(work,'npm-tools/node_modules/@e2e-dev/web/package.json'),'utf8')).version,runs:[]};
try{
 const profile=join(fixtureRoot,'owned-profile');
 context=await chromium.launchPersistentContext(profile,{headless:true,timeout:30000,args:['--remote-debugging-address=127.0.0.1','--remote-debugging-port=0']});
 const port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);
 if(!Number.isInteger(port)||port<1)throw Error('Invalid owned CDP port');
 summary.browser_version=context.browser()?.version()??null;
 for(const mode of ['working','broken']){
  broken=mode==='broken';
  const fixture=join(fixtureRoot,mode);await mkdir(join(fixture,'tests'),{recursive:true});
  const files={
   'package.json':JSON.stringify({name:'ascout-e04-fixture-control',type:'module',private:true}),
   'e2e.config.ts':'import {web} from "@e2e-dev/web"; export default '+JSON.stringify({retries:0,workers:1,timeout:15000,assertionTimeout:1000,trace:'off',video:'off'}).slice(0,-1)+',targets:[{engine:web({connect:{cdpEndpoint:()=>'+JSON.stringify('http://127.0.0.1:'+port)+'}}),app:{url:'+JSON.stringify(origin)+'}}]};\n',
   'tests/literal.e2e.ts':'import {test} from "@e2e-dev/web"; import {expect} from "e2e"; test("literal fixture '+mode+'",async({app,screen})=>{await app.open("/");const target=screen.getByRole("status",{name:"Order status"});await expect(target).toBeVisible();await expect(target).toHaveText("Ready exact");});\n',
   'fixture.html':broken?html.replace(' Ready\nexact ','Broken UI state'):html,
  };
  for(const [name,bytes]of Object.entries(files))await writeFile(join(fixture,name),bytes);
  const destination=join(output,'testerarmy',mode);await mkdir(destination,{recursive:true});
  for(const name of Object.keys(files)){await mkdir(dirname(join(destination,name)),{recursive:true});await cp(join(fixture,name),join(destination,name),{recursive:true});}
  const argv=[join(work,'npm-tools/node_modules/e2e/dist/cli/bin.js'),'run','--reporter=json','--no-cache'];
  const started=performance.now();let stdout='',stderr='',timedOut=false;
  const child=spawn(process.execPath,argv,{cwd:fixture,windowsHide:true,env:{...process.env,CI:'true',DO_NOT_TRACK:'1',E2E_TELEMETRY_DISABLED:'1'}});
  child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>4*1024*1024)child.kill();});child.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>1024*1024)child.kill();});
  const timer=setTimeout(()=>{timedOut=true;child.kill();},45000);
  const exit=await new Promise((done,reject)=>{child.once('error',reject);child.once('close',done);});clearTimeout(timer);
  await writeFile(join(destination,'stdout.json'),stdout);await writeFile(join(destination,'stderr.txt'),stderr);
  let report=null;try{report=JSON.parse(stdout).run;}catch{}
  const record={mode,argv:[process.execPath,...argv],exit,timed_out:timedOut,wall_ms:performance.now()-started,fixture_hashes:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,sha(bytes)])),summary:report?.summary??null,usage:report?.usage??null,errors:report?.errors??null,result_statuses:report?.results?.map(x=>({id:x.id,status:x.status,attempts:x.attempts?.map(a=>({status:a.status,error:a.error}))}))??null};
  summary.runs.push(record);await writeFile(join(destination,'capture.json'),JSON.stringify(record,null,2)+'\n');
  try{await cp(join(fixture,'.e2e'),join(destination,'runner-artifacts'),{recursive:true});}catch(error){record.artifact_copy_error=error.message;}
 }
 summary.controls_match=summary.runs.every(r=>!r.timed_out&&r.summary?.selected===1&&r.summary?.executed===1&&r.usage?.modelTokens===0&&(r.mode==='working'?r.exit===0&&r.summary.passed===1&&r.summary.failed===0:r.exit===1&&r.summary.failed===1&&r.summary.passed===0));
}finally{
 if(context)await context.close();server.closeAllConnections();await new Promise(done=>server.close(done));
 await writeFile(join(output,'testerarmy-summary.json'),JSON.stringify(summary,null,2)+'\n');
}
console.log(JSON.stringify(summary));if(!summary.controls_match)process.exitCode=1;
