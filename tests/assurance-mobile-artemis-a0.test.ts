import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const VENDOR_ROOT = join(REPO_ROOT, "vendor", "google-artemis");
const PROVENANCE_PATH = join(
  REPO_ROOT,
  "docs",
  "mobile",
  "artemis-a0-provenance.json",
);
const VITEST_CONFIG_PATH = join(REPO_ROOT, "vitest.config.ts");

const EXPECTED_SHA = "371aa6df56880643da57b30da936e9812fb0ec66";
const EXPECTED_TREE = "697c3fe48b51b8453938989f383b4a8471a4f5a1";

function listFilesRecursive(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

describe("ARTEMIS-A0 Full immutable donor intake", () => {
  it("presents the complete pinned donor snapshot with no floating ref", () => {
    const vendorStat = statSync(VENDOR_ROOT);
    expect(vendorStat.isDirectory()).toBe(true);

    const files = listFilesRecursive(VENDOR_ROOT);
    expect(files.length).toBe(796);

    const provenance = JSON.parse(readFileSync(PROVENANCE_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    expect(provenance.upstream_repository).toBe(
      "https://github.com/google/artemis",
    );
    expect(provenance.upstream_commit_sha).toBe(EXPECTED_SHA);
    expect(provenance.upstream_tree).toBe(EXPECTED_TREE);
    expect(provenance.blob_paths).toBe(796);
    expect(provenance.floating_upstream_dependency).toBe(false);
    expect(provenance.runtime_activated).toBe(false);
  });

  it("preserves donor license and notices without granting runtime authority", () => {
    const license = readFileSync(join(VENDOR_ROOT, "LICENSE"), "utf8");
    expect(license).toContain("Apache License");
    expect(license.length).toBeGreaterThan(1000);

    const provenance = JSON.parse(readFileSync(PROVENANCE_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    expect(provenance.upstream_license).toBe("Apache-2.0");
    expect(provenance.network_authority).toBe(false);
    expect(provenance.provider_authority).toBe(false);
    expect(provenance.adb_mutation_authority).toBe(false);

    expect(() =>
      statSync(join(VENDOR_ROOT, ".git")),
    ).toThrow();
  });
});

describe("ARTEMIS-A0 vendor-aware Vitest discovery scoping", () => {
  it("scopes the Ascout root Vitest lane away from vendor/** while preserving defaults", () => {
    const configText = readFileSync(VITEST_CONFIG_PATH, "utf8");
    expect(configText).toContain("configDefaults");
    expect(configText).toContain("vendor/**");
    expect(configText).toContain("exclude");
  });

  it("keeps donor-local test suites on disk instead of deleting them for green CI", () => {
    const donorSpecs = listFilesRecursive(VENDOR_ROOT).filter(
      (path) => path.endsWith(".spec.ts"),
    );
    expect(donorSpecs.length).toBeGreaterThan(0);
    expect(
      donorSpecs.every((path) =>
        path.startsWith(VENDOR_ROOT + sep),
      ),
    ).toBe(true);
  });

  it("runs the Ascout A0 proof from the Ascout-owned lane, not from vendor/**", () => {
    expect(HERE.startsWith(VENDOR_ROOT + sep)).toBe(false);
  });
});
