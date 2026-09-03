import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fsControl = vi.hoisted(() => ({
  beforeOpen: null as (() => void) | null,
  afterFirstFstat: null as (() => void) | null,
  fstatCalls: 0,
  readCalls: 0,
}));

vi.mock("node:fs", async (importOriginal: () => Promise<typeof import("node:fs")>) => {
  const actual = await importOriginal();
  const openSync = ((...args: unknown[]) => {
    fsControl.beforeOpen?.();
    return (actual.openSync as unknown as (...values: unknown[]) => number)(...args);
  }) as unknown as typeof actual.openSync;
  const fstatSync = ((...args: unknown[]) => {
    const result = (actual.fstatSync as unknown as (...values: unknown[]) => unknown)(...args);
    fsControl.fstatCalls += 1;
    if (fsControl.fstatCalls === 1) fsControl.afterFirstFstat?.();
    return result;
  }) as unknown as typeof actual.fstatSync;
  const readSync = ((...args: unknown[]) => {
    fsControl.readCalls += 1;
    return (actual.readSync as unknown as (...values: unknown[]) => number)(...args);
  }) as unknown as typeof actual.readSync;
  return { ...actual, openSync, fstatSync, readSync };
});

import {
  EnvironmentIdentityIntegrityError,
  observeEnvironment,
} from "../src/environment.js";
import {
  discoverProjectFromFiles,
  type DiscoveryFileMap,
  type ProjectDiscovery,
} from "../src/discovery.js";

const roots: string[] = [];

function makeRoot(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "ascout-t105-")));
  roots.push(root);
  return root;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function lockfileAuthority(
  manager: "npm" | "pnpm" | "yarn",
): { readonly files: DiscoveryFileMap; readonly discovery: ProjectDiscovery; readonly path: string } {
  const path = manager === "npm" ? "package-lock.json" : manager === "pnpm" ? "pnpm-lock.yaml" : "yarn.lock";
  const files: DiscoveryFileMap = {
    "package.json": JSON.stringify({ name: "fixture", private: true }),
    [path]: "",
  };
  return { files, discovery: discoverProjectFromFiles(files), path };
}

