import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { MOBILE_ARTEMIS_DONOR_SHA } from "./descriptor.js";

export const MOBILE_SIDECAR_VERSION = "1.0.0" as const;
export const MOBILE_PYTHON_PIN_MAJOR = 3 as const;
export const MOBILE_PYTHON_PIN_MINOR = 12 as const;
export const DEFAULT_INTERPRETER_CANDIDATES = ["python3", "python"] as const;
export const DEFAULT_ADB_CANDIDATES = ["adb"] as const;
export const VERSION_PROBE_TIMEOUT_MS = 15000 as const;
export const HANDSHAKE_TIMEOUT_MS = 20000 as const;
export const MAX_OUTPUT_BYTES = 1048576 as const;

export interface CommandRunRequestV1 {
  readonly command: string;
  readonly args: readonly string[];
  readonly stdinText: string;
  readonly timeoutMs: number;
}

export interface CommandRunResultV1 {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
}

export interface CommandRunnerV1 {
  run(request: CommandRunRequestV1): Promise<CommandRunResultV1>;
}

export function nodeCommandRunnerV1(): CommandRunnerV1 {
  return {
    run: (request: CommandRunRequestV1) =>
      new Promise<CommandRunResultV1>((resolve) => {
        let stdout = "";
        let stderr = "";
        let settled = false;
        const finish = (result: CommandRunResultV1): void => {
          if (!settled) {
            settled = true;
            resolve(result);
          }
        };
        let child;
        try {
          child = spawn(request.command, [...request.args], {
            stdio: ["pipe", "pipe", "pipe"],
            shell: false,
            windowsHide: true,
          });
        } catch {
          finish({
            exitCode: null,
            signal: null,
            stdout: "",
            stderr: "",
            timedOut: false,
          });
          return;
        }
        const timer = setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            /* process already gone */
          }
          finish({
            exitCode: null,
            signal: "SIGKILL",
            stdout,
            stderr,
            timedOut: true,
          });
        }, request.timeoutMs);
        child.stdout.on("data", (chunk: Buffer | string) => {
          const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
          if (stdout.length < MAX_OUTPUT_BYTES) {
            stdout += text.slice(0, MAX_OUTPUT_BYTES - stdout.length);
          }
        });
        child.stderr.on("data", (chunk: Buffer | string) => {
          const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
          if (stderr.length < MAX_OUTPUT_BYTES) {
            stderr += text.slice(0, MAX_OUTPUT_BYTES - stderr.length);
          }
        });
        child.on("error", () => {
          clearTimeout(timer);
          finish({
            exitCode: null,
            signal: null,
            stdout,
            stderr,
            timedOut: false,
          });
        });
        child.on("close", (code: number | null, signal: string | null) => {
          clearTimeout(timer);
          finish({
            exitCode: code,
            signal,
            stdout,
            stderr,
            timedOut: false,
          });
        });
        if (request.stdinText.length > 0) {
          try {
            child.stdin.write(request.stdinText);
          } catch {
            /* reader already gone; close event reports the outcome */
          }
        }
        try {
          child.stdin.end();
        } catch {
          /* already closed */
        }
      }),
  };
}

