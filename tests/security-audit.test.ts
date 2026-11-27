import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ASCOUT_SECURITY_ENGINE_ID,
  classifyGitFailureReasonV1,
  countSecurityFindingsV1,
  renderSecurityAuditJsonV1,
  renderSecurityAuditTerminalV1,
  runSecurityAuditV1,
} from "../src/assurance/security/audit-engine.js";
import {
  classifySecurityFileV1,
  isMatchingRegularFileV1,
  readSafeSecurityFileV1,
  runSecurityReconV1,
} from "../src/assurance/security/audit-recon.js";
import {
  redactSecretTokenV1,
  runSecurityRulesV1,
  scrubSecretsFromExcerptV1,
  shannonEntropyV1,
  sortSecurityFindingsV1,
  stripJsCommentsAndStringsV1,
  stripPythonCommentsAndStringsV1,
} from "../src/assurance/security/audit-rules.js";
import { renderSecurityAuditSarifV1 } from "../src/assurance/security/audit-sarif.js";
import { CliUsageError, parseCliArgs, renderSecurityCliOutcomeV1, runCli, writeSafeCliOutputFileV1 } from "../src/cli.js";
import { computeSecurityV1 } from "../src/command-functions.js";
import { collectPrEvidenceV1 } from "../src/github/collect.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = realpathSync.native(mkdtempSync(join(tmpdir(), prefix)));
  tempDirs.push(dir);
  return dir;
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim();
}

