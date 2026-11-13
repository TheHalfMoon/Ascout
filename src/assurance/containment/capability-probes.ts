import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * FD-4 research (founder decision 2026-11-13: research and implementation, not certification).
 * Native capability probes measure what code Ascout runs can actually do. Each probe is a generic
 * capability question, not an escape technique; technique-level probes belong in the private
 * host-specific spec. Under T0 every capability is expected to be ALLOWED, and these probes prove it
 * per OS in CI. A future T1 runner must turn each one DENIED, natively, before any T1 claim; even then
 * the claim also needs an independent human security review. Nothing here changes the containment
 * tier, which stays T0 (src/assurance/containment/containment-tier.ts).
 *
 * The probe's own report is never trusted alone. The parent observes every effect independently: the
 * canary's random content echoed back, the file actually written, the connection its listener saw,
 * the secret's digest. When the two disagree the result is INCONSISTENT, so a runner can't simply
 * claim a denial.
 */
export const CAPABILITY_PROBE_IDS = [
  "read_outside_workspace",
  "write_outside_workspace",
  "loopback_network",
  "environment_secret",
] as const;
export type CapabilityProbeIdV1 = (typeof CAPABILITY_PROBE_IDS)[number];
export type CapabilityVerdictV1 = "ALLOWED" | "DENIED" | "INCONSISTENT";

export interface CapabilityProbeResultV1 {
  readonly id: CapabilityProbeIdV1;
  readonly verdict: CapabilityVerdictV1;
  readonly probe_claimed: "ALLOWED" | "DENIED" | "MISSING";
  readonly parent_observed: boolean;
}

export interface CapabilityProbeReportV1 {
  readonly schema: "ascout.capability-probes/v1";
  readonly runner: string;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly node: string;
  readonly results: readonly CapabilityProbeResultV1[];
  /** True only when every capability was DENIED with the parent's agreement. Under T0 it never is. */
  readonly all_denied: boolean;
}

/** What a probe run receives: everything it needs to try each capability once. */
export interface ProbeTaskV1 {
  readonly canaryPath: string;
  readonly writePath: string;
  readonly port: number;
  readonly envName: string;
}

/**
 * A runner starts `node` with the probe script and returns its standard output. The T0 runner is a
 * plain child process with the caller's full rights and environment; a T1 runner would wrap the same
 * call in a host-specific sandbox.
 */
export type ProbeRunnerV1 = (script: string, task: ProbeTaskV1, env: NodeJS.ProcessEnv, cwd: string) => Promise<string>;

/**
 * The probe script, run as `node -e <script> <task json>`. Node built-ins only. Each attempt reports
 * ALLOWED or DENIED with evidence the parent can check: the canary's content, the secret's digest.
 */
export const PROBE_SCRIPT = String.raw`
const fs = require("node:fs");
const net = require("node:net");
const crypto = require("node:crypto");
const task = JSON.parse(process.argv[1]);
const out = {};
try { out.read_outside_workspace = { claimed: "ALLOWED", evidence: fs.readFileSync(task.canaryPath, "utf8") }; } catch { out.read_outside_workspace = { claimed: "DENIED" }; }
try { fs.writeFileSync(task.writePath, "probe"); out.write_outside_workspace = { claimed: "ALLOWED" }; } catch { out.write_outside_workspace = { claimed: "DENIED" }; }
const secret = process.env[task.envName];
out.environment_secret = secret === undefined ? { claimed: "DENIED" } : { claimed: "ALLOWED", evidence: crypto.createHash("sha256").update(secret).digest("hex") };
const socket = net.connect({ host: "127.0.0.1", port: task.port });
const done = (claimed) => { out.loopback_network = { claimed }; socket.destroy(); process.stdout.write(JSON.stringify(out)); };
socket.setTimeout(3000, () => done("DENIED"));
socket.on("connect", () => { socket.write("probe"); socket.end(); done("ALLOWED"); });
socket.on("error", () => done("DENIED"));
`;