export interface AvailabilityCheckV1 {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface AvailabilityReportV1 {
  readonly status: "AVAILABLE" | "UNAVAILABLE";
  readonly checks: readonly AvailabilityCheckV1[];
  readonly reasons: readonly string[];
  readonly mutations: readonly string[];
}

export interface AvailabilityProbeInputV1 {
  readonly repoRoot: string;
  readonly interpreterCandidates: readonly string[];
  readonly adbCandidates: readonly string[];
  readonly sidecarScriptPath: string;
  readonly requestId: string;
  readonly versionTimeoutMs: number;
  readonly handshakeTimeoutMs: number;
  readonly runner: CommandRunnerV1;
}

interface InterpreterIdentity {
  readonly path: string;
  readonly major: number;
  readonly minor: number;
  readonly micro: number;
}

function parsePythonVersion(output: string): InterpreterIdentity | null {
  const match = /Python (\d+)\.(\d+)\.(\d+)/u.exec(output);
  if (match === null || match.length < 4) return null;
  const major = Number.parseInt(match[1] as string, 10);
  const minor = Number.parseInt(match[2] as string, 10);
  const micro = Number.parseInt(match[3] as string, 10);
  if (!Number.isInteger(major) || !Number.isInteger(minor) || !Number.isInteger(micro)) {
    return null;
  }
  return { path: "", major, minor, micro };
}

function parseAdbVersion(output: string): string | null {
  const match = /Android Debug Bridge version ([A-Za-z0-9._-]+)/u.exec(output);
  if (match === null || match.length < 2) return null;
  return match[1] as string;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function checkDonorSnapshot(repoRoot: string): AvailabilityCheckV1 {
  const vendorRoot = join(repoRoot, "vendor", "google-artemis");
  const licensePath = join(vendorRoot, "LICENSE");
  const provenancePath = join(repoRoot, "docs", "mobile", "artemis-a0-provenance.json");
  if (!isDirectory(vendorRoot)) {
    return { name: "donor_snapshot", ok: false, detail: "vendor snapshot missing" };
  }
  if (!isFile(licensePath)) {
    return { name: "donor_snapshot", ok: false, detail: "donor LICENSE missing" };
  }
  try {
    const provenance = JSON.parse(readFileSync(provenancePath, "utf8")) as Record<
      string,
      unknown
    >;
    if (provenance["upstream_commit_sha"] !== MOBILE_ARTEMIS_DONOR_SHA) {
      return {
        name: "donor_snapshot",
        ok: false,
        detail: "provenance donor sha mismatch",
      };
    }
  } catch {
    return {
      name: "donor_snapshot",
      ok: false,
      detail: "provenance record unreadable",
    };
  }
  return { name: "donor_snapshot", ok: true, detail: "pinned snapshot present" };
}

function checkHandshakeResponse(
  stdout: string,
): { readonly ok: boolean; readonly reason: string } {
  let response: unknown;
  try {
    response = JSON.parse(stdout.trim().split("\n")[0] as string) as unknown;
  } catch {
    return { ok: false, reason: "MALFORMED_RESPONSE" };
  }
  if (typeof response !== "object" || response === null || Array.isArray(response)) {
    return { ok: false, reason: "MALFORMED_RESPONSE" };
  }
  const record = response as Record<string, unknown>;
  if (record["protocol_version"] !== 1) {
    return { ok: false, reason: "PROTOCOL_SKEW" };
  }
  if (record["status"] !== "READY") {
    return { ok: false, reason: "STATUS_NOT_READY" };
  }
  if (record["sidecar_version"] !== MOBILE_SIDECAR_VERSION) {
    return { ok: false, reason: "VERSION_SKEW" };
  }
  if (record["donor_sha_pinned"] !== MOBILE_ARTEMIS_DONOR_SHA) {
    return { ok: false, reason: "DONOR_SKEW" };
  }
  return { ok: true, reason: "READY" };
}

export async function probeMobileSidecarAvailabilityV1(
  input: AvailabilityProbeInputV1,
): Promise<AvailabilityReportV1> {
  const checks: AvailabilityCheckV1[] = [];
  const reasons: string[] = [];

  const donorCheck = checkDonorSnapshot(input.repoRoot);
  checks.push(donorCheck);
  if (!donorCheck.ok) reasons.push("DONOR_UNAVAILABLE");

  let interpreter: InterpreterIdentity | null = null;
  let interpreterDetail = "no interpreter candidate executed";
  for (const candidate of input.interpreterCandidates) {
    const result = await input.runner.run({
      command: candidate,
      args: ["--version"],
      stdinText: "",
      timeoutMs: input.versionTimeoutMs,
    });
    const parsed = parsePythonVersion(result.stdout + "\n" + result.stderr);
    if (result.exitCode === 0 && parsed !== null) {
      interpreter = {
        path: candidate,
        major: parsed.major,
        minor: parsed.minor,
        micro: parsed.micro,
      };
      interpreterDetail =
        candidate + " Python " + parsed.major + "." + parsed.minor + "." + parsed.micro;
      break;
    }
    interpreterDetail = candidate + " unusable";
  }
  const pinOk =
    interpreter !== null &&
    interpreter.major === MOBILE_PYTHON_PIN_MAJOR &&
    interpreter.minor === MOBILE_PYTHON_PIN_MINOR;
  checks.push({
    name: "interpreter",
    ok: interpreter !== null,
    detail: interpreterDetail,
  });
  checks.push({
    name: "interpreter_pin",
    ok: pinOk,
    detail: pinOk ? "python 3.12 release pin satisfied" : "python 3.12 release pin not satisfied",
  });
  if (interpreter === null) reasons.push("INTERPRETER_UNAVAILABLE");
  if (interpreter !== null && !pinOk) reasons.push("INTERPRETER_PIN_MISMATCH");

  let handshakeOk = false;
  if (interpreter !== null) {
    const requestLine =
      JSON.stringify({
        protocol_version: 1,
        command: "handshake",
        request_id: input.requestId,
      }) + "\n";
    const result = await input.runner.run({
      command: interpreter.path,
      args: [input.sidecarScriptPath],
      stdinText: requestLine,
      timeoutMs: input.handshakeTimeoutMs,
    });
    if (result.timedOut) {
      checks.push({ name: "sidecar_handshake", ok: false, detail: "HANDSHAKE_TIMEOUT" });
      reasons.push("HANDSHAKE_TIMEOUT");
    } else if (result.exitCode !== 0) {
      checks.push({
        name: "sidecar_handshake",
        ok: false,
        detail: "sidecar exit " + String(result.exitCode),
      });
      reasons.push("SIDECAR_EXIT");
    } else {
      const verdict = checkHandshakeResponse(result.stdout);
      checks.push({
        name: "sidecar_handshake",
        ok: verdict.ok,
        detail: verdict.ok
          ? "stdio handshake READY"
          : "handshake rejected: " + verdict.reason,
      });
      if (verdict.ok) {
        handshakeOk = true;
      } else {
        reasons.push(verdict.reason);
      }
    }
  } else {
    checks.push({
      name: "sidecar_handshake",
      ok: false,
      detail: "skipped without interpreter",
    });
    reasons.push("HANDSHAKE_SKIPPED");
  }

  let adbDetail = "adb binary not found";
  let adbPresent = false;
  for (const candidate of input.adbCandidates) {
    const result = await input.runner.run({
      command: candidate,
      args: ["version"],
      stdinText: "",
      timeoutMs: input.versionTimeoutMs,
    });
    const version = parseAdbVersion(result.stdout + "\n" + result.stderr);
    if (result.exitCode === 0 && version !== null) {
      adbPresent = true;
      adbDetail = candidate + " version " + version;
      break;
    }
  }
  checks.push({ name: "adb_binary", ok: adbPresent, detail: adbDetail });

  const available = donorCheck.ok && interpreter !== null && pinOk && handshakeOk;
  return {
    status: available ? "AVAILABLE" : "UNAVAILABLE",
    checks,
    reasons,
    mutations: [],
  };
}
