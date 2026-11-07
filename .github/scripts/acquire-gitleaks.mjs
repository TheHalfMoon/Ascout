// Fetches the admitted Gitleaks archive for this runner, verifies it twice, extracts it,
// and exports the executable's path and measured digest. Runs in CI only, after a build.
// Any mismatch stops the job: nothing unverified is extracted or run.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, chmodSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const { GITLEAKS_RELEASE_V1, gitleaksArchiveForV1 } = await import(
  new URL("../../dist/assurance/engines/gitleaks-profile.js", import.meta.url).href
);

function fail(message) {
  console.error("acquire-gitleaks: " + message);
  process.exit(1);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fetchBytes(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) fail("download failed with HTTP " + response.status + ": " + url);
  return Buffer.from(await response.arrayBuffer());
}

const runnerTemp = process.env.RUNNER_TEMP;
const githubEnv = process.env.GITHUB_ENV;
if (!runnerTemp || !githubEnv) fail("RUNNER_TEMP and GITHUB_ENV are required");

const selected = gitleaksArchiveForV1(process.platform, process.arch);
if (selected === null) fail("no admitted archive for " + process.platform + "-" + process.arch);

const checksums = await fetchBytes(GITLEAKS_RELEASE_V1.checksums.url);
if (sha256(checksums) !== GITLEAKS_RELEASE_V1.checksums.sha256) fail("checksum file digest differs from the pin");

const bytes = await fetchBytes(selected.url);
if (bytes.length !== selected.size) fail("archive size " + bytes.length + " differs from the pin " + selected.size);
const archiveDigest = sha256(bytes);
if (archiveDigest !== selected.sha256) fail("archive digest differs from the pin");
const listed = checksums
  .toString("utf8")
  .split(/\r?\n/u)
  .filter((line) => line.trim().endsWith("  " + selected.name) || line.trim().endsWith(" " + selected.name));
if (listed.length !== 1 || !listed[0].trim().startsWith(archiveDigest + " ")) {
  fail("archive digest is not the one the release's checksum file lists");
}

const root = join(runnerTemp, "gitleaks-" + GITLEAKS_RELEASE_V1.version);
const extracted = join(root, "bin");
mkdirSync(extracted, { recursive: true });
const archivePath = join(root, selected.name);
writeFileSync(archivePath, bytes);

const extraction = process.platform === "win32"
  ? spawnSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Expand-Archive -LiteralPath $env:ASCOUT_ARCHIVE -DestinationPath $env:ASCOUT_DEST",
    ], { stdio: "inherit", env: { ...process.env, ASCOUT_ARCHIVE: archivePath, ASCOUT_DEST: extracted } })
  : spawnSync("/usr/bin/tar", ["-xzf", archivePath, "-C", extracted, selected.binary], { stdio: "inherit" });
if (extraction.error || extraction.status !== 0) fail("extraction failed");

const executable = realpathSync.native(join(extracted, selected.binary));
if (process.platform !== "win32") chmodSync(executable, 0o755);
const executableDigest = sha256(readFileSync(executable));

// Help and version captures are archived as evidence of the exact flags this binary takes.
const captures = join(root, "captures");
mkdirSync(captures, { recursive: true });
for (const [name, args] of [["version", ["version"]], ["help-dir", ["dir", "--help"]]]) {
  const result = spawnSync(executable, args, { encoding: "utf8", env: {}, timeout: 30_000 });
  if (result.error || result.status !== 0) fail("gitleaks " + args.join(" ") + " failed");
  writeFileSync(join(captures, name + ".txt"), result.stdout + result.stderr);
}
const version = readFileSync(join(captures, "version.txt"), "utf8").trim();
if (!version.includes(GITLEAKS_RELEASE_V1.version)) fail("gitleaks reports version " + JSON.stringify(version));
writeFileSync(join(captures, "identity.json"), JSON.stringify({
  release: GITLEAKS_RELEASE_V1.tag,
  tag_commit: GITLEAKS_RELEASE_V1.tag_commit,
  archive: selected.name,
  archive_sha256: archiveDigest,
  executable_sha256: executableDigest,
  platform: process.platform + "-" + process.arch,
  runner: process.env.RUNNER_NAME ?? null,
  retrieved_at: new Date().toISOString(),
}, null, 2) + "\n");

appendFileSync(githubEnv, "ASCOUT_GITLEAKS_EXECUTABLE=" + executable + "\n");
appendFileSync(githubEnv, "ASCOUT_GITLEAKS_SHA256=" + executableDigest + "\n");
appendFileSync(githubEnv, "ASCOUT_GITLEAKS_CAPTURES=" + captures + "\n");
console.log("acquire-gitleaks: verified " + selected.name + " and measured " + executableDigest);
