import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { redactLocalPathFromError } from "../src/cli.js";

const WINDOWS = process.platform === "win32";

let root: string;

beforeEach(() => {
  root = realpathSync.native(mkdtempSync(join(tmpdir(), "ascout-error-redaction-")));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("redactLocalPathFromError", () => {
  it("hides the on-disk root in an error message", () => {
    const message = redactLocalPathFromError(new Error(`not a directory: ${join(root, ".ascout")}`), root);
    expect(message).not.toContain(root);
    expect(message).toContain("<repository>");
  });

  it.skipIf(!WINDOWS)("hides the root whatever its case, as Windows paths ignore case", () => {
    const typed = root.toLowerCase();
    const message = redactLocalPathFromError(new Error(`not a directory: ${root.toUpperCase()}\\.ascout`), typed);
    expect(message.toLowerCase()).not.toContain(typed);
  });

  it.skipIf(!WINDOWS)("hides the root written with forward slashes", () => {
    const forward = root.split("\\").join("/");
    const message = redactLocalPathFromError(new Error(`failed at ${forward}/.ascout`), root);
    expect(message).not.toContain(forward);
  });

  it("leaves other paths alone", () => {
    const other = join(tmpdir(), "somewhere-else");
    expect(redactLocalPathFromError(new Error(`failed at ${other}`), root)).toContain(other);
  });
});
