"""Bounded replay regression probes; no browser or network required."""
import ast, hashlib, json, pathlib, tempfile
from unittest.mock import patch
import morebench, extras

with tempfile.TemporaryDirectory() as temp:
 root=pathlib.Path(temp);fixture=root/'fixture';fixture.mkdir();out=root/'out';out.mkdir()
 report=fixture/'.e2e/report.json';report.parent.mkdir();report.write_text('{"stale":true}')
 record={'run_id':'fresh-failed','started_at_utc':'2026-10-20T00:00:00Z','status':'ERROR','exit':None}
 with patch.object(morebench,'OUT',out),patch.object(morebench,'run',return_value=record):
  morebench.browser_run_report('probe',[],fixture)
 assert not report.exists() and not (out/'probe-report.json').exists()
 assert json.loads((out/'probe-report-binding.json').read_text())['report_present'] is False
 def created(*args,**kwargs):
  report.write_text('{"current":true}');return {**record,'run_id':'fresh-created','status':'EXECUTED','exit':1}
 with patch.object(morebench,'OUT',out),patch.object(morebench,'run',side_effect=created):
  morebench.browser_run_report('probe',[],fixture)
 binding=json.loads((out/'probe-report-binding.json').read_text())
 assert binding['run_id']=='fresh-created' and binding['report_present']
 assert binding['published_report_sha256']==hashlib.sha256((out/'probe-report.json').read_bytes()).hexdigest()
 # The OpenGrep replay function must not download, even for a missing binary.
 metadata={'assets':[{'name':'opengrep_windows_x86.exe','digest':'sha256:unused'}]}
 (out/'opengrep-source.json').write_text(json.dumps(metadata))
 with patch.object(extras,'ROOT',root),patch.object(extras,'OUT',out),patch.object(extras,'download',side_effect=AssertionError('unexpected network')):
  try:extras.opengrep()
  except RuntimeError as error:assert 'missing' in str(error)
  else:raise AssertionError('missing executable must fail closed')
for name in ['acquire','prepare','bench','morebench','qualify','extras','provenance_probe','audit_extra','replay']:
 ast.parse(pathlib.Path(__file__).with_name(name+'.py').read_text(encoding='utf-8'))
print('PASS: stale report excluded; new report bound by run ID/digest; missing OpenGrep fails without download; nine scripts parse')
