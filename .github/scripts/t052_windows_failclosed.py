from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if text.count(old) != 1:
        raise SystemExit(f"{label}: expected one anchor, found {text.count(old)}")
    path.write_text(text.replace(old, new))


def append_before_suite_end(path: Path, block: str) -> None:
    text = path.read_text()
    marker = "\n});\n"
    index = text.rfind(marker)
    if index < 0:
        raise SystemExit(f"{path}: suite end not found")
    path.write_text(text[:index] + "\n" + block.rstrip() + text[index:])


for path in [Path("src/tools/jest.ts"), Path("src/tools/vitest.ts")]:
    replace_once(
        path,
        '  return platform === "win32" ? [".cmd", ".exe", ""] : ["", ".exe"];\n',
        '  return platform === "win32" ? [".cmd", ".exe"] : ["", ".exe"];\n',
        f"{path} Windows launcher priority",
    )

append_before_suite_end(
    Path("tests/jest-task.contract.test.ts"),
    r'''  it("fails closed on Windows when only the POSIX unsuffixed Jest shim is available", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.js")],
        platform: "win32",
      });

      expect(plan).toMatchObject({ state: "not_run", reasonCode: "tool_unresolved" });
      expect(plan.argv).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
''',
)

append_before_suite_end(
    Path("tests/vitest-task.contract.test.ts"),
    r'''  it("fails closed on Windows when only the POSIX unsuffixed Vitest shim is available", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.ts")],
        platform: "win32",
      });

      expect(plan).toMatchObject({ state: "not_run", reasonCode: "tool_or_coverage_provider_unresolved" });
      expect(plan.argv).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
''',
)
