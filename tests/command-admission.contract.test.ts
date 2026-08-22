import { describe, expect, it } from "vitest";

type AdmissionDecision =
  | {
      readonly command_surface_changed: false;
      readonly changed_authority_paths: readonly [];
      readonly execution_admission: "normal";
      readonly launch_allowed: true;
      readonly status?: never;
      readonly reason_code?: never;
      readonly reason_text?: never;
    }
  | {
      readonly command_surface_changed: true;
      readonly changed_authority_paths: readonly string[];
      readonly execution_admission: "explicit_changed_surface_override";
      readonly launch_allowed: true;
      readonly status?: never;
      readonly reason_code?: never;
      readonly reason_text?: never;
    }
  | {
      readonly command_surface_changed: true;
      readonly changed_authority_paths: readonly string[];
      readonly execution_admission: "refused_changed_surface";
      readonly launch_allowed: false;
      readonly status: "NOT_RUN";
      readonly reason_code: "command_surface_changed";
      readonly reason_text: string;
    };

function effectiveAuthorityIntersection(
  effectiveAuthorityPaths: readonly string[],
  changedPaths: readonly string[],
): readonly string[] {
  const changed = new Set(changedPaths);
  const seen = new Set<string>();
  const intersection: string[] = [];

  for (const path of effectiveAuthorityPaths) {
    if (!changed.has(path) || seen.has(path)) continue;
    seen.add(path);
    intersection.push(path);
  }

  return intersection;
}

function decideAdmission(
  effectiveAuthorityPaths: readonly string[],
  changedPaths: readonly string[],
  allowChangedCommandSurface: boolean,
): AdmissionDecision {
  const changedAuthorityPaths = effectiveAuthorityIntersection(
    effectiveAuthorityPaths,
    changedPaths,
  );

  if (changedAuthorityPaths.length === 0) {
    return {
      command_surface_changed: false,
      changed_authority_paths: [],
      execution_admission: "normal",
      launch_allowed: true,
    };
  }

  if (allowChangedCommandSurface) {
    return {
      command_surface_changed: true,
      changed_authority_paths: changedAuthorityPaths,
      execution_admission: "explicit_changed_surface_override",
      launch_allowed: true,
    };
  }

  return {
    command_surface_changed: true,
    changed_authority_paths: changedAuthorityPaths,
    execution_admission: "refused_changed_surface",
    launch_allowed: false,
    status: "NOT_RUN",
    reason_code: "command_surface_changed",
    reason_text: "effective command or configuration authority changed in this invocation",
  };
}

