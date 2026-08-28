from pathlib import Path

path = Path("benchmarks/README.md")
text = path.read_text()

replacements = [
    (
        "8. **Trust boundary preservation.** No third-party install or repository command is executed during T071–T074. Executable replay begins only through the isolated benchmark harness authorized by T075.",
        "8. **Trust boundary preservation.** No third-party dependency installation or donor-provided code, hook, script, test, build step, generator, or binary is executed during T071–T074. Read-only Git-object inspection remains allowed for identity, provenance, and license verification. Executable replay begins only through the isolated benchmark harness authorized by T075.",
    ),
    (
        "- package manager, lockfile path, and lockfile blob/digest;\n- relevant Node/tool constraints discoverable from the pinned source;",
        "- package manager, exact package-manager version, version-selection provenance, lockfile path, and lockfile blob/digest;\n- exact Node runtime version selected for replay plus the upstream Node/tool constraints used to justify that selection;\n- immutable harness/toolchain artifact digest when T075 executes inside a packaged image or equivalent immutable environment;",
    ),
    (
        "- exact package-manager version is recorded when the upstream project pins one;\n- toolchain/environment versions used by the benchmark run are recorded;",
        "- the manifest/case revision already pins an exact package-manager version before T075; an upstream exact pin is used when present, otherwise case review selects and records one exact compatible version with its provenance rather than resolving a floating version during replay;\n- the manifest/case revision already pins an exact Node runtime version before T075, justified against the pinned source constraints;\n- when replay uses a packaged image or equivalent immutable harness/toolchain artifact, its content digest is pinned before execution;\n- T075 records the actual package-manager, Node, OS/toolchain, and immutable artifact identities and refuses the case if any required pinned identity does not match;",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one replacement anchor, found {count}: {old[:100]!r}")
    text = text.replace(old, new)

required = [
    "Read-only Git-object inspection remains allowed",
    "No third-party dependency installation or donor-provided code",
    "exact package-manager version",
    "version-selection provenance",
    "exact Node runtime version selected for replay",
    "immutable harness/toolchain artifact digest",
    "rather than resolving a floating version during replay",
    "refuses the case if any required pinned identity does not match",
]
missing = [needle for needle in required if needle not in text]
if missing:
    raise SystemExit(f"missing CodeRabbit repair text: {missing}")

forbidden = [
    "No third-party install or repository command is executed during T071–T074.",
    "exact package-manager version is recorded when the upstream project pins one",
]
present = [needle for needle in forbidden if needle in text]
if present:
    raise SystemExit(f"stale CodeRabbit finding text remains: {present}")

path.write_text(text)
