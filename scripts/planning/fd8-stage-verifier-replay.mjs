/**
 * Owner-trusted, read-only FD8 staging experiment.
 * Copies pinned Markdown into an OS temp directory only. It does not
 * authorize, create, or merge planning changes.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPinnedFd8Audit } from "./audit-fd8-root.mjs";
import { simulateFd8Staging } from "./fd8-staging-research.mjs";

const PINNED_VERIFIER = "627ce80ea5c66c6b0ce4919c606569b780fc00ba";
const ROOT = "docs/strategy/ascout-v2/";
const PIN = /^[a-f0-9]{40}$/u;
const STUB = "# INCOMPLETE / NOT_EFFECTIVE — research-only path placeholder; no FD8 approval.\n";
const MAX_OUTPUT = 1024 * 1024;

function execute(cmd, args, cwd) {
  const env = Object.fromEntries(Object.entries(process.env)
    .filter(([name]) => !/^GIT_/iu.test(name)));
  // Git for Windows understands /dev/null, but GIT_CONFIG_*=NUL fails.
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  env.GIT_CONFIG_SYSTEM = "/dev/null";
  env.GIT_TERMINAL_PROMPT = "0";
  return spawnSync(cmd, args, {
    cwd, env, encoding: "utf8", timeout: 15000,
    maxBuffer: MAX_OUTPUT, shell: false, windowsHide: true,
  });
}
function git(args, cwd) {
  const proc = execute("git", [
    "-c", "core.hooksPath=/dev/null",
    "-c", "core.fsmonitor=false",
    "-c", "diff.external=",
    ...args,
  ], cwd);
  if (proc.status !== 0 || proc.error) {
    throw new Error("pinned Git read failed: op=" + String(args[0]) +
      " status=" + String(proc.status) + " signal=" + String(proc.signal) +
      " error=" + String(proc.error?.code ?? "none") +
      " stderr=" + String(proc.stderr ?? "").slice(0, 200));
  }
  return proc.stdout;
}
function assertedPath(path) {
  if (typeof path !== "string" ||
      !/^docs\/strategy\/[a-zA-Z0-9_./-]+$/u.test(path) ||
      path.split("/").some(c => c === "." || c === ".." || !c)) {
    throw new TypeError("refusing unsafe research path");
  }
  return path;
}
function put(root, path, content) {
  const full = resolve(root, assertedPath(path));
  if (!full.startsWith(resolve(root) + "\\" ) &&
      !full.startsWith(resolve(root) + "/")) {
    throw new TypeError("refusing path escaping temp root");
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
}
function gitSource(sha, path, cwd) {
  if (!PIN.test(sha)) throw new TypeError("invalid source commit pin");
  return git(["show", sha + ":" + assertedPath(path)], cwd);
}
export function summarizeVerifier(status, stderr, stdout) {
  if (!Number.isInteger(status) || ![0, 1, 2, 3].includes(status)) {
    return { outcome: "VERIFIER_NOT_RUN_OR_UNKNOWN", exit: status };
  }
  // The proposed verifier returns 0 for PASS, 1 for validation failure,
  // 2 for CLI misuse; there is no retry-to-green or automatic acceptance.
  const outcome = status === 0 ? "PROPOSED_VERIFIER_PASS_ONLY" :
    status === 1 ? "PROPOSED_VERIFIER_FAIL" : "VERIFIER_INVOCATION_ERROR";
  const failures = String(stderr).split(/\r?\n/).filter(x =>
    /broken link|identifier .*never defined|no identifier references|ratified or approved|no markdown files/u.test(x));
  return {
    outcome, exit: status, issue_count: failures.length,
    examples: failures.slice(0, 3).map(s => s.slice(-240)),
    summary: String(stdout).split(/\r?\n/).filter(Boolean).slice(0, 2),
  };
}
function verify(dir, temp, useIds) {
  const args = [join(temp, "pinned-verifier.mjs")];
  if (useIds) args.push("--ids");
  args.push(dir);
  const p = execute(process.execPath, args, temp);
  return summarizeVerifier(p.status, p.stderr, p.stdout);
}
export function replayStages(manifestPath) {
  const cwd = process.cwd();
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const audit = runPinnedFd8Audit(manifestPath);
  const research = simulateFd8Staging(manifest, audit);
  if (research.status !== "SIMULATED_ONLY_BLOCKED_GOVERNANCE" ||
      research.source_paths_preexisting_at_base.length !== 1 ||
      research.source_paths_preexisting_at_base[0] !== "docs/strategy/README.md" ||
      research.new_paths_needing_stubs !== 20) {
    throw new Error("unexpected FD8 source state; fail closed");
  }
  const temp = mkdtempSync(join(tmpdir(), "ascout-fd8-staging-"));
  const stageReports = [];
  try {
    // Use the unmerged #585 verifier solely as a pinned RESEARCH comparator.
    const lib = git(["show", PINNED_VERIFIER +
      ":scripts/planning/verify-planning-docs-lib.mjs"], cwd);
    writeFileSync(join(temp, "pinned-verifier-lib.mjs"), lib, "utf8");
    writeFileSync(join(temp, "pinned-verifier.mjs"),
      'import { runCli } from "./pinned-verifier-lib.mjs";\n' +
      'process.exitCode = runCli(process.argv.slice(2));\n', "utf8");
    const basePaths = git(["ls-tree", "-r", "--name-only",
      manifest.base_head, "--", "docs/strategy"], cwd)
      .split(/\r?\n/).filter(Boolean);
    for (const path of basePaths) {
      put(temp, path, gitSource(manifest.base_head, path, cwd));
    }
    const v2 = resolve(temp, ROOT);
    const canonicalScope = resolve(temp, "docs/strategy");
    const baseline = {
      canonical_links: verify(canonicalScope, temp, false),
      canonical_ids: verify(canonicalScope, temp, true),
    };
    for (const step of research.projected_steps) {
      for (const path of step.paths) {
        // Pre-existing strategy README is only modified in the final grain.
        if (step.kind === "PROPOSED_STUB_PATHS_ONLY") {
          if (!path.startsWith(ROOT)) throw new Error("attempt to stub base doc");
          put(temp, path, STUB);
        } else {
          put(temp, path, gitSource(manifest.source_head, path, cwd));
        }
      }
      stageReports.push({
        stage: step.group ?? step.kind,
        file_count: step.changed_files,
        link_verifier: verify(v2, temp, false),
        link_and_id_verifier: verify(v2, temp, true),
        canonical_links: verify(canonicalScope, temp, false),
        canonical_ids: verify(canonicalScope, temp, true),
      });
    }
    let identical = 0;
    for (const group of manifest.groups) {
      for (const path of group.files) {
        const actual = readFileSync(resolve(temp, assertedPath(path)), "utf8");
        if (actual !== gitSource(manifest.source_head, path, cwd)) {
          throw new Error("final materialized source differs from pinned Git");
        }
        identical++;
      }
    }
    return {
      schema: "ascout.fd8.replay-observation/v1",
      status: "RESEARCH_NOT_RATIFIED",
      original_source_files_identical: identical,
      proposed_verifier_pin: PINNED_VERIFIER,
      canonical_baseline: baseline,
      stage_results: stageReports,
      note: "Proposed #585 verifier only: no complete anchor/Markdown parser, no source or governance approval.",
      founder_decision: "PENDING",
      independently_reviewed: false,
      merge_authorized: false,
    };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const p = resolve(process.argv[2] ?? "scripts/planning/fd8-root-manifest.json");
    console.log(JSON.stringify(replayStages(p), null, 2));
    process.exitCode = 2; // deliberately NOT PASS
  } catch (e) {
    console.error("FD8 replay failed closed: " + (e instanceof Error ? e.message : String(e)));
    process.exitCode = 3;
  }
}
