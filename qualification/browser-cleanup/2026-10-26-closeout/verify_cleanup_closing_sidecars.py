"""Read actual Task024 closing sidecars and optional forward readback receipt."""
import pathlib

path = pathlib.Path(__file__).with_name('verify_index_closing_sidecars.py')
source = path.read_text(encoding='utf-8').replace('qualification/git-index-observation/', 'qualification/browser-cleanup/').replace('2026-10-25', '2026-10-26').replace('index-closing-sidecars-readback-', 'cleanup-closing-sidecars-readback-').replace('Task023', 'Task024')
exec(compile(source, str(path), 'exec'))
