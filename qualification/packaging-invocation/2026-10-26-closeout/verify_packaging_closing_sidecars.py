"""Actual immutable-head closing sidecars and optional forward readback receipt."""
import pathlib

path = pathlib.Path(__file__).with_name('verify_index_closing_sidecars.py')
source = path.read_text(encoding='utf-8').replace('qualification/git-index-observation/2026-10-25-closeout', 'qualification/packaging-invocation/2026-10-26-closeout').replace('index-closing-sidecars-readback-', 'packaging-closing-sidecars-readback-')
exec(compile(source, str(path), 'exec'))