function makeGitRepo(files: Record<string, string | Buffer> = { "README.md": "clean\n" }): string {
  const dir = makeTempDir("ascout-sec-repo-");
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.name", "Ascout Test"]);
  git(dir, ["config", "user.email", "test@example.invalid"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(resolve(abs, ".."), { recursive: true });
    writeFileSync(abs, body);
  }
  git(dir, ["add", "."]);
  git(dir, ["commit", "-q", "-m", "initial"]);
  return dir;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ASCOUT_GITLEAKS_PATH;
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

describe("Ascout Security deterministic deep audit (engine:ascout-security-core)", () => {
  it("classifies files, enforces bounded non-following reads, and inventories attack surfaces", () => {
    expect(classifySecurityFileV1(".github/workflows/ci.yml")).toBe("github_workflow");
    expect(classifySecurityFileV1(".github/workflows/ci.yaml")).toBe("github_workflow");
    expect(classifySecurityFileV1("Dockerfile.prod")).toBe("dockerfile");
    expect(classifySecurityFileV1("app.dockerfile")).toBe("dockerfile");
    expect(classifySecurityFileV1(".mcp.json")).toBe("mcp_config");
    expect(classifySecurityFileV1("package-lock.json")).toBe("dependency_manifest");
    expect(classifySecurityFileV1("requirements-dev.txt")).toBe("dependency_manifest");
    expect(classifySecurityFileV1("src/app.ts")).toBe("js_ts");
    expect(classifySecurityFileV1("scripts/run.py")).toBe("python");
    expect(classifySecurityFileV1("scripts/deploy.sh")).toBe("shell");
    expect(classifySecurityFileV1(".env")).toBe("json_or_env");
    expect(classifySecurityFileV1("config/.env")).toBe("json_or_env");
    expect(classifySecurityFileV1(".env.local")).toBe("json_or_env");
    expect(classifySecurityFileV1("docs/notes.md")).toBeNull();

    const dir = makeTempDir("ascout-sec-recon-");
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "ignored.js"), "eval('x');\n");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(
      join(dir, "src", "server.ts"),
      'import http from "node:http";\nimport cp from "node:child_process";\nimport fs from "node:fs";\nimport pg from "prisma";\nimport jwt from "jsonwebtoken";\nexport const ok = 1;\n',
    );
    writeFileSync(join(dir, "src", "bin.ts"), Buffer.from([0x00, 0x01, 0x02]));
    writeFileSync(join(dir, "src", "big.ts"), "a".repeat(2048));
    mkdirSync(join(dir, "a"), { recursive: true });
    writeFileSync(join(dir, "a", "bin.ts"), Buffer.from([0x00, 0x02]));
    writeFileSync(join(dir, "notes.txt"), "unsupported\n");
    symlinkSync(join(dir, "src"), join(dir, "src-link"), process.platform === "win32" ? "junction" : "dir");

    expect(readSafeSecurityFileV1(join(dir, "missing.ts"))).toEqual({ kind: "omitted", reason: "unreadable" });
    expect(readSafeSecurityFileV1(join(dir, "src"))).toEqual({ kind: "omitted", reason: "unreadable" });
    expect(readSafeSecurityFileV1(join(dir, "src", "big.ts"), 100)).toEqual({ kind: "omitted", reason: "oversized" });
    // Identity mismatch (TOCTOU swap) and lstat/read faults fail closed as "unreadable" without throwing.
    const fakeStat = (dev: bigint, ino: bigint, isFile = true) => ({ dev, ino, isFile: () => isFile });
    expect(isMatchingRegularFileV1(fakeStat(1n, 2n), fakeStat(1n, 2n))).toBe(true);
    expect(isMatchingRegularFileV1(fakeStat(1n, 2n, false), fakeStat(1n, 2n))).toBe(false);
    expect(isMatchingRegularFileV1(fakeStat(1n, 2n), fakeStat(1n, 2n, false))).toBe(false);
    expect(isMatchingRegularFileV1(fakeStat(1n, 2n), fakeStat(2n, 2n))).toBe(false);
    expect(isMatchingRegularFileV1(fakeStat(1n, 2n), fakeStat(1n, 3n))).toBe(false);
    expect(
      readSafeSecurityFileV1(join(dir, "src", "server.ts"), 1024, {
        lstat: () => { throw new Error("EACCES"); },
      }),
    ).toEqual({ kind: "omitted", reason: "unreadable" });
    expect(
      readSafeSecurityFileV1(join(dir, "src", "server.ts"), 1024, {
        lstat: () => fakeStat(1n, 2n),
        open: () => 99,
        fstat: () => fakeStat(1n, 999n),
        close: () => undefined,
      }),
    ).toEqual({ kind: "omitted", reason: "unreadable" });
    expect(
      readSafeSecurityFileV1(join(dir, "src", "server.ts"), 1024, {
        lstat: () => fakeStat(1n, 2n),
        open: () => 99,
        fstat: () => fakeStat(1n, 2n),
        read: () => { throw new Error("EIO"); },
        close: () => undefined,
      }),
    ).toEqual({ kind: "omitted", reason: "unreadable" });
    // Unreadable directory, lstat error, and special non-file entries omit cleanly instead of throwing.
    const faultReconRoot = runSecurityReconV1(dir, {
      readdir: () => { throw new Error("EACCES"); },
    });
    expect(faultReconRoot.omitted_files).toEqual([{ path: ".", reason: "unreadable" }]);
    const faultReconSub = runSecurityReconV1(dir, {
      readdir: (d) => {
        if (d.endsWith("src")) throw new Error("EACCES");
        return ["src", "vanished.ts", "fifo.ts"];
      },
      lstat: (p) => {
        if (p.endsWith("vanished.ts")) throw new Error("ENOENT");
        if (p.endsWith("fifo.ts")) return { isSymbolicLink: () => false, isDirectory: () => false, isFile: () => false };
        return { isSymbolicLink: () => false, isDirectory: () => true, isFile: () => false };
      },
    });
    expect(faultReconSub.omitted_files).toEqual([
      { path: "fifo.ts", reason: "unreadable" },
      { path: "src", reason: "unreadable" },
      { path: "vanished.ts", reason: "unreadable" },
    ]);

    const recon = runSecurityReconV1(dir, { maxFileBytes: 1024, maxFiles: 1 });
    expect(recon.excluded_directories).toEqual(["node_modules"]);
    expect(recon.unsupported_files).toEqual(["notes.txt"]);
    expect(recon.omitted_files).toContainEqual({ path: "src-link", reason: "symlink" });
    expect(recon.omitted_files).toContainEqual({ path: "src/big.ts", reason: "oversized" });
    expect(recon.omitted_files).toContainEqual({ path: "src/bin.ts", reason: "binary" });
    expect(recon.scanned_files.map((f) => f.path)).toEqual(["src/server.ts"]);
    expect(recon.attack_surfaces).toEqual([
      "auth_boundary",
      "database_query",
      "filesystem_io",
      "http_server",
      "process_exec",
    ]);

    // File limit overflow puts extra supported files in omitted_files, and Dockerfile/.mcp.json record surfaces.
    writeFileSync(join(dir, "src", "z-extra.ts"), "export const z = 2;\n");
    writeFileSync(join(dir, "Dockerfile"), "FROM node:22\nUSER node\n");
    writeFileSync(join(dir, ".mcp.json"), '{"mcpServers":{}}\n');
    const fullRecon = runSecurityReconV1(dir, { maxFileBytes: 1024, maxFiles: 10 });
    expect(fullRecon.attack_surfaces).toContain("container_definition");
    expect(fullRecon.attack_surfaces).toContain("mcp_tool_config");
    const capped = runSecurityReconV1(dir, { maxFileBytes: 1024, maxFiles: 1 });
    expect(capped.omitted_files.some((o) => o.reason === "file_limit_exceeded")).toBe(true);
  });

  it("detects SEC001-SEC014 deterministically and never leaks plaintext secrets", () => {
    expect(shannonEntropyV1("")).toBe(0);
    expect(shannonEntropyV1("aaaa")).toBe(0);
    expect(shannonEntropyV1("aB3$xY9!kL2@mN8#pQ5%rT7^")).toBeGreaterThan(4.0);
    expect(stripJsCommentsAndStringsV1("/* a\nb */ // c\nconst s = 'x\\'y\\nz';\nconst x = 1;")).toContain("const x = 1;");
    expect(stripJsCommentsAndStringsV1("/* unclosed")).toBe("           ");
    expect(stripJsCommentsAndStringsV1('const r = /[a\\/]b/; const u = "unclosed\nconst m = `a\\\nb`;')).toContain("const r =");
    expect(stripPythonCommentsAndStringsV1('s = "a\\\nb"\nt = """x\ny"""\n# c\nz = 1')).toContain("z = 1");

    const fakeAws = "AKIA" + "IOSFODNN7EXAMPLE";
    const fakeHighEntropy = "Zx9Qw3Lm7Kp2Vn8Rt4Yb6Hc1Jd5Fg0";
    const files = [
      {
        path: "src/app.ts",
        category: "js_ts" as const,
        bytes: 600,
        content: [
          'import { execSync, spawnSync } from "node:child_process";',
          'import { createHash } from "node:crypto";',
          "export function risky(input: string, db: any, el: any) {",
          "  eval(input);",
          "  execSync(`ls ${input}`);",
          '  spawnSync("sh " + input, { shell: true });',
          '  db.query(`SELECT * FROM users WHERE id = ${input}`);',
          '  db.query("SELECT * FROM users WHERE id = " + input);',
          "  el.innerHTML = input;",
          "  document.write(input);",
          "  const tls = { rejectUnauthorized: false };",
          '  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";',
          '  const h = createHash("md5").update(input).digest("hex");',
          '  // avoid createHash("md5") and execSync("ls"); // ${notInterpolated}',
          '  execSync("ls"); // ${commentOnly}',
          `  const awsKey = "${fakeAws}";`,
          `  const api_key = "${fakeHighEntropy}";`,
          '  const secret_key = "aaaaaaaaaaaaaaaaaaaaaaaaaaaa";',
          '  const placeholder_api_key = "example_placeholder_00000000000000";',
          "  return { tls, h, awsKey, api_key, placeholder_api_key };",
          "}",
        ].join("\n"),
      },
      {
        path: ".env",
        category: "json_or_env" as const,
        bytes: 200,
        content: [
          `OPENAI_API_KEY=${fakeHighEntropy}`,
          `TWO_SECRETS=${fakeAws} ghp_1234567890abcdef1234567890abcdef1234`,
          `GITHUB_API_KEY=ghp_1234567890abcdef1234567890abcdef1234`,
          `PEM="-----BEGIN RSA PRIVATE KEY-----\\nMIIEpAIBAAKCAQEASECRETBODY1234567890"`,
        ].join("\n"),
      },
      {
        path: "tests/fixture.test.ts",
        category: "js_ts" as const,
        bytes: 50,
        content: 'eval("ignored in tests");\n',
      },
      {
        path: "tests/test_fixture.py",
        category: "python" as const,
        bytes: 40,
        content: 'eval("ignored in py tests")\n',
      },
      {
        path: "scripts/worker.py",
        category: "python" as const,
        bytes: 300,
        content: [
          "# comment with eval('ignored') and 'quotes'",
          "import os, pickle, yaml, hashlib, subprocess",
          "def run(data):",
          '    x = "a\\"b#not-comment"',
          "    eval(data)",
          "    subprocess.run(data, shell=True)",
          "    pickle.loads(data)",
          "    yaml.load(data)",
          "    requests.get('https://example.invalid', verify=False)",
          "    hashlib.md5(data)",
        ].join("\n"),
      },
      {
        path: ".github/workflows/deploy.yml",
        category: "github_workflow" as const,
        bytes: 300,
        content: [
          "on:",
          "  pull_request_target:",
          "jobs:",
          "  build:",
          "    steps:",
          "      # comment",
          "      - uses: actions/checkout@v4",
          "      - uses: actions/setup-node",
          "        with:",
          "          ref: ${{ github.event.pull_request.head.sha }}",
          "      - uses: ./local-action",
          "      - run: echo ${{ github.event.pull_request.title }}",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        category: "dockerfile" as const,
        bytes: 200,
        content: [
          "# base image",
          "FROM node:22",
          "ADD https://example.invalid/app.tgz /app/",
          "RUN curl -fsSL https://example.invalid/install.sh | bash",
        ].join("\n"),
      },
      {
        path: "Dockerfile.safe",
        category: "dockerfile" as const,
        bytes: 80,
        content: "FROM node:22\nUSER node\nCMD ['node']\n",
      },
      {
        path: "Dockerfile.multistage",
        category: "dockerfile" as const,
        bytes: 120,
        content: "FROM node:22 AS builder\nUSER node\nFROM node:22\nUSER root:root\nRUN echo ok | cat\n",
      },
      {
        path: ".mcp.json",
        category: "mcp_config" as const,
        bytes: 250,
        content: JSON.stringify({
          mcpServers: {
            badShell: { command: "bash", args: ["-c", "echo hi"] },
            badCmd: { command: "C:\\Windows\\System32\\cmd.exe", args: ["/c", "dir"] },
            badPs: { command: "powershell.exe", args: ["-Command", "ls"] },
            badHttp: { url: "HTTP://user:secretpass@remote.example.invalid/mcp" },
            goodLocal: { url: "http://127.0.0.1:4321/mcp" },
            ignoredEntry: null,
          },
        }),
      },
      {
        path: "alt/.mcp.json",
        category: "mcp_config" as const,
        bytes: 60,
        content: JSON.stringify({ servers: { direct: { command: "node", args: ["srv.js"] } } }),
      },
      {
        path: "null/.mcp.json",
        category: "mcp_config" as const,
        bytes: 4,
        content: "null",
      },
      {
        path: "empty/.mcp.json",
        category: "mcp_config" as const,
        bytes: 2,
        content: "{}",
      },
      {
        path: "bad.mcp.json",
        category: "mcp_config" as const,
        bytes: 10,
        content: "{not-json",
      },
      {
        path: "package.json",
        category: "dependency_manifest" as const,
        bytes: 150,
        content: JSON.stringify({
          dependencies: {
            wild: "*",
            plainHttp: "http://registry.example.invalid/pkg.tgz",
            pinned: "^1.2.3",
            nonString: 123,
          },
        }),
      },
      {
        path: "bad/package.json",
        category: "dependency_manifest" as const,
        bytes: 10,
        content: "{bad",
      },
      {
        path: "null/package.json",
        category: "dependency_manifest" as const,
        bytes: 4,
        content: "null",
      },
      {
        path: "nodeps/package.json",
        category: "dependency_manifest" as const,
        bytes: 15,
        content: '{"name":"x"}',
      },
      {
        path: "package-lock.json",
        category: "dependency_manifest" as const,
        bytes: 400,
        content: JSON.stringify({
          packages: {
            "": { name: "root" },
            "node_modules/linked": { link: true, resolved: "packages/linked" },
            "node_modules/empty": {},
            "node_modules/toString": { version: "1.0.0" },
            "node_modules/constructor": { version: "1.0.0" },
            "node_modules/event-stream": {
              version: "3.3.6",
              resolved: "http://registry.example.invalid/event-stream-3.3.6.tgz",
            },
          },
        }),
      },
      {
        path: "bad/package-lock.json",
        category: "dependency_manifest" as const,
        bytes: 10,
        content: "{bad",
      },
      {
        path: "null/package-lock.json",
        category: "dependency_manifest" as const,
        bytes: 4,
        content: "null",
      },
      {
        path: "nopkgs/package-lock.json",
        category: "dependency_manifest" as const,
        bytes: 2,
        content: "{}",
      },
      {
        path: "requirements.txt",
        category: "dependency_manifest" as const,
        bytes: 100,
        content: "# comment\n--index-url http://pypi.example.invalid/simple\nrequests==2.32.0\n",
      },
    ];

    const findings = runSecurityRulesV1(files);
    const rules = new Set(findings.map((f) => f.rule_id));
    for (const expected of [
      "SEC001", "SEC002", "SEC003", "SEC004", "SEC005", "SEC006", "SEC007",
      "SEC008", "SEC009", "SEC010", "SEC011", "SEC012", "SEC013", "SEC014",
    ]) {
      expect(rules.has(expected), `expected rule ${expected}`).toBe(true);
    }
    expect(findings.some((f) => f.path === "tests/fixture.test.ts")).toBe(false);
    expect(findings.some((f) => f.path === "Dockerfile.safe")).toBe(false);
    expect(findings.some((f) => f.path === "Dockerfile.multistage" && f.rule_id === "SEC012")).toBe(true);
    // Comment false positives suppressed for SEC002/SEC007.
    expect(findings.filter((f) => f.path === "src/app.ts" && f.rule_id === "SEC007")).toHaveLength(1);
    expect(findings.filter((f) => f.path === "src/app.ts" && f.rule_id === "SEC002")).toHaveLength(2);
    // Zero plaintext secrets (including PEM bodies, second tokens, URL userinfo, and .env secrets) in findings.
    const serialized = JSON.stringify(findings);
    expect(serialized).not.toContain(fakeAws);
    expect(serialized).not.toContain(fakeHighEntropy);
    expect(serialized).not.toContain("ghp_1234567890abcdef1234567890abcdef1234");
    expect(serialized).not.toContain("MIIEpAIBAAKCAQEASECRETBODY1234567890");
    expect(serialized).not.toContain("user:secretpass");
    expect(serialized).toContain("<REDACTED:userinfo>");
    expect(serialized).toContain(redactSecretTokenV1(fakeAws));
    expect(serialized).toContain(redactSecretTokenV1(fakeHighEntropy));
    expect(scrubSecretsFromExcerptV1(`api_key=${fakeHighEntropy}`)).not.toContain(fakeHighEntropy);
    expect(scrubSecretsFromExcerptV1(`execSync("curl ${fakeAws}")`)).not.toContain(fakeAws);
    expect(scrubSecretsFromExcerptV1("api_key=aaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe("api_key=aaaaaaaaaaaaaaaaaaaaaaaaaaaa");

    // Polynomial ReDoS regression guard: crafted large inputs must finish in well under 500ms.
    const t0 = Date.now();
    runSecurityRulesV1([
      { path: ".github/workflows/redos.yml", category: "github_workflow", bytes: 40_000, content: "\n".repeat(40_000) },
      { path: "Dockerfile.redos", category: "dockerfile", bytes: 50_000, content: "RUN " + "curl ".repeat(10_000) },
      { path: "redos.py", category: "python", bytes: 80_000, content: "subprocess.x(".repeat(6_000) },
    ]);
    expect(Date.now() - t0).toBeLessThan(1500);

    // Deterministic tie-breaking & low-severity counting/SARIF rendering.
    const lowA = {
      finding_id: "sec_a",
      rule_id: "SEC001",
      cwe: "CWE-94",
      severity: "low" as const,
      confidence: "medium" as const,
      category: "misc",
      path: "a.ts",
      start_line: 1,
      end_line: 1,
      message: "a",
      evidence_excerpt: "a",
      remediation: "r",
    };
    const lowB = { ...lowA, finding_id: "sec_b" };
    const lowR2 = { ...lowA, rule_id: "SEC002", finding_id: "sec_c" };
    expect(sortSecurityFindingsV1([lowB, lowR2, lowA, { ...lowA }]).map((f) => f.finding_id)).toEqual([
      "sec_a",
      "sec_a",
      "sec_b",
      "sec_c",
    ]);
    expect(countSecurityFindingsV1([lowA])).toEqual({ total: 1, critical: 0, high: 0, medium: 0, low: 1 });
  });

  it("self-dogfoods Ascout's own repository with zero false-positive findings in src/, workflows, and manifests", () => {
    const repoRoot = resolve(__dirname, "..");
    const recon = runSecurityReconV1(repoRoot);
    const findings = runSecurityRulesV1(recon.scanned_files);
    const prodFindings = findings.filter(
      (f) =>
        f.path.startsWith("src/") ||
        f.path.startsWith(".github/") ||
        f.path.startsWith("research/") ||
        f.path === "package.json" ||
        f.path === "package-lock.json",
    );
    expect(prodFindings, JSON.stringify(prodFindings, null, 2)).toEqual([]);
    expect(recon.scanned_files.length).toBeGreaterThan(40);
    expect(recon.attack_surfaces).toContain("ci_workflow");
    expect(recon.excluded_directories).toContain("vendor");
  }, 60_000);

  it("handles clean, finding, SARIF, --out, Gitleaks merge, drift, and error paths deterministically", async () => {
    // 1. Outside repo / null root -> NOT_RUN (exit 4), reads nothing.
    const outside = makeTempDir("ascout-sec-out-");
    const notRunNull = await runSecurityAuditV1(null);
    expect(notRunNull).toMatchObject({ kind: "report", report: { outcome: "NOT_RUN", exit_code: 4 } });
    if (notRunNull.kind === "report") {
      expect(renderSecurityAuditTerminalV1(notRunNull.report)).toContain("not executed");
      const lowSarif = JSON.parse(
        renderSecurityAuditSarifV1({
          ...notRunNull.report,
          findings: [
            {
              finding_id: "sec_low",
              rule_id: "SEC001",
              cwe: "CWE-94",
              severity: "low",
              confidence: "medium",
              category: "misc",
              path: "a.ts",
              start_line: 1,
              end_line: 1,
              message: "low",
              evidence_excerpt: "low",
              remediation: "fix",
            },
          ],
        }),
      ) as { runs: Array<{ results: Array<{ level: string }>; properties: Record<string, unknown> }> };
      expect(lowSarif.runs[0]!.results[0]!.level).toBe("note");
      expect(lowSarif.runs[0]!.properties.ascout_source_head).toBeNull();
    }
    expect(await runSecurityAuditV1(outside)).toMatchObject({ kind: "report", report: { outcome: "NOT_RUN", exit_code: 4 } });
    expect(await computeSecurityV1(null, null, new AbortController().signal)).toMatchObject({ kind: "report", exit_code: 4 });

    // 2. Repo with findings -> exit 1, deterministic JSON + valid SARIF 2.1.0 + terminal output.
    const vulnRepo = makeGitRepo({
      "src/vuln.ts": 'export function bad(x: string) { return eval(x); }\n',
      "src/bin.ts": Buffer.from([0x00, 0x01]),
      "Dockerfile": "FROM node:22\nCMD ['node']\n",
      "docs/readme.txt": "unsupported\n",
    });
    const r1 = await runSecurityAuditV1(vulnRepo, { maxFileBytes: 1024, maxFiles: 50 });
    const r2 = await runSecurityAuditV1(vulnRepo);
    expect(r1.kind).toBe("report");
    expect(r2.kind).toBe("report");
    if (r1.kind === "report" && r2.kind === "report") {
      expect(renderSecurityAuditJsonV1(r1.report)).toBe(renderSecurityAuditJsonV1(r2.report));
      expect(r1.report.outcome).toBe("FINDINGS");
      expect(r1.report.exit_code).toBe(1);
      expect(r1.report.counts.high).toBeGreaterThanOrEqual(1);
      expect(r1.report.counts.medium).toBeGreaterThanOrEqual(1);
      const sarif = JSON.parse(renderSecurityAuditSarifV1(r1.report)) as {
        version: string;
        runs: Array<{ tool: { driver: { name: string; rules: unknown[] } }; results: unknown[]; properties: Record<string, unknown> }>;
      };
      expect(sarif.version).toBe("2.1.0");
      expect(sarif.runs[0]!.tool.driver.name).toBe("Ascout");
      expect(sarif.runs[0]!.results.length).toBe(r1.report.findings.length);
      expect(sarif.runs[0]!.properties).toMatchObject({
        ascout_coverage_total: false,
        ascout_security_pass: false,
        ascout_clean_claimed: false,
        ascout_sarif_is_canonical_truth: false,
      });
      const terminal = renderSecurityAuditTerminalV1(r1.report);
      expect(terminal).toContain("=== Ascout Security (FINDINGS) ===");
      expect(terminal).toContain("SEC001");
      expect(terminal).toContain("This is not a security pass and not a clean result.");
    }

    // 3. Source drift across scan -> SOURCE_DRIFT (exit 3).
    let calls = 0;
    const drifted = await runSecurityAuditV1(vulnRepo, {
      deps: {
        readSource: () => {
          calls += 1;
          return { head_sha: "a".repeat(40), tree_digest: calls === 1 ? "b".repeat(64) : "c".repeat(64) };
        },
      },
    });
    expect(drifted.kind).toBe("drift");
    if (drifted.kind === "drift") {
      expect(drifted.report.exit_code).toBe(3);
      expect(renderSecurityAuditTerminalV1(drifted.report)).toContain("=== Ascout Security (SOURCE_DRIFT) ===");
    }

    // 3b. End source read failure + non-Error throw fail closed with error.
    let readCount = 0;
    const endErr = await runSecurityAuditV1(vulnRepo, {
      deps: {
        readSource: () => {
          readCount += 1;
          if (readCount === 2) throw "non-error-throw";
          return { head_sha: "a".repeat(40), tree_digest: "b".repeat(64) };
        },
      },
    });
    expect(endErr).toMatchObject({ kind: "error", message: expect.stringMatching(/could not be read for scanning/u) });

    // 4. Optional Gitleaks merge (findings + dedupe + drift + error).
    const merged = await runSecurityAuditV1(vulnRepo, {
      gitleaksPath: "/fake/gitleaks",
      deps: {
        runGitleaks: async () => ({
          kind: "report",
          report: {
            schema_version: 2,
            kind: "security",
            outcome: "FINDINGS",
            reason_code: "SECRETS_FOUND",
            reason_text: "1 secret",
            exit_code: 1,
            executed_count: 1,
            engine: { id: "engine:gitleaks", version: "8.30.1", executed: true, executable_sha256: "0".repeat(64), run_status: "INCOMPLETE", run_reason_code: "PARTIAL_COVERAGE" },
            source: { head_sha: "a".repeat(40), tree_digest: "b".repeat(64) },
            coverage: "PARTIAL",
            findings: [
              { rule_id: "github-pat", path: "src/vuln.ts", start_line: 1, end_line: 1, message: "secret" },
              { rule_id: "github-pat", path: "src/vuln.ts", start_line: 1, end_line: 1, message: "secret" },
              { rule_id: "generic-secret", path: null, start_line: null, end_line: null, message: "hidden" },
            ],
            limitations: [
              "Gitleaks partial coverage.",
              "Dependency advisory checks use a built-in offline catalog only (no network lookup).",
            ],
            security_pass: false,
            clean_claimed: false,
          },
        }),
      },
    });
    expect(merged.kind).toBe("report");
    if (merged.kind === "report") {
      expect(merged.report.engine.gitleaks_executed).toBe(true);
      expect(merged.report.findings.some((f) => f.rule_id === "github-pat")).toBe(true);
      expect(renderSecurityAuditSarifV1(merged.report)).toContain("github-pat");
      expect(renderSecurityAuditTerminalV1(merged.report)).toContain("+ gitleaks");
    }

    const glErr = await runSecurityAuditV1(vulnRepo, {
      gitleaksPath: "/fake/gitleaks",
      deps: { runGitleaks: async () => ({ kind: "error", message: "ascout security: digest mismatch" }) },
    });
    expect(glErr).toEqual({ kind: "error", message: "ascout security: digest mismatch" });

    const glDrift = await runSecurityAuditV1(vulnRepo, {
      gitleaksPath: "/fake/gitleaks",
      deps: {
        runGitleaks: async () => ({
          kind: "drift",
          report: { schema_version: 1, kind: "drift", outcome: "SOURCE_DRIFT", exit_code: 3, reason_code: "SOURCE_DRIFT", reason_text: "moved", executed_count: 1, start: null, end: null },
        }),
      },
    });
    expect(glDrift.kind).toBe("drift");
    if (glDrift.kind === "drift") {
      expect(renderSecurityAuditTerminalV1(glDrift.report)).toContain("start: unknown");
      expect(renderSecurityCliOutcomeV1("sarif", "ascout-security-core", glDrift.report)).toMatchObject({ stream: "stderr", writeOut: false });
      expect(renderSecurityCliOutcomeV1("json", "ascout-security-core", glDrift.report)).toMatchObject({ stream: "stdout", writeOut: false });
    }
    if (merged.kind === "report") {
      expect(renderSecurityCliOutcomeV1("terminal", "gitleaks", {
        schema_version: 2,
        kind: "security",
        outcome: "NOT_RUN",
        reason_code: "NO_REPOSITORY",
        reason_text: "none",
        exit_code: 4,
        executed_count: 0,
        engine: { id: "engine:gitleaks", version: "8.30.1", executed: false, executable_sha256: null, run_status: "NOT_RUN", run_reason_code: "NO_REPOSITORY" },
        source: null,
        coverage: "NONE",
        findings: [],
        limitations: [],
        security_pass: false,
        clean_claimed: false,
      })).toMatchObject({ stream: "stderr", writeOut: true });
    }
    // Exercise default runGitleaks + signal forwarding path.
    expect(
      await runSecurityAuditV1(vulnRepo, {
        gitleaksPath: join(outside, "missing-gitleaks"),
        signal: new AbortController().signal,
      }),
    ).toMatchObject({ kind: "report", report: { engine: { gitleaks_executed: false } } });

    // 5. Subdirectory / unborn repo fails closed with error.
    const subDir = join(vulnRepo, "src");
    expect(await runSecurityAuditV1(subDir)).toEqual({ kind: "error", message: "ascout security: run from the repository root." });
    expect(await computeSecurityV1(subDir, null)).toMatchObject({ kind: "error", exit_code: 2 });

    const unborn = makeTempDir("ascout-sec-unborn-");
    git(unborn, ["init", "-q"]);
    expect(await runSecurityAuditV1(unborn)).toMatchObject({ kind: "error", message: expect.stringMatching(/could not be read for scanning/u) });
    expect(classifyGitFailureReasonV1("partial clone promisor")).toBe("partial clone");
    expect(classifyGitFailureReasonV1("submodule present")).toBe("submodule");
    expect(classifyGitFailureReasonV1("Git filter attribute")).toBe("Git filter attribute");
    expect(classifyGitFailureReasonV1("unborn branch")).toBe("no commits yet");
    expect(classifyGitFailureReasonV1("other error")).toBe("Git metadata error");

    // 6. CLI parsing + --format sarif + --out <path> + safe non-regular output refusal.
    expect(parseCliArgs(["security", "--format", "sarif", "--out", "out.sarif"])).toEqual({
      command: "security",
      allowChangedCommandSurface: false,
      format: "sarif",
      outPath: "out.sarif",
    });
    expect(() => parseCliArgs(["review", "--out", "x"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["security", "--out", "a", "--out", "b"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["security", "--out"])).toThrow(CliUsageError);
    expect(() => parseCliArgs(["security", "--format"])).toThrow(/json\|terminal\|sarif/u);
    expect(() => parseCliArgs(["review", "--format"])).toThrow(/json\|terminal/u);

    // PR evidence accurately labels non-secret deterministic findings vs secrets and maps severities.
    const secretRepo = makeGitRepo({
      "src/vuln.ts": `export function bad(x: string) { return eval(x); }\nconst k = "AKIA" + "IOSFODNN7EXAMPLE";\n`,
      ".env": `OPENAI_API_KEY=Zx9Qw3Lm7Kp2Vn8Rt4Yb6Hc1Jd5Fg0\n`,
      "Dockerfile": "FROM node:22\nCMD ['node']\n",
    });
    const prBundle = await collectPrEvidenceV1({ root: secretRepo, gitleaksPath: null, runTests: false });
    expect(prBundle.findings.some((f) => f.title === "Security (injection): SEC001" && f.severity === "failure")).toBe(true);
    expect(prBundle.findings.some((f) => f.title === "Security (container): SEC012" && f.severity === "warning")).toBe(true);
    expect(prBundle.findings.some((f) => f.title === "Secret: SEC009" && f.severity === "failure")).toBe(true);

    const outDir = makeTempDir("ascout-sec-cli-out-");
    expect(() => writeSafeCliOutputFileV1(outDir, "x")).toThrow(/symlink or non-regular file/u);
    const linkTarget = join(outDir, "target.txt");
    writeFileSync(linkTarget, "keep");
    const outLink = join(outDir, "out-link");
    symlinkSync(outDir, outLink, process.platform === "win32" ? "junction" : "dir");
    expect(() => writeSafeCliOutputFileV1(outLink, "x")).toThrow(/symlink or non-regular file/u);
    // Safely overwrites an existing regular file atomically.
    writeSafeCliOutputFileV1(linkTarget, "updated");
    expect(readFileSync(linkTarget, "utf8")).toBe("updated");

    const outSarif = join(outDir, "nested", "audit.sarif");
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(vulnRepo);
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await runCli(["security", "--format", "sarif", "--out", outSarif])).toBe(1);
      expect(JSON.parse(readFileSync(outSarif, "utf8")).version).toBe("2.1.0");

      stdoutSpy.mockClear();
      expect(await runCli(["security", "--format", "sarif"])).toBe(1);
      expect(JSON.parse(stdoutSpy.mock.calls.map((c) => String(c[0])).join("")).version).toBe("2.1.0");

      const outJson = join(outDir, "audit.json");
      expect(await runCli(["security", "--format", "json", "--out", outJson])).toBe(1);
      expect(JSON.parse(readFileSync(outJson, "utf8")).engine.id).toBe(ASCOUT_SECURITY_ENGINE_ID);

      stderrSpy.mockClear();
      expect(await runCli(["security"])).toBe(1);
      expect(stderrSpy.mock.calls.flat().map(String).join("\n")).toContain("SEC001");

      stderrSpy.mockClear();
      expect(await runCli(["security", "--format", "terminal"])).toBe(1);
      expect(stderrSpy.mock.calls.flat().map(String).join("\n")).toContain("SEC001");

      // Subdirectory error exits 2 in both sarif and json modes.
      cwdSpy.mockReturnValue(subDir);
      expect(await runCli(["security", "--format", "sarif"])).toBe(2);
      expect(await runCli(["security", "--format", "json"])).toBe(2);

      // Deleted cwd exits 4 (NOT_RUN).
      cwdSpy.mockImplementation(() => { throw new Error("ENOENT"); });
      expect(await runCli(["security", "--format", "json"])).toBe(4);
    } finally {
      cwdSpy.mockRestore();
    }
  }, 120_000);
});
