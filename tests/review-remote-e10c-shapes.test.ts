import { describe, expect, it, vi } from "vitest";

// Remote review's two outside edges, exercised without the outside world: every result shape the
// Gitleaks engine can return, and a provider that never answers. The real engine and real TLS are
// covered in the -io and -tls suites, which need Gitleaks and OpenSSL; these run everywhere.
let gitleaksOutcome: () => Promise<unknown> = async () => ({ kind: "unavailable" });
vi.mock("../src/assurance/security/security-gitleaks.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/assurance/security/security-gitleaks.js")>()),
  runSecurityGitleaksV1: () => gitleaksOutcome(),
}));

let destroyed: unknown[] = [];
vi.mock("node:https", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:https")>();
  const { EventEmitter } = await import("node:events");
  return {
    ...actual,
    // A provider that accepts the request and never answers.
    request: () => {
      const req = new EventEmitter() as EventEmitter & { destroy: (error?: Error) => void; end: () => void };
      req.destroy = (error) => {
        destroyed.push(error?.message);
      };
      req.end = () => undefined;
      return req;
    },
  };
});

const { httpsTransportV1, scanRemotePayloadV1 } = await import("../src/assurance/review/remote-review.js");

const report = (overrides: Record<string, unknown>) => ({
  kind: "report",
  report: { engine: { executed: true }, findings: [], reason_code: "COVERAGE_UNPROVEN", ...overrides },
});
const sections = [{ path: "src/a.ts", text: "const a = 1;\n" }, { path: "deep/b c.tf", text: "b\n" }];
const scan = () => scanRemotePayloadV1(sections, process.execPath, undefined, process.cwd());

describe("the payload scan accepts exactly one clean shape", () => {
  it("is clean only when Gitleaks ran to the end and found nothing", async () => {
    gitleaksOutcome = async () => report({});
    expect(await scan()).toEqual({ kind: "clean" });
  });

  it.each([
    ["no report", { kind: "error", message: "x" }],
    ["an engine that didn't run", report({ engine: { executed: false } })],
  ])("refuses as unavailable for %s", async (_label, outcome) => {
    gitleaksOutcome = async () => outcome;
    expect(await scan()).toMatchObject({ kind: "unavailable", reason: expect.stringContaining("did not run") });
  });

  it("refuses a run that didn't finish, such as output over the cap", async () => {
    gitleaksOutcome = async () => report({ reason_code: "OUTPUT_LIMIT" });
    expect(await scan()).toMatchObject({ kind: "unavailable", reason: expect.stringContaining("did not complete (OUTPUT_LIMIT)") });
  });

  it("names the original files behind each hit, whatever the path separator", async () => {
    gitleaksOutcome = async () => report({ findings: [{ path: "section-0002\\b_c.tf" }, { path: "section-0001/other.ts" }, { path: "elsewhere" }] });
    expect(await scan()).toEqual({ kind: "hits", files: ["deep/b c.tf"] });
  });

  it("refuses when the scan itself throws", async () => {
    gitleaksOutcome = async () => {
      throw new Error("boom");
    };
    expect(await scan()).toEqual({ kind: "unavailable", reason: "the payload secret scan could not be prepared" });
  });
});

describe("the HTTPS transport's overall deadline", () => {
  it("gives up on a provider that never answers and reports no reply", async () => {
    destroyed = [];
    const reply = await httpsTransportV1({
      address: "93.184.216.34",
      family: 4,
      endpoint: { url: "https://api.example.com/v1", hostname: "api.example.com", port: 443, path: "/v1" },
      headers: {},
      body: "{}",
      timeoutMs: 50,
      maxBytes: 1024,
      signal: new AbortController().signal,
    });
    expect(reply).toEqual({ status: 0, text: null });
    expect(destroyed).toEqual(["deadline"]);
  });
});
