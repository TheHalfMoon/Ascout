import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, { version?: string; license?: string; resolved?: string; integrity?: string }>;
};
const notices = readFileSync(new URL("../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");
const declared = Object.entries({ ...manifest.dependencies, ...manifest.devDependencies });

describe("direct dependency notice integrity", () => {
  it("requires a nonempty direct-dependency set to prevent vacuous success", () => {
    expect(declared.length).toBeGreaterThan(0);
  });

  for (const [name, version] of declared) {
    it(`contains exact provenance for ${name}@${version}`, () => {
      const locked = lock.packages[`node_modules/${name}`];
      expect(locked).toBeDefined();
      expect(locked?.version).toBe(version);

      const heading = `### \`${name}\` ${version}`;
      const start = notices.indexOf(heading);
      expect(start).toBeGreaterThanOrEqual(0);

      const next = notices.indexOf("\n### ", start + heading.length);
      const section = notices.slice(start, next < 0 ? undefined : next);
      expect(locked?.license).toBeTruthy();
      expect(locked?.resolved).toBeTruthy();
      expect(locked?.integrity).toBeTruthy();
      expect(section).toContain(`License: ${locked?.license}`);
      expect(section).toContain(locked?.resolved);
      expect(section).toContain(locked?.integrity);
    });
  }
});
