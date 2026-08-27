from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new)


def append_before_suite_end(path: Path, block: str) -> None:
    text = path.read_text()
    marker = "\n});\n"
    index = text.rfind(marker)
    if index < 0:
        raise SystemExit(f"{path}: suite end not found")
    path.write_text(text[:index] + "\n" + block.rstrip() + text[index:])


# Jest planner hardening.
path = Path("src/tools/jest.ts")
text = path.read_text()
text = replace_once(
    text,
    "  readonly changedFiles: readonly GitChangedFile[];\n}",
    "  readonly changedFiles: readonly GitChangedFile[];\n  readonly platform?: NodeJS.Platform;\n}",
    "jest planning input",
)
text = replace_once(
    text,
    'const JEST_LAUNCH_SUFFIX_PRIORITY = ["", ".cmd", ".exe"] as const;\n',
    "",
    "jest static suffix priority",
)
text = replace_once(
    text,
    '''function preferredExecutable(paths: readonly string[]): string | null {\n  for (const suffix of JEST_LAUNCH_SUFFIX_PRIORITY) {\n    const candidate = paths.find((path) => executableSuffix(path) === suffix);\n    if (candidate !== undefined) return candidate;\n  }\n  return null;\n}\n''',
    '''function launchSuffixPriority(platform: NodeJS.Platform): readonly (typeof JEST_EXECUTABLE_SUFFIXES)[number][] {\n  return platform === "win32" ? [".cmd", ".exe", ""] : ["", ".exe"];\n}\n\nfunction preferredExecutable(paths: readonly string[], platform: NodeJS.Platform): string | null {\n  for (const suffix of launchSuffixPriority(platform)) {\n    const candidate = paths.find((path) => executableSuffix(path) === suffix);\n    if (candidate !== undefined) return candidate;\n  }\n  return null;\n}\n''',
    "jest preferred executable",
)
text = replace_once(
    text,
    '''function relativeFromRoot(root: string, path: string): string {\n  if (root === "") return path;\n  const from = root.split("/");\n  const to = path.split("/");\n  let common = 0;\n  while (common < from.length && common < to.length && from[common] === to[common]) common += 1;\n  return [...from.slice(common).map(() => ".."), ...to.slice(common)].join("/") || ".";\n}\n''',
    '''function relativeFromRoot(root: string, path: string): string {\n  if (root === "") return path;\n  const from = root.split("/");\n  const to = path.split("/");\n  let common = 0;\n  while (common < from.length && common < to.length && from[common] === to[common]) common += 1;\n  return [...from.slice(common).map(() => ".."), ...to.slice(common)].join("/") || ".";\n}\n\nfunction positionalPathArg(path: string): string {\n  return path.startsWith("-") ? `./${path}` : path;\n}\n''',
    "jest positional helper",
)
text = replace_once(
    text,
    '''function resolveInstalledJest(\n  repositoryRoot: string,\n  scopeRoot: string,\n  executablePaths: readonly string[],\n): InstalledJest | null {''',
    '''function resolveInstalledJest(\n  repositoryRoot: string,\n  scopeRoot: string,\n  executablePaths: readonly string[],\n  platform: NodeJS.Platform,\n): InstalledJest | null {''',
    "jest resolver signature",
)
text = replace_once(
    text,
    "  const executablePath = preferredExecutable(group.executablePaths);\n",
    "  const executablePath = preferredExecutable(group.executablePaths, platform);\n",
    "jest executable selection call",
)
text = replace_once(
    text,
    "  const installed = resolveInstalledJest(repositoryRootOrThrow(input.repositoryRoot), scopeRoot, input.discovery.tools.jest.localExecutablePaths);\n",
    "  const installed = resolveInstalledJest(\n    repositoryRootOrThrow(input.repositoryRoot),\n    scopeRoot,\n    input.discovery.tools.jest.localExecutablePaths,\n    input.platform ?? process.platform,\n  );\n",
    "jest resolver invocation",
)
text = replace_once(
    text,
    "  const selectedArgs = changedPaths.map((path) => relativeFromRoot(scopeRoot, path));\n",
    "  const selectedArgs = changedPaths.map((path) => positionalPathArg(relativeFromRoot(scopeRoot, path)));\n",
    "jest selected args",
)
path.write_text(text)

