// Diagnostic instrumentation only. Never loaded by product code or qualification gates.
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {performance} = require('node:perf_hooks');
const log = process.env.ASCOUT_DIAGNOSTIC_LOG;
let depth = 0;
for (const method of ['execFileSync', 'spawnSync']) {
 const original = cp[method];
 cp[method] = function(file, argv, ...options) {
  const root = depth++ === 0;
  const start = performance.now();
  let exit = 0; let code = null;
  try {
   const result = original.call(this, file, argv, ...options);
   if (method === 'spawnSync') {exit = result.status; code = result.error?.code ?? null;}
   return result;
  } catch (error) {exit = error.status ?? null; code = error.code ?? null; throw error;}
  finally {
   depth--;
   if (root && log && /^git(?:\.exe)?$/i.test(path.basename(String(file)))) {
    const operations = new Set(['rev-parse','hash-object','ls-files','diff-files','diff','init','config','add','commit','update-index','status','check-attr','show','for-each-ref']);
    const operation = Array.isArray(argv) ? argv.find(x => operations.has(x)) ?? 'other' : 'unknown';
    fs.appendFileSync(log, JSON.stringify({pid:process.pid, method, operation, duration_ms:performance.now()-start, exit, code})+'\n');
   }
  }
 };
}
require('node:module').syncBuiltinESMExports();
