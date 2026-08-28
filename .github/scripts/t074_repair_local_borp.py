import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
p=Path('benchmarks/manifest.json'); m=json.loads(p.read_text()); assert m['manifest_revision']==5
case=next(c for c in m['cases'] if c['case_id']=='undici-h2-late-response')
assert case['case_revision']==1
proc=case['oracle']['specification']['ground_truth_procedure']
old='Pinned T075 targeted oracle command: `npm exec -- borp --timeout 180000 -p "test/http2-response-after-completion.js"`. Pinned project-native reference command: `npm run test:h2:core`. T075 must prove every listed regression_test_id executed; file-level success alone is not oracle evidence.'
new='Pinned T075 targeted oracle command: `./node_modules/.bin/borp --timeout 180000 -p "test/http2-response-after-completion.js"`. The command MUST use that exact lockfile-installed local binary and MUST refuse execution if it is absent; no npm exec/npx/package download fallback is allowed. Pinned project-native reference command: `npm run test:h2:core`. T075 must prove every listed regression_test_id executed; file-level success alone is not oracle evidence.'
assert proc[0]==old; proc[0]=new
case['limitations'].append('The targeted Undici oracle command is intentionally bound to the exact local node_modules/.bin/borp installed from the pinned package-lock; network-backed executable resolution is forbidden.')
case['case_revision']=2; m['manifest_revision']=6
Draft202012Validator.check_schema(m['case_schema']); v=Draft202012Validator(m['case_schema'],format_checker=FormatChecker())
for c in m['cases']: v.validate(c)
assert 'npm exec' not in '\n'.join(proc) and './node_modules/.bin/borp' in proc[0]
p.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n')
print('T074 local-borp fail-closed repair PASS')
