import { describe, expect, it } from "vitest";
import {
  SENTRDEL_CONFIG_PRESENCE_SIGNALS,
  classifySentrdelConfigPresencePathV1,
  normalizeSentrdelConfigPresenceV1,
  validateSentrdelConfigPresenceInputV1,
  type SentrdelConfigPresenceInputV1,
} from "../src/assurance/security/sentrdel-config-presence.js";
import { SENTRDEL_ENGINE_ID, SENTRDEL_ENGINE_VERSION } from "../src/assurance/security/sentrdel-engine-boundary.js";
import { SENTRDEL_PINNED_REVISION, SENTRDEL_PINNED_TREE } from "../src/assurance/security/sentrdel-source-pin.js";

function input(extra: Record<string, unknown> = {}): SentrdelConfigPresenceInputV1 {
  return {
    schema_version: 1, request_id: "request:ci", attempt_id: "attempt:1",
    source_head: "a".repeat(40), engine_id: SENTRDEL_ENGINE_ID,
    engine_pin: SENTRDEL_PINNED_REVISION, engine_tree: SENTRDEL_PINNED_TREE,
    engine_version: SENTRDEL_ENGINE_VERSION, capability_id: "config-inspection",
    path: ".gitlab-ci.yml", signal: "gitlab-ci",
    producer_id: "producer:sentrdel", evidence_ref: "evidence:fixture",
    evidence_digest: "b".repeat(64), ...extra,
  } as SentrdelConfigPresenceInputV1;
}

describe("UA-P06-T09B pinned static CI/MCP presence", () => {
  it("classifies only the pinned donor source's path-only signals", () => {
    const fixtures = [
      [".github/workflows/check.yml", "github-actions"],
      ["root/.gitlab-ci.yaml", "gitlab-ci"],
      ["build/azure-pipelines.yml", "azure-pipelines"],
      ["Jenkinsfile", "jenkins"],
      ["ci/Jenkinsfile", "jenkins"],
      [".circleci/config.yaml", "circleci"],
      [".mcp.json", "mcp-json"],
      ["mcp.json", "mcp-json"],
      [".cursor/mcp.json", "cursor-mcp"],
      [".vscode/mcp.json", "vscode-mcp"],
      [".claude/mcp.json", "claude-mcp"],
      ["supabase/config.toml", "supabase-config"],
      ["supabase/seed.sql", "supabase-seed"],
      ["supabase/migrations/20261008_init.sql", "supabase-migration"],
      ["supabase/functions/webhook/index.ts", "supabase-function"],
    ] as const;
    for (const [path, signal] of fixtures) {
      expect(classifySentrdelConfigPresencePathV1(path)).toContain(signal);
      const record = normalizeSentrdelConfigPresenceV1(input({ path, signal }));
      expect(record.path).toBe(path);
      expect(record.signal).toBe(signal);
      expect(record.authority).toBe("STATIC_PRESENCE_ONLY");
      expect(record.assurance_effect).toBe("NONE");
      expect(record.producer_execution_attested).toBe(false);
      expect(record.ci_security_scanned).toBe(false);
      expect(record.hosted_posture_verified).toBe(false);
      expect(record.finding_emitted).toBe(false);
    }
    expect(SENTRDEL_CONFIG_PRESENCE_SIGNALS).toHaveLength(13);
  });

  it("rejects false positive paths and traversal", () => {
    for (const path of [
      "docs/.github/workflows/check.yml", "ci/gitlab.yaml",
      ".circleci/fake.txt", "docs/mcp.json", ".cursor/config.json",
      "ci/test.yml", "../.gitlab-ci.yml",
      "folder/../Jenkinsfile", "/Jenkinsfile", "C:/Jenkinsfile",
      ".claude/../mcp.json", "src//Jenkinsfile", "config.txt",
      ".github/workflows/run.json", ".circleci/config.yaml/extra",
      "docs/supabase/config.toml", "supabase/migrations/dir/nested.sql",
      "supabase/functions/worker", "supabase/migrations/init.txt",
      "supabase/functions.txt", "supabase/seed.csv",
    ]) {
      expect(classifySentrdelConfigPresencePathV1(path)).toEqual([]);
      expect(validateSentrdelConfigPresenceInputV1(input({ path }))).not.toEqual([]);
    }
  });

  it("never invents coverage, verified security, or runtime execution", () => {
    const value = normalizeSentrdelConfigPresenceV1(input());
    expect(value.phase_authority).toBe("UA-P06-T09");
    expect(value.repository_total).toBe(false);
    expect(value.configuration_contents_scanned).toBe(false);
    expect(value.security_rule_executed).toBe(false);
    expect(value.claim_assessment_emitted).toBe(false);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.provenance)).toBe(true);
    expect(JSON.stringify(value)).not.toMatch(/"PASS"|"SUPPORTED"|"VERIFIED"/u);
  });

  it("binds stable identity to producer, evidence and source", () => {
    const value = normalizeSentrdelConfigPresenceV1(input());
    expect(value).toEqual(normalizeSentrdelConfigPresenceV1(input()));
    for (const modification of [
      { source_head: "c".repeat(40) }, { producer_id: "producer:other" },
      { evidence_ref: "evidence:other" }, { evidence_digest: "d".repeat(64) },
      { path: "ci/Jenkinsfile", signal: "jenkins" },
    ]) {
      expect(normalizeSentrdelConfigPresenceV1(input(modification)).identity).not.toBe(value.identity);
    }
  });

  it("refuses unqualified engine identities, scope promotions, and secrets", () => {
    const invalid = [
      { schema_version: 2 }, { engine_pin: "a".repeat(40) },
      { engine_tree: "b".repeat(40) }, { engine_id: "engine:fake" },
      { engine_version: "1.0" }, { capability_id: "iac-generic" },
      { source_head: "broken" }, { producer_id: "" },
      { evidence_ref: "" }, { evidence_digest: "bad" },
      { signal: "circleci" }, { signal: "fake-ci" }, { signal: "github-actions" },
      { security_verdict: "PASS" }, { severity: "critical" },
      { execution_state: "EXECUTED" }, { hosted_state: "SECURE" },
      { producer_id: "ghp_" + "x".repeat(36) },
      { request_id: "-----BEGIN PRIVATE KEY-----" },
    ];
    for (const change of invalid) {
      const result = validateSentrdelConfigPresenceInputV1(input(change));
      expect(result.length, JSON.stringify(change)).toBeGreaterThan(0);
      expect(() => normalizeSentrdelConfigPresenceV1(input(change))).toThrow(TypeError);
    }
  });

  it("rejects null/array/scalar and malformed observations", () => {
    for (const value of [null, undefined, [], 0, "string"]) {
      expect(validateSentrdelConfigPresenceInputV1(value).length).toBeGreaterThan(0);
    }
  });
});