beforeEach(() => {
  fsControl.beforeOpen = null;
  fsControl.afterFirstFstat = null;
  fsControl.fstatCalls = 0;
  fsControl.readCalls = 0;
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("T105 environment observer", () => {
  it("derives runtime and package-json authority only from the current process and discovery snapshot", () => {
    const root = makeRoot();
    writeFileSync(join(root, "package.json"), JSON.stringify({ packageManager: "pnpm@9.9.9" }));
    const files: DiscoveryFileMap = {
      "package.json": JSON.stringify({
        name: "fixture",
        private: true,
        packageManager: "npm@11.2.3",
      }),
    };
    const environment = observeEnvironment(root, files, discoverProjectFromFiles(files));

    expect(environment).toEqual({
      runtime_name: "node",
      runtime_version: process.versions.node,
      platform: process.platform,
      architecture: process.arch,
      package_manager: "npm",
      package_manager_version: "11.2.3",
      package_manager_source: "package_json",
      lockfile_path: null,
      lockfile_sha256: null,
    });
  });

  it("hashes exact supplemental lockfile bytes instead of the discovery presence sentinel", () => {
    const root = makeRoot();
    const lockfileBytes = "{\n  \"lockfileVersion\": 3\n}\n";
    writeFileSync(join(root, "package-lock.json"), lockfileBytes);
    const files: DiscoveryFileMap = {
      "package.json": JSON.stringify({ packageManager: "npm@11.2.3" }),
      "package-lock.json": "",
    };

    const environment = observeEnvironment(root, files, discoverProjectFromFiles(files));
    expect(environment).toMatchObject({
      package_manager: "npm",
      package_manager_version: "11.2.3",
      package_manager_source: "package_json",
      lockfile_path: "package-lock.json",
      lockfile_sha256: sha256(lockfileBytes),
    });
    expect(environment.lockfile_sha256).not.toBe(sha256(""));
  });

  it("uses an exact discovery lockfile authority with a null package-manager version", () => {
    const root = makeRoot();
    const { files, discovery, path } = lockfileAuthority("pnpm");
    const lockfileBytes = "lockfileVersion: '9.0'\n";
    writeFileSync(join(root, path), lockfileBytes);

    const environment = observeEnvironment(root, files, discovery);
    expect(environment).toMatchObject({
      package_manager: "pnpm",
      package_manager_version: null,
      package_manager_source: "lockfile",
      lockfile_path: "pnpm-lock.yaml",
      lockfile_sha256: sha256(lockfileBytes),
    });
    expect(fsControl.fstatCalls).toBe(2);
    expect(fsControl.readCalls).toBeGreaterThan(0);
  });

  it("returns unavailable without probing when package-manager discovery is unresolved", () => {
    const root = makeRoot();
    const files: DiscoveryFileMap = {
      "package.json": "{}",
      "package-lock.json": "",
      "pnpm-lock.yaml": "",
    };
    const environment = observeEnvironment(root, files, discoverProjectFromFiles(files));

    expect(environment).toMatchObject({
      package_manager: null,
      package_manager_version: null,
      package_manager_source: "unavailable",
      lockfile_path: null,
      lockfile_sha256: null,
    });
    expect(fsControl.fstatCalls).toBe(0);
    expect(fsControl.readCalls).toBe(0);
  });

  it("fails closed on contradictory package-json authority snapshots", () => {
    const root = makeRoot();
    const authoritative: DiscoveryFileMap = {
      "package.json": JSON.stringify({ packageManager: "npm@11.2.3" }),
    };
    const discovery = discoverProjectFromFiles(authoritative);
    const contradictory: DiscoveryFileMap = {
      "package.json": JSON.stringify({ packageManager: "pnpm@10.0.0" }),
    };

    expect(() => observeEnvironment(root, contradictory, discovery)).toThrowError(
      EnvironmentIdentityIntegrityError,
    );
  });

  it("fails closed when a resolved lockfile authority contradicts the manager", () => {
    const root = makeRoot();
    const files: DiscoveryFileMap = { "package.json": "{}", "package-lock.json": "" };
    const discovered = discoverProjectFromFiles(files);
    const discovery: ProjectDiscovery = {
      ...discovered,
      packageManager: { state: "resolved", value: "npm", sourcePaths: ["pnpm-lock.yaml"] },
    };

    expect(() => observeEnvironment(root, files, discovery)).toThrowError(
      EnvironmentIdentityIntegrityError,
    );
    expect(fsControl.readCalls).toBe(0);
  });

  it("treats an authority lockfile read failure as an integrity error", () => {
    const root = makeRoot();
    const { files, discovery } = lockfileAuthority("yarn");
    expect(() => observeEnvironment(root, files, discovery)).toThrowError(
      EnvironmentIdentityIntegrityError,
    );
  });

  it("makes a supplemental matching-lockfile failure nullable without changing manager authority", () => {
    const root = makeRoot();
    const files: DiscoveryFileMap = {
      "package.json": JSON.stringify({ packageManager: "npm@11.2.3" }),
      "package-lock.json": "",
    };
    const environment = observeEnvironment(root, files, discoverProjectFromFiles(files));

    expect(environment).toMatchObject({
      package_manager: "npm",
      package_manager_version: "11.2.3",
      package_manager_source: "package_json",
      lockfile_path: null,
      lockfile_sha256: null,
    });
  });

  it("ignores nonmatching supplemental lockfiles under declaration-led authority", () => {
    const root = makeRoot();
    writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const files: DiscoveryFileMap = {
      "package.json": JSON.stringify({ packageManager: "npm@11.2.3" }),
      "pnpm-lock.yaml": "",
    };
    const environment = observeEnvironment(root, files, discoverProjectFromFiles(files));

    expect(environment.lockfile_path).toBeNull();
    expect(environment.lockfile_sha256).toBeNull();
    expect(fsControl.readCalls).toBe(0);
  });

  it("detects replacement between containment and open before reading any bytes", () => {
    const root = makeRoot();
    const { files, discovery, path } = lockfileAuthority("npm");
    const lockfile = join(root, path);
    const replacement = join(root, "replacement.lock");
    writeFileSync(lockfile, "original\n");
    writeFileSync(replacement, "replacement\n");
    fsControl.beforeOpen = () => {
      fsControl.beforeOpen = null;
      rmSync(lockfile);
      renameSync(replacement, lockfile);
    };

    expect(() => observeEnvironment(root, files, discovery)).toThrowError(
      EnvironmentIdentityIntegrityError,
    );
    expect(fsControl.readCalls).toBe(0);
  });

  it("rejects in-place mutation during descriptor hashing from descriptor stability metadata", () => {
    if (process.platform === "win32") return;
    const root = makeRoot();
    const { files, discovery, path } = lockfileAuthority("npm");
    const lockfile = join(root, path);
    writeFileSync(lockfile, "original-stable-bytes\n");
    fsControl.afterFirstFstat = () => {
      fsControl.afterFirstFstat = null;
      writeFileSync(lockfile, "mutated-different-size-and-bytes\n");
    };

    let error: unknown;
    try {
      observeEnvironment(root, files, discovery);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvironmentIdentityIntegrityError);
    expect((error as EnvironmentIdentityIntegrityError).reasonCode).toBe(
      "lockfile_stability_failed",
    );
    expect(fsControl.readCalls).toBeGreaterThan(0);
  });

  it("rejects a persistent path replacement after descriptor binding before digest acceptance", () => {
    if (process.platform === "win32") return;
    const root = makeRoot();
    const { files, discovery, path } = lockfileAuthority("npm");
    const lockfile = join(root, path);
    const replacement = join(root, "replacement.lock");
    writeFileSync(lockfile, "original\n");
    writeFileSync(replacement, "replacement\n");
    fsControl.afterFirstFstat = () => {
      fsControl.afterFirstFstat = null;
      rmSync(lockfile);
      renameSync(replacement, lockfile);
    };

    expect(() => observeEnvironment(root, files, discovery)).toThrowError(
      EnvironmentIdentityIntegrityError,
    );
    expect(fsControl.readCalls).toBeGreaterThan(0);
  });

  it("rejects an authority lockfile whose real target escapes the repository", () => {
    if (process.platform === "win32") return;
    const root = makeRoot();
    const outsideRoot = makeRoot();
    const outside = join(outsideRoot, "outside.lock");
    writeFileSync(outside, "outside\n");
    const { files, discovery, path } = lockfileAuthority("npm");
    symlinkSync(outside, join(root, path));

    let error: unknown;
    try {
      observeEnvironment(root, files, discovery);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvironmentIdentityIntegrityError);
    expect((error as EnvironmentIdentityIntegrityError).reasonCode).toBe(
      "lockfile_containment_failed",
    );
    expect(fsControl.readCalls).toBe(0);
  });

  it("keeps the receipt-facing environment surface privacy-bounded and contains no executable probe", () => {
    const root = makeRoot();
    const files: DiscoveryFileMap = {
      "package.json": JSON.stringify({ packageManager: "npm@11.2.3" }),
    };
    const environment = observeEnvironment(root, files, discoverProjectFromFiles(files));
    expect(Object.keys(environment).sort()).toEqual([
      "architecture",
      "lockfile_path",
      "lockfile_sha256",
      "package_manager",
      "package_manager_source",
      "package_manager_version",
      "platform",
      "runtime_name",
      "runtime_version",
    ]);

    const source = readFileSync(new URL("../src/environment.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/node:child_process|spawn(?:Sync)?\(|exec(?:File)?Sync\(/u);
    expect(source).not.toMatch(/hostname\(|homedir\(|userInfo\(|process\.env/u);
  });
});