describe("T016 command-admission contract", () => {
  it("uses only the intersection of changed paths and the task's effective authority paths", () => {
    const decision = decideAdmission(
      ["package.json", "vitest.config.ts"],
      ["src/example.ts", "vitest.config.ts", "README.md"],
      false,
    );

    expect(decision.command_surface_changed).toBe(true);
    expect(decision.changed_authority_paths).toEqual(["vitest.config.ts"]);
    expect(decision.changed_authority_paths).not.toContain("src/example.ts");
    expect(decision.changed_authority_paths).not.toContain("README.md");
  });

  it("keeps unchanged effective authority in the normal admission state", () => {
    const decision = decideAdmission(
      ["package.json", "tsconfig.json"],
      ["src/index.ts", "tests/index.test.ts"],
      false,
    );

    expect(decision).toEqual({
      command_surface_changed: false,
      changed_authority_paths: [],
      execution_admission: "normal",
      launch_allowed: true,
    });
  });

  it("does not treat a changed but non-effective alternative config as authority for the task", () => {
    const decision = decideAdmission(
      ["package.json", "vitest.config.ts"],
      ["jest.config.ts"],
      false,
    );

    expect(decision.command_surface_changed).toBe(false);
    expect(decision.changed_authority_paths).toEqual([]);
    expect(decision.execution_admission).toBe("normal");
    expect(decision.launch_allowed).toBe(true);
  });

  it("refuses an affected task by default before process launch with canonical task-level fields", () => {
    const decision = decideAdmission(
      ["package.json", "vitest.config.ts"],
      ["vitest.config.ts"],
      false,
    );

    expect(decision.command_surface_changed).toBe(true);
    expect(decision.changed_authority_paths).toEqual(["vitest.config.ts"]);
    expect(decision.execution_admission).toBe("refused_changed_surface");
    expect(decision.launch_allowed).toBe(false);
    expect(decision.status).toBe("NOT_RUN");
    expect(decision.reason_code).toBe("command_surface_changed");
    expect(decision.reason_text?.length).toBeGreaterThan(0);
  });

  it("allows an affected task only when the current invocation supplies the explicit override", () => {
    const decision = decideAdmission(
      ["package.json", "vitest.config.ts"],
      ["package.json", "vitest.config.ts"],
      true,
    );

    expect(decision.command_surface_changed).toBe(true);
    expect(decision.changed_authority_paths).toEqual(["package.json", "vitest.config.ts"]);
    expect(decision.execution_admission).toBe("explicit_changed_surface_override");
    expect(decision.launch_allowed).toBe(true);
    expect(decision).not.toHaveProperty("status");
    expect(decision).not.toHaveProperty("reason_code");
    expect(decision).not.toHaveProperty("reason_text");
  });

  it("does not label an unchanged task as overridden merely because the flag was supplied", () => {
    const decision = decideAdmission(
      ["package.json", "eslint.config.js"],
      ["src/lint-target.ts"],
      true,
    );

    expect(decision.command_surface_changed).toBe(false);
    expect(decision.changed_authority_paths).toEqual([]);
    expect(decision.execution_admission).toBe("normal");
    expect(decision.launch_allowed).toBe(true);
  });

  it("does not remember explicit admission across invocations", () => {
    const authority = ["package.json", "vitest.config.ts"] as const;
    const changed = ["vitest.config.ts"] as const;

    const ordinaryBefore = decideAdmission(authority, changed, false);
    const explicitlyAllowed = decideAdmission(authority, changed, true);
    const ordinaryAfter = decideAdmission(authority, changed, false);

    expect(ordinaryBefore.execution_admission).toBe("refused_changed_surface");
    expect(ordinaryBefore.launch_allowed).toBe(false);

    expect(explicitlyAllowed.execution_admission).toBe(
      "explicit_changed_surface_override",
    );
    expect(explicitlyAllowed.launch_allowed).toBe(true);

    expect(ordinaryAfter).toEqual(ordinaryBefore);
    expect(ordinaryAfter.execution_admission).toBe("refused_changed_surface");
    expect(ordinaryAfter.launch_allowed).toBe(false);
    expect(ordinaryAfter.status).toBe("NOT_RUN");
    expect(ordinaryAfter.reason_code).toBe("command_surface_changed");
  });

  it("keeps fixed task categories independent when their effective authority paths do not intersect", () => {
    const changed = ["vitest.config.ts"] as const;

    const testDecision = decideAdmission(
      ["package.json", "vitest.config.ts"],
      changed,
      false,
    );
    const typecheckDecision = decideAdmission(
      ["package.json", "tsconfig.json"],
      changed,
      false,
    );

    expect(testDecision.execution_admission).toBe("refused_changed_surface");
    expect(testDecision.launch_allowed).toBe(false);
    expect(testDecision.changed_authority_paths).toEqual(["vitest.config.ts"]);

    expect(typecheckDecision.execution_admission).toBe("normal");
    expect(typecheckDecision.launch_allowed).toBe(true);
    expect(typecheckDecision.changed_authority_paths).toEqual([]);
  });

  it("deduplicates disclosed changed authority paths without inventing unrelated changed paths", () => {
    const decision = decideAdmission(
      ["package.json", "vitest.config.ts", "vitest.config.ts"],
      ["vitest.config.ts", "vitest.config.ts", "docs/notes.md"],
      false,
    );

    expect(decision.changed_authority_paths).toEqual(["vitest.config.ts"]);
    expect(new Set(decision.changed_authority_paths).size).toBe(
      decision.changed_authority_paths.length,
    );
  });
});