/** The T0 runner: the caller's own rights, as every `check` task runs today. */
export const t0ProbeRunnerV1: ProbeRunnerV1 = async (script, task, env, cwd) => {
  // Asynchronous on purpose: a synchronous spawn would block this process's event loop, so its own
  // loopback listener could never see the probe's connection.
  const { execFile } = await import("node:child_process");
  return new Promise((resolveRun) => {
    execFile(process.execPath, ["-e", script, JSON.stringify(task)], { cwd, env, encoding: "utf8", timeout: 20_000, windowsHide: true }, (_error, stdout) => resolveRun(stdout ?? ""));
  });
};

function verdict(claimed: "ALLOWED" | "DENIED" | "MISSING", observed: boolean): CapabilityVerdictV1 {
  if (claimed === "ALLOWED" && observed) return "ALLOWED";
  if (claimed === "DENIED" && !observed) return "DENIED";
  return "INCONSISTENT";
}

/**
 * Runs every capability probe once through the runner, from a fresh workspace, and checks each claim
 * against what the parent observed. Everything it creates lives in fresh temporary folders and is
 * removed afterwards; the network probe only ever reaches a listener this function opened on loopback.
 */
export async function runCapabilityProbesV1(runnerName: string, runner: ProbeRunnerV1): Promise<CapabilityProbeReportV1> {
  const workspace = mkdtempSync(join(tmpdir(), "ascout-probe-workspace-"));
  const outside = mkdtempSync(join(tmpdir(), "ascout-probe-outside-"));
  const canary = randomBytes(24).toString("hex");
  const secret = randomBytes(24).toString("hex");
  const canaryPath = join(outside, "canary.txt");
  const writePath = join(outside, "written.txt");
  writeFileSync(canaryPath, canary);
  let connections = 0;
  const server: Server = createServer((socket) => {
    connections += 1;
    socket.on("error", () => undefined);
    socket.resume();
  });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", () => resolveListen()));
  const port = (server.address() as { port: number }).port;
  const envName = `ASCOUT_PROBE_SECRET_${randomBytes(4).toString("hex").toUpperCase()}`;
  try {
    const stdout = await runner(PROBE_SCRIPT, { canaryPath, writePath, port, envName }, { ...process.env, [envName]: secret }, workspace);
    // Let a connection the kernel already accepted reach the listener before the parent decides.
    await new Promise((settle) => setTimeout(settle, 200));
    let claims: Record<string, { claimed?: unknown; evidence?: unknown } | undefined> = {};
    try {
      const parsed = JSON.parse(stdout) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) claims = parsed as typeof claims;
    } catch {
      // No parseable report: every probe is MISSING, which is never a denial.
    }
    const claim = (id: CapabilityProbeIdV1): "ALLOWED" | "DENIED" | "MISSING" => {
      const value = claims[id]?.claimed;
      return value === "ALLOWED" || value === "DENIED" ? value : "MISSING";
    };
    const secretDigest = createHash("sha256").update(secret).digest("hex");
    const observed: Record<CapabilityProbeIdV1, boolean> = {
      read_outside_workspace: claims.read_outside_workspace?.evidence === canary,
      write_outside_workspace: existsSync(writePath) && readFileSync(writePath, "utf8") === "probe",
      loopback_network: connections > 0,
      environment_secret: claims.environment_secret?.evidence === secretDigest,
    };
    const results = CAPABILITY_PROBE_IDS.map((id) => ({ id, probe_claimed: claim(id), parent_observed: observed[id], verdict: verdict(claim(id), observed[id]) }));
    return {
      schema: "ascout.capability-probes/v1",
      runner: runnerName,
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      results,
      all_denied: results.every((result) => result.verdict === "DENIED"),
    };
  } finally {
    server.close();
    rmSync(workspace, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
}
