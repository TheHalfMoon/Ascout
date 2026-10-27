"""Record focused closure only after actual reviewed closing bytes were read back."""
import hashlib,json,pathlib,subprocess,sys

root=pathlib.Path(__file__).resolve().parent
repo=root.parent/'engineering/main-control'
observed_head=sys.argv[1]
prefix='qualification/native-clean-state/2026-10-27-closeout'
core=json.loads((root/('clean-state-closing-publication-receipt-'+observed_head[:7]+'.json')).read_text())
sidecars=json.loads((root/('clean-state-closing-sidecars-readback-'+observed_head[:7]+'.json')).read_text())
assert core['head']==sidecars['head']==observed_head
assert core['remote_ref_verified'] and core['remote_bytes_equal_local'] and core['all_member_hashes_crc_json_python_verified']
assert sidecars['remote_ref_and_all_sidecar_bytes_verified'] and core['members']==180
assert core['path']==sidecars['prefix']==prefix
assert core['branch']==sidecars['branch']=='evidence/native-clean-state-postmerge-20261027'
assert subprocess.check_output(['rtk','proxy','git','rev-parse','HEAD'],cwd=repo).decode().strip()==observed_head
assert not subprocess.check_output(['rtk','proxy','git','status','--porcelain'],cwd=repo).strip()
manifest=json.loads((repo/prefix/'closing-review-manifest.json').read_text())
remote_records={item['path']:item for item in sidecars['records']}
assert set(remote_records)=={'closing-review-manifest.json'}|{item['path'] for item in manifest['records']}
for item in manifest['records']:
    assert remote_records[item['path']]['sha256']==item['published_sha256']
    assert remote_records[item['path']]['bytes']==item['bytes']
record={'state':'ACTUAL_PRECEDING_CLOSING_REVISION_READ_BACK','observed_head':observed_head,'core':core,'sidecars':sidecars,
 'notice':'Point-in-time actual remote proof precedes this bookkeeping commit. This record does not claim a future branch revision was already observed. Verify the final bookkeeping revision through both readback tools before next-task source mutation. Focused canonical closure does not clear original local failures, Self inner1/FLAKY/materially incomplete, unknown causes or E00/release blockers.'}
(repo/prefix/'REMOTE_READBACK.json').write_bytes((json.dumps(record,indent=2)+'\n').encode())
report=repo/prefix/'REPORT.md'
text=report.read_text().replace('Status: MERGED_CANONICAL. Closing correctness/privacy reviews and actual closing remote readback remain pending. E00/release remain BLOCKED; Self inner evidence is adverse and materially incomplete.',
 'Status: CLOSED_CANONICAL for this focused task after finalized clear closing correctness/privacy reviews and actual closing core/member/sidecar readback. E00/release remain BLOCKED; Self inner evidence is adverse and materially incomplete.')
text+=f'\n\nActual closing readback at {observed_head} verified three core files, all180 packet members and {len(remote_records)} review sidecars. The finalized review manifest binds original/published report hashes; frozen ZIP15c7d6da54e77bcdbd3f2d07e475c24b80d5bd5ba7b4247abbf37fb16427dfb9 is unchanged. REMOTE_READBACK.json records that preceding revision only. Final bookkeeping bytes still require actual readback before the next task. No original failure was relabeled, and E00/release remain BLOCKED.\n'
report.write_bytes(text.encode())
state=repo/'STATE.md'
state.write_bytes(f'''Last updated: 2026-10-27 Asia/Riyadh · Branch: evidence/native-clean-state-postmerge-20261027

Task027/PR649 CLOSED_CANONICAL at main7a089771aaad8f599b2ee342cf2c17eac19f547b after ordinary verified merge, twelve actual native suites, finalized clear closing reviews and actual180-member/three-core-file/{len(remote_records)}-sidecar readback at{observed_head}. Frozen closingZIP15c7d6da54e77bcdbd3f2d07e475c24b80d5bd5ba7b4247abbf37fb16427dfb9. Final bookkeeping revision must still be read back before next-task mutation.

Fixed structural29Git RED/23Git GREEN with2npm, final fixture7passed;433other entries15controls frozen. Self inner1/FLAKY/materially incomplete with UNKNOWN browser cause, localfullFAIL6plus hook and unknown original fixture cause, earlier diagnosticFAIL/reporterUNQUALIFIED, Task024 provenance and unavailable selector comparison all retained. E00/release BLOCKED. No paid service, D1 gate, deadline/admission/UA-P07 waiver, source change after canonical merge or disposable-artifact cleanup. Next repair needs its own prospective scope/audit/consistency and existing bounded user authority after final readback. Details:{prefix}/REPORT.md.
'''.encode())
for name in ['specs/027-native-clean-state-observation/spec.md','specs/027-native-clean-state-observation/tasks.md']:
    path=repo/name
    text='\n'.join(('Status: CLOSED_CANONICAL focused PR649/main7a08977; twelve actual native suites, finalized closing reviews and actual180-member remote proof. Self inner1/FLAKY/materially incomplete and localFAIL6plus hook retained; E00/release BLOCKED.' if line.startswith('Status:') else line) for line in path.read_text().splitlines())+'\n'
    path.write_bytes(text.encode())
path=repo/'ROADMAP.md'
lines=path.read_text().splitlines()
for i,line in enumerate(lines):
    if '/ Task027-T01 ' in line:
        lines[i]=f'| REA-E00 / Task027-T01 native clean-state observation | focused CLOSED_CANONICAL PR649/main7a08977; twelve actual native suites, finalized clear closing reviews and actual180-member remote readback at{observed_head[:7]}; Self inner1/FLAKY/materially incomplete and localFAIL6plus hook retained; E00/release BLOCKED | [closeout](https://github.com/TheHalfMoon/Ascout/blob/{observed_head}/{prefix}/REPORT.md) |'
path.write_bytes(('\n'.join(lines)+'\n').encode())
path=repo/'docs/qualification/REA-E00-native-timing.md'
path.write_bytes((path.read_text()+f'\n\nTask027 focused closure: finalized clear closing reviews and actual180-member three-core-file/{len(remote_records)}-sidecar readback at{observed_head}. Final bookkeeping revision must be read back before next repair. Self inner1/FLAKY/materially incomplete, localFAIL6plus hook and unknown causes remain; E00/release BLOCKED.\n').encode())
print(json.dumps({'focused':'CLOSED_CANONICAL','preceding_remote_head':observed_head,'members':180,'sidecars':len(remote_records),'release':'BLOCKED'}))
