import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const root=path.join(os.tmpdir(),'ascout-rea-20261020');
const fixture=path.join(root,'fixture');
fs.rmSync(fixture,{recursive:true,force:true});
fs.mkdirSync(fixture,{recursive:true});
const git=(...args)=>{const r=spawnSync('git',args,{cwd:fixture,encoding:'utf8'});if(r.status!==0)throw new Error('git '+args.join(' ')+' '+r.stderr);return r.stdout.trim();};
git('init','-q');git('config','core.autocrlf','false');git('config','user.name','REA Synthetic');git('config','user.email','rea@example.invalid');
fs.writeFileSync(path.join(fixture,'a.js'),'const first = 1;\nconst changed = 2;\nconst untouched = 3;\nexport { first, changed, untouched };\n');
fs.writeFileSync(path.join(fixture,'b.js'),'const other = 0;\n');
git('add','.');git('commit','-qm','synthetic baseline');
const head=git('rev-parse','HEAD');
fs.writeFileSync(path.join(fixture,'a.js'),'const first = 1;\nconst changed = 20;\nconst untouched = 3;\nexport { first, changed, untouched };\n');
const record=(ruleId,file,line,extra={})=>({ruleId,level:'error',message:{text:ruleId},locations:[{physicalLocation:{artifactLocation:{uri:file},region:{startLine:line,startColumn:1}}}],...extra});
const report={$schema:'https://json.schemastore.org/sarif-2.1.0.json',version:'2.1.0',runs:[{tool:{driver:{name:'synthetic-review',rules:[]}},results:[
record('R-CHANGED','a.js',2),record('R-UNCHANGED','a.js',3),record('R-OTHER','b.js',1),
record('R-SUPPRESSED','a.js',2,{suppressions:[{kind:'external',status:'accepted'}]})
]}]};
fs.writeFileSync(path.join(root,'synthetic.sarif'),JSON.stringify(report,null,2));
const binary=path.join(root,'reviewdog.exe');
const experiments=[];
for (const mode of ['added','file','nofilter']){
 const args=['-f=sarif','-reporter=rdjson','-filter-mode='+mode,'-diff=git diff HEAD'];
 const r=spawnSync(binary,args,{cwd:fixture,encoding:'utf8',input:JSON.stringify(report),timeout:15000});
 let rules=[];
 try{const parsed=JSON.parse(r.stdout);rules=(parsed.diagnostics||[]).map(x=>x.code?.value||x.message);}catch{}
 experiments.push({mode,exit:r.status,rules,stdout:r.stdout.slice(0,3000),stderr:r.stderr.slice(0,1000)});
}
const evidence={donor:'reviewdog/reviewdog',version:'0.21.2',source_head:'73c79487a087e1696b3e70a0ae5d2a7233343567',head,git_diff:git('diff','--no-ext-diff','HEAD'),experiments};
fs.writeFileSync(path.join(root,'evidence.json'),JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));

[executed on device: Abdulaziz (c493272c-7604-437e-a1a2-d6c4ee1f21c9)]