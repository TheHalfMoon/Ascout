import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { httpsTransportV1 } from "../src/assurance/review/remote-review.js";

vi.setConfig({ testTimeout: 60_000 });

// The real HTTPS transport against a loopback TLS server. The certificate is generated at run time
// (no private key is committed) and is not trusted, so every request fails TLS. The server still
// records which name the client asked for, which proves the client connected to the pinned address
// with the configured host as its TLS name, directly, whatever the proxy variables say.
const OPENSSL = spawnSync("openssl", ["version"], { encoding: "utf8" }).status === 0;
let dir = "";
let server: Server | null = null;
let port = 0;
const names: string[] = [];

beforeAll(async () => {
  if (!OPENSSL) return;
  dir = mkdtempSync(join(tmpdir(), "ascout-e10c-tls-"));
  const made = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=api.example.com", "-keyout", join(dir, "key.pem"), "-out", join(dir, "cert.pem")], { encoding: "utf8" });
  if (made.status !== 0) throw new Error(made.stderr);
  server = createServer({
    key: readFileSync(join(dir, "key.pem")),
    cert: readFileSync(join(dir, "cert.pem")),
    SNICallback: (servername, callback) => {
      names.push(servername);
      callback(null);
    },
  }, (_req, res) => res.end("{}"));
  await new Promise<void>((resolveListen) => server!.listen(0, "127.0.0.1", () => resolveListen()));
  port = (server!.address() as { port: number }).port;
});

afterAll(() => {
  server?.close();
  if (dir !== "") rmSync(dir, { recursive: true, force: true });
});

describe.runIf(OPENSSL)("the HTTPS transport over real TLS", () => {
  it("connects to the pinned address with the host as its TLS name, ignores proxies, and refuses an untrusted certificate", async () => {
    vi.stubEnv("HTTPS_PROXY", "http://127.0.0.1:9");
    vi.stubEnv("NODE_USE_ENV_PROXY", "1");
    vi.stubEnv("NODE_TLS_REJECT_UNAUTHORIZED", "0");
    names.length = 0;
    const reply = await httpsTransportV1({
      address: "127.0.0.1",
      family: 4,
      endpoint: { url: `https://api.example.com:${port}/v1`, hostname: "api.example.com", port, path: "/v1" },
      headers: {},
      body: "{}",
      timeoutMs: 10_000,
      maxBytes: 1024,
      signal: new AbortController().signal,
    });
    vi.unstubAllEnvs();
    // The server saw the configured host, so the client reached it directly at the pinned address.
    expect(names).toContain("api.example.com");
    // The certificate isn't trusted, and NODE_TLS_REJECT_UNAUTHORIZED=0 can't change that.
    expect(reply).toEqual({ status: 0, text: null });
  });
});
