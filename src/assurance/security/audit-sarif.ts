import { ASCOUT_PACKAGE_VERSION } from "../../version.js";
import { SECURITY_RULES_CATALOG_V1, type SecuritySeverityV1 } from "./audit-rules.js";
import type { SecurityAuditReportV3 } from "./audit-engine.js";

function sarifLevelForSeverity(severity: SecuritySeverityV1): "error" | "warning" | "note" {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium") return "warning";
  return "note";
}

/**
 * Renders a deterministic, Ascout-native SARIF 2.1.0 document from a `SecurityAuditReportV3`.
 * Never embeds plaintext secrets and preserves Ascout's honesty properties (static coverage is
 * partial, SARIF is interchange only, and zero findings is never a vulnerability-free claim).
 */
export function renderSecurityAuditSarifV1(report: SecurityAuditReportV3): string {
  const usedRuleIds = new Set(report.findings.map((finding) => finding.rule_id));
  const catalogById = new Map(SECURITY_RULES_CATALOG_V1.map((rule) => [rule.rule_id, rule]));
  const rules = [...usedRuleIds]
    .sort()
    .map((ruleId) => {
      const def = catalogById.get(ruleId);
      if (def !== undefined) {
        return {
          id: def.rule_id,
          name: def.name,
          shortDescription: { text: def.summary },
          defaultConfiguration: { level: sarifLevelForSeverity(def.severity) },
          properties: { cwe: def.cwe, severity: def.severity },
        };
      }
      return {
        id: ruleId,
        name: ruleId,
        shortDescription: { text: `Security finding reported under rule ${ruleId}.` },
        defaultConfiguration: { level: "error" as const },
        properties: { cwe: "CWE-798", severity: "critical" },
      };
    });

  const results = report.findings.map((finding) => ({
    ruleId: finding.rule_id,
    level: sarifLevelForSeverity(finding.severity),
    message: { text: `${finding.message} Remediation: ${finding.remediation}` },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: finding.path },
          region: {
            startLine: finding.start_line,
            endLine: finding.end_line,
          },
        },
      },
    ],
    partialFingerprints: {
      primaryLocationLineHash: finding.finding_id,
    },
    properties: {
      cwe: finding.cwe,
      severity: finding.severity,
      confidence: finding.confidence,
      category: finding.category,
    },
  }));

  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Ascout",
            informationUri: "https://github.com/TheHalfMoon/Ascout",
            semanticVersion: ASCOUT_PACKAGE_VERSION,
            rules,
          },
        },
        results,
        properties: {
          ascout_engine_id: report.engine.id,
          ascout_outcome: report.outcome,
          ascout_source_head: report.source?.head_sha ?? null,
          ascout_tree_digest: report.source?.tree_digest ?? null,
          ascout_coverage_total: false,
          ascout_security_pass: false,
          ascout_clean_claimed: false,
          ascout_sarif_is_canonical_truth: false,
        },
      },
    ],
  };
  return `${JSON.stringify(sarif, null, 2)}\n`;
}