# Vitest prior-runner shared hardening.
path = Path("src/tools/vitest.ts")
text = path.read_text()
text = replace_once(
    text,
    "  readonly changedFiles: readonly GitChangedFile[];\n}",
    "  readonly changedFiles: readonly GitChangedFile[];\n  readonly platform?: NodeJS.Platform;\n}",
    "vitest planning input",
)
text = replace_once(
    text,
    'const VITEST_LAUNCH_SUFFIX_PRIORITY = ["", ".cmd", ".exe"] as const;\n',
    "",
    "vitest static suffix priority",
)
text = replace_once(
    text,
    '''function preferredExecutable(paths: readonly string[]): string | null {\n  for (const suffix of VITEST_LAUNCH_SUFFIX_PRIORITY) {\n    const candidate = paths.find((path) => executableSuffix(path) === suffix);\n    if (candidate !== undefined) return candidate;\n  }\n  return null;\n}\n''',
    '''function launchSuffixPriority(platform: NodeJS.Platform): readonly (typeof VITEST_EXECUTABLE_SUFFIXES)[number][] {\n  return platform === "win32" ? [".cmd", ".exe", ""] : ["", ".exe"];\n}\n\nfunction preferredExecutable(paths: readonly string[], platform: NodeJS.Platform): string | null {\n  for (const suffix of launchSuffixPriority(platform)) {\n    const candidate = paths.find((path) => executableSuffix(path) === suffix);\n    if (candidate !== undefined) return candidate;\n  }\n  return null;\n}\n''',
    "vitest preferred executable",
)
text = replace_once(
    text,
    '''function relativeFromRoot(root: string, path: string): string {\n  if (root === "") return path;\n  const from = root.split("/");\n  const to = path.split("/");\n  let common = 0;\n  while (common < from.length && common < to.length && from[common] === to[common]) common += 1;\n  return [...from.slice(common).map(() => ".."), ...to.slice(common)].join("/") || ".";\n}\n''',
    '''function relativeFromRoot(root: string, path: string): string {\n  if (root === "") return path;\n  const from = root.split("/");\n  const to = path.split("/");\n  let common = 0;\n  while (common < from.length && common < to.length && from[common] === to[common]) common += 1;\n  return [...from.slice(common).map(() => ".."), ...to.slice(common)].join("/") || ".";\n}\n\nfunction positionalPathArg(path: string): string {\n  return path.startsWith("-") ? `./${path}` : path;\n}\n''',
    "vitest positional helper",
)
text = replace_once(
    text,
    '''function resolveInstalledVitest(\n  repositoryRoot: string,\n  scopeRoot: string,\n  executablePaths: readonly string[],\n): InstalledVitest | null {''',
    '''function resolveInstalledVitest(\n  repositoryRoot: string,\n  scopeRoot: string,\n  executablePaths: readonly string[],\n  platform: NodeJS.Platform,\n): InstalledVitest | null {''',
    "vitest resolver signature",
)
text = replace_once(
    text,
    "  const executablePath = preferredExecutable(group.executablePaths);\n",
    "  const executablePath = preferredExecutable(group.executablePaths, platform);\n",
    "vitest executable selection call",
)
text = replace_once(
    text,
    '''  const installed = resolveInstalledVitest(\n    input.repositoryRoot,\n    scopeRoot,\n    input.discovery.tools.vitest.localExecutablePaths,\n  );\n''',
    '''  const installed = resolveInstalledVitest(\n    input.repositoryRoot,\n    scopeRoot,\n    input.discovery.tools.vitest.localExecutablePaths,\n    input.platform ?? process.platform,\n  );\n''',
    "vitest resolver invocation",
)
text = replace_once(
    text,
    "  const selectedArgs = changedPaths.map((path) => relativeFromRoot(scopeRoot, path));\n",
    "  const selectedArgs = changedPaths.map((path) => positionalPathArg(relativeFromRoot(scopeRoot, path)));\n",
    "vitest selected args",
)
path.write_text(text)

append_before_suite_end(
    Path("tests/jest-task.contract.test.ts"),
    r'''  it("keeps option-like changed Jest paths positional instead of letting them become CLI options", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("--config=other.js")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.selectedPaths).toEqual(["--config=other.js"]);
      expect(plan.argv.slice(1, 3)).toEqual(["--findRelatedTests", "./--config=other.js"]);
      expect(plan.argv).not.toContain("--config=other.js");
      expect(plan.argv).toContain("--config");
      expect(plan.argv).toContain("jest.config.cjs");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("prefers the npm .cmd Jest launcher on Windows when both shim forms are present", () => {
    const root = fixtureRoot();
    try {
      writeFileSync(join(root, "node_modules", ".bin", "jest.cmd"), "");
      const files = rootFiles({ "node_modules/.bin/jest.cmd": "" });
      const plan = planJestTask({
        repositoryRoot: root,
        runId: "run-052",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.js")],
        platform: "win32",
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.argv[0]).toBe("node_modules/.bin/jest.cmd");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
''',
)

append_before_suite_end(
    Path("tests/vitest-task.contract.test.ts"),
    r'''  it("keeps option-like changed Vitest paths positional instead of letting them become CLI options", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles();
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("--config=other.ts")],
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.selectedPaths).toEqual(["--config=other.ts"]);
      expect(plan.argv.slice(1, 3)).toEqual(["related", "./--config=other.ts"]);
      expect(plan.argv).not.toContain("--config=other.ts");
      expect(plan.argv).toContain("--config");
      expect(plan.argv).toContain("vitest.config.mjs");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("prefers the npm .cmd Vitest launcher on Windows when both shim forms are present", () => {
    const root = fixtureRoot();
    try {
      const files = rootFiles({ "node_modules/.bin/vitest.cmd": "" });
      const plan = planVitestTask({
        repositoryRoot: root,
        runId: "run-051",
        config: { version: 1 },
        discovery: discoverProjectFromFiles(files),
        files,
        changedFiles: [changed("src/used.ts")],
        platform: "win32",
      });

      expect(plan.state).toBe("planned");
      if (plan.state !== "planned") return;
      expect(plan.argv[0]).toBe("node_modules/.bin/vitest.cmd");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
''',
)
