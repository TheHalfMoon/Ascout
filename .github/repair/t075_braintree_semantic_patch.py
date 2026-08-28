from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("usage: t075_braintree_semantic_patch.py <candidate-root>")
root = Path(sys.argv[1]).resolve()
path = root / "benchmarks" / "run.mjs"
text = path.read_text()
old = '''        independent_source_stability: observation.ascout.independent_source_stability,\n        source_state_start_sha256: observation.ascout.source_state_start_sha256,\n        source_state_end_sha256: observation.ascout.source_state_end_sha256,\n        source: observation.ascout.source,'''
new = '''        independent_source_stability: observation.ascout.independent_source_stability,\n        source: observation.ascout.source,'''
if text.count(old) != 1:
    raise SystemExit(f"expected one semantic source-state projection block, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
