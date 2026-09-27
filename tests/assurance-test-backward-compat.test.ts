import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const FIXTURE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

// Byte-exact SHA-256 pins over LF-normalized fixture content. Rationale:
// git checkout line-ending conversion (CRLF on some Windows runners)
// changes working-tree bytes without changing fixture content, so the
// sentinel normalizes CRLF to LF before hashing. A content mutation of
// any fixture still breaks the pin on every platform.
const GOLDEN_FIXTURE_DIGESTS: Readonly<Record<string, string>> = {
  "admission/cases.json":
    "c2be0e67482f65527c91321f878380f674a0c3c146dd7a41d78c7fb6e9b8976f",
  "missing-capability/cases.json":
    "a1991ff4e7340c4d57c1b71db343dc1244be353601864b01b4168441efae655f",
  "agent-integration/cases.json":
    "cf2e02d965ef97696517f69deabbc2ce6b98282ef7b5b4ea4dd2146df94b7016",
  "discovery/cases.json":
    "78e750d5d233ec54bb74eb67334b303bd399b148c08348fa55a8d829fd20c1ea",
  "vitest/cases.json":
    "b0b16bbc1f5b69f38cc6d51e44ea84ecb2ce9de82856b959fa0d9557c447d6a6",
  "jest/cases.json":
    "0a976ad3aee2e1242bef30c30d8ba1368b50d959b70fc3fa1f42585b48e03f75",
  "jest/full-results.json":
    "e287ed2b70a38938f57b9cd4bb43c738c2ac4408f2ca61c750f7bd8d51d78888",
  "jest/related-results.json":
    "a655f1aa2882e80ab1cc02645259443ae36f4f2eeadadd0980eca7bd44a5167f",
  "lcov/cases.json":
    "b0847b78955707b110cc152ee971dfa5deb8acf4213ca69977f54bb21c5ef043",
  "lcov/branch-cases.json":
    "0a71cb00367a5eba6927cc612970f53ad9e5362b4eeeddba8b32da168beca01b",
  "receipt-v1-pre-spec005.schema.json":
    "a01c096916bc92e6c916eff57149c7162f38a6b6d1f165a62c03cb876ff7741a",
};

function sha256HexOfFixture(relativePath: string): string {
  const bytes = readFileSync(join(FIXTURE_ROOT, relativePath));
  const normalized = bytes.toString("utf8").split(/\r?\n/).join("\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

describe("UA-P05-T11 backward compatibility sentinel", () => {
  it("keeps every existing check golden fixture byte-exact", () => {
    for (const [relativePath, expectedDigest] of Object.entries(
      GOLDEN_FIXTURE_DIGESTS,
    )) {
      expect(sha256HexOfFixture(relativePath)).toBe(expectedDigest);
    }
  });

  it("keeps the receipt schema fixture parseable as JSON", () => {
    const schema = JSON.parse(
      readFileSync(
        join(FIXTURE_ROOT, "receipt-v1-pre-spec005.schema.json"),
        "utf8",
      ),
    ) as { title?: string };
    expect(typeof schema).toBe("object");
  });
});
