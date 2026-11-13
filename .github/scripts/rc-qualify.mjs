// Release-candidate qualification: install the packed tarball into a temporary global prefix,
// run the CLI through npm's own shim, check real exit codes, then uninstall and check it's gone.
// Usage: node .github/scripts/rc-qualify.mjs <tarball> <result.json>
// Exits 0 only if every check passes. Every check's outcome goes in <result.json>.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const [tarballArg, resultPath] = process.argv.slice(2);
if (!tarballArg || !resultPath) {
  console.error("usage: rc-qualify.mjs <tarball> <result.json>");
  process.exit(2);
}
const tarball = resolve(tarballArg);
const windows = process.platform === "win32";
const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-rc-")));
const prefix = join(root, "prefix");
mkdirSync(prefix);
const checks = [];

// Fixed argument lists only. A shell is used on Windows for the .cmd shims npm creates.
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: windows, timeout: 300_000, windowsHide: true, ...options });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error?.message ?? null };
}

function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${pass ? "" : `: ${JSON.stringify(detail).slice(0, 600)}`}`);
}

function json(text) {
  try { return JSON.parse(text); } catch { return null; }
}

const install = run("npm", ["install", "--global", "--prefix", prefix, "--ignore-scripts", "--no-audit", "--no-fund", tarball]);
check("npm install --global from the tarball", install.status === 0, { status: install.status, stderr: install.stderr.slice(-800) });

const packageDir = windows ? join(prefix, "node_modules", "@thehalfmoon", "ascout") : join(prefix, "lib", "node_modules", "@thehalfmoon", "ascout");
const shim = windows ? join(prefix, "ascout.cmd") : join(prefix, "bin", "ascout");
check("shim and package exist", existsSync(shim) && existsSync(join(packageDir, "dist", "cli.js")), { shim, packageDir });

const outside = join(root, "outside");
mkdirSync(outside);
const usage = run(shim, [], { cwd: outside });
check("no command: usage, exit 2", usage.status === 2 && usage.stderr.includes("Usage:"), usage);

const securityOutside = run(shim, ["security", "--format", "json"], { cwd: outside, env: { ...process.env, ASCOUT_GITLEAKS_PATH: "" } });
check("security outside a repository: exit 4, JSON exit_code 4", securityOutside.status === 4 && json(securityOutside.stdout)?.exit_code === 4, securityOutside);

const reviewOutside = run(shim, ["review"], { cwd: outside });
check("review outside a repository: exit 2", reviewOutside.status === 2, reviewOutside);

const repo = join(root, "repo");
mkdirSync(repo);
const git = (...args) => run("git", args, { cwd: repo, shell: false });
git("init", "-q");
git("config", "user.name", "rc");
git("config", "user.email", "rc@example.invalid");
git("config", "commit.gpgsign", "false");
writeFileSync(join(repo, "a.txt"), "a\n");
git("add", ".");
git("commit", "-qm", "base");
writeFileSync(join(repo, "a.txt"), "a\nb\n");

const review = run(shim, ["review", "--format", "json"], { cwd: repo });
check("review of a changed tree: exit 4, outcome NOT_RUN", review.status === 4 && json(review.stdout)?.outcome === "NOT_RUN", review);

const doctor = run(shim, ["doctor", "--format", "json"], { cwd: repo });
check("doctor --format json: exit 0, kind doctor", doctor.status === 0 && json(doctor.stdout)?.kind === "doctor", doctor);

const plan = run(shim, ["test", "--plan", "--format", "json"], { cwd: repo });
check("test --plan: exit 0, a non-assurance plan", plan.status === 0 && plan.stdout.includes("NON_ASSURANCE_PLAN"), plan);

const mcp = run(shim, ["mcp"], { cwd: repo, input: `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })}\n` });
const tools = json(mcp.stdout.split("\n")[0] ?? "")?.result?.tools?.map((tool) => tool.name) ?? [];
// Exactly these read-only tools (E8, amended by E11a). Nothing that runs `check`, `test`, or `init`.
const MCP_TOOLS = ["ascout_review", "ascout_security", "ascout_doctor", "ascout_test_plan", "ascout_policy", "ascout_last_check"];
check("mcp: exactly the six read-only tools, exit 0 when stdin closes", mcp.status === 0 && JSON.stringify(tools) === JSON.stringify(MCP_TOOLS), { status: mcp.status, tools, stderr: mcp.stderr });

// C1: the dependency-free publish entry point runs straight from the installed package, with no
// other packages, and refuses missing configuration with exit 2 before any network call.
const publishCli = join(packageDir, "dist", "github", "publish-cli.js");
const publish = run(process.execPath, [publishCli, "bundle.json"], { cwd: outside, shell: false, env: { PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "" } });
check("publish-cli: runs from the package and refuses missing configuration with exit 2", existsSync(publishCli) && publish.status === 2 && publish.stderr.includes("GITHUB_REPOSITORY"), { status: publish.status, stderr: publish.stderr.slice(0, 300) });

// The App-mode template never installs: it extracts the tarball and runs the entry point with no
// node_modules anywhere. Prove that exact shape. tar runs from the work folder with relative paths,
// so no drive letter reaches it on Windows.
const bare = join(root, "bare");
mkdirSync(bare);
const extract = run("tar", ["-xzf", relative(root, tarball), "-C", "bare"], { cwd: root, shell: false });
const barePublishCli = join(bare, "package", "dist", "github", "publish-cli.js");
const bareNodeModules = existsSync(join(bare, "node_modules")) || existsSync(join(bare, "package", "node_modules"));
const barePublish = run(process.execPath, [barePublishCli, "bundle.json"], { cwd: outside, shell: false, env: { PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "" } });
check("publish-cli: runs from the bare extracted tarball with no node_modules, and refuses missing configuration with exit 2", extract.status === 0 && !bareNodeModules && barePublish.status === 2 && barePublish.stderr.includes("GITHUB_REPOSITORY"), { extract: extract.status, extractStderr: (extract.stderr ?? "").slice(0, 300), bareNodeModules, status: barePublish.status, stderr: (barePublish.stderr ?? "").slice(0, 300) });

const uninstall = run("npm", ["uninstall", "--global", "--prefix", prefix, "@thehalfmoon/ascout"]);
const leftovers = existsSync(prefix) ? readdirSync(windows ? prefix : join(prefix, "bin")).filter((name) => name.toLowerCase().startsWith("ascout")) : [];
check("npm uninstall removes the package and shim", uninstall.status === 0 && !existsSync(packageDir) && !existsSync(shim) && leftovers.length === 0, { status: uninstall.status, leftovers });

const passed = checks.every((entry) => entry.pass);
writeFileSync(resultPath, `${JSON.stringify({ platform: process.platform, arch: process.arch, node: process.version, tarball, passed, checks }, null, 2)}\n`);
process.exit(passed ? 0 : 1);
