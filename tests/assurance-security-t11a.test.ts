import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SENTRDEL_SARIF_LIMITS, importSentrdelSarifV1 } from "../src/assurance/security/sentrdel-sarif-import.js";

function result(extra: Record<string, unknown> = {}) {
  return {
    ruleId: "js/sql-injection", level: "warning", message: { text: "Query built from user input" },
    locations: [{ physicalLocation: { artifactLocation: { uri: "src/db/query.ts" }, region: { startLine: 12, startColumn: 3 } } }],
    ...extra,
  };
}

function log(results: unknown[] = [result()], driver: Record<string, unknown> = { name: "codeql", semanticVersion: "2.19.0" }) {
  return { version: "2.1.0", runs: [{ tool: { driver }, results }] };
}

function binding(sarif: unknown, extra: Record<string, unknown> = {}) {
  const sarif_text = typeof sarif === "string" ? sarif : JSON.stringify(sarif);
  return {
    schema_version: 1, source_head: "a".repeat(40), request_id: "request:t11", attempt_id: "attempt:1",
    producer_id: "producer:codeql", evidence_ref: "evidence:sarif",
    evidence_digest: createHash("sha256").update(sarif_text, "utf8").digest("hex"), sarif_text, ...extra,
  };
}

const refuse = (input: unknown, name: string) => expect(() => importSentrdelSarifV1(input), name).toThrow(TypeError);

describe("UA-P06-T11A SARIF import boundary", () => {
  it("imports results as inference-class interchange, never as truth or severity", () => {
    const imported = importSentrdelSarifV1(binding(log()));
    expect(imported.observations).toHaveLength(1);
    const [obs] = imported.observations;
    expect(obs).toMatchObject({
      rule_id: "js/sql-injection", tool_name: "codeql", tool_version: "2.19.0", reported_level: "warning",
      message: "Query built from user input", epistemic_class: "INFERENCE", authority: "INTERCHANGE_IMPORT_ONLY",
      canonical_truth: false, severity_derived: false, finding_emitted: false, path_existence_verified: false,
    });
    expect(obs!.locations).toEqual([{ path: "src/db/query.ts", start_line: 12, start_column: 3, end_line: null, end_column: null }]);
    expect(imported).toMatchObject({ sarif_is_canonical_truth: false, empty_import_is_clean: false, assurance_effect: "NONE", findings_emitted: false });
    expect(Object.isFrozen(imported) && Object.isFrozen(imported.observations) && Object.isFrozen(obs!.locations[0])).toBe(true);
  });

  it("does not let SARIF pass, suppression, or baseline fields become a pass", () => {
    const passing = result({ kind: "pass", level: "none", suppressions: [{ kind: "inSource" }], baselineState: "absent" });
    const imported = importSentrdelSarifV1(binding(log([passing])));
    expect(imported.observations[0]!.epistemic_class).toBe("INFERENCE");
    expect(JSON.stringify(imported)).not.toMatch(/"(PASS|pass|CLEAN|VERIFIED|suppressed)"/u);
    const empty = importSentrdelSarifV1(binding(log([])));
    expect(empty.observations).toHaveLength(0);
    expect(empty.empty_import_is_clean).toBe(false);
  });

  it("follows donor fallbacks for tool version and message text", () => {
    const imported = importSentrdelSarifV1(binding(log(
      [result({ message: { text: "  ", markdown: "**Markdown** body" }, level: undefined, locations: undefined })],
      { name: "semgrep", semanticVersion: " ", version: "1.90.0" })));
    expect(imported.observations[0]).toMatchObject({ tool_version: "1.90.0", message: "**Markdown** body", reported_level: null, locations: [] });
    expect(importSentrdelSarifV1(binding(log([result()], { name: "tool" }))).observations[0]!.tool_version).toBeNull();
  });

  it("normalizes repository-relative paths and refuses escapes", () => {
    const path = (uri: string) => importSentrdelSarifV1(binding(log([result({
      locations: [{ physicalLocation: { artifactLocation: { uri } } }] })]))).observations[0]!.locations[0]!.path;
    expect(path("./src/%61pp.ts")).toBe("src/app.ts");
    expect(path("src\\win\\file.ts")).toBe("src/win/file.ts");
    for (const uri of ["/etc/passwd", "file:///etc/passwd", "C:/x.ts", "https://x/y", "../secret", "src/../../x", "src//x.ts",
      "src/x.ts?q=1", "src/x.ts#L1", "%E0%A4%A", " src/x.ts", "src/%0a.ts", "", "."]) {
      refuse(binding(log([result({ locations: [{ physicalLocation: { artifactLocation: { uri } } }] })])), uri);
    }
    refuse(binding(log([result({ locations: [{ physicalLocation: { artifactLocation: { uri: "x.ts", uriBaseId: "SRCROOT" } } }] })])), "uriBaseId");
    refuse(binding(log([result({ locations: [{ logicalLocations: [] }] })])), "logical only");
    refuse(binding(log([result({ locations: [{ physicalLocation: { artifactLocation: { uri: "x.ts" }, region: { startLine: 0 } } }] })])), "zero line");
  });

  it("binds the import to its evidence digest and pinned bounds", () => {
    const good = binding(log());
    refuse({ ...good, evidence_digest: "f".repeat(64) }, "digest mismatch");
    refuse({ ...good, sarif_text: good.sarif_text + " " }, "tampered text");
    refuse({ ...good, verdict: "PASS" }, "extra binding key");
    refuse({ ...good, source_head: "123" }, "bad head");
    refuse(binding("{not json"), "malformed");
    refuse(binding({ ...log(), version: "2.0.0" }), "version");
    refuse(binding({ version: "2.1.0", runs: Array.from({ length: 65 }, () => log().runs[0]) }), "too many runs");
    refuse(binding(log(Array.from({ length: SENTRDEL_SARIF_LIMITS.results + 1 }, () => result()))), "too many results");
    refuse(binding(log([result({ locations: Array.from({ length: 65 }, () => result().locations[0]) })])), "too many locations");
    refuse(binding("x".repeat(SENTRDEL_SARIF_LIMITS.bytes + 1)), "oversize");
  });

  it("refuses missing identities, invalid text, and secret or self-attesting content", () => {
    const cases: Array<[string, unknown]> = [
      ["no ruleId", log([result({ ruleId: " " })])], ["padded ruleId", log([result({ ruleId: " r" })])],
      ["no message", log([result({ message: {} })])], ["control message", log([result({ message: { text: "a\u0007b" } })])],
      ["C1 control message", log([result({ message: { text: "a\u009b31mb" } })])],
      ["unknown level", log([result({ level: "critical" })])], ["no driver", { version: "2.1.0", runs: [{ results: [] }] }],
      ["bad tool name", log([], { name: "" })], ["non-array results", { version: "2.1.0", runs: [{ tool: { driver: { name: "t" } }, results: {} }] }],
      ["secret message", log([result({ message: { text: "token AKIA" + "Q".repeat(16) } })])],
      ["secret path", log([result({ locations: [{ physicalLocation: { artifactLocation: { uri: "ghp_" + "x".repeat(36) } } }] })])],
    ];
    for (const [name, sarif] of cases) refuse(binding(sarif), name);
  });

  it("is deterministic and identity-bound", () => {
    const first = importSentrdelSarifV1(binding(log()));
    expect(importSentrdelSarifV1(binding(log()))).toEqual(first);
    expect(importSentrdelSarifV1(binding(log(), { source_head: "b".repeat(40) })).observations[0]!.observation_id)
      .not.toBe(first.observations[0]!.observation_id);
  });
});
