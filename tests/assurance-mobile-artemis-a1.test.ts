import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createMobileArtemisDescriptorV1,
  MOBILE_ARTEMIS_DONOR_SHA,
  MOBILE_ARTEMIS_ENGINE_ID,
  mobileArtemisDescriptorDigestV1,
} from "../src/assurance/engines/mobile-artemis/descriptor.js";
import {
  MOBILE_EFFECTS,
  mobileEffectCeiling,
  mobileEffectCeilingOrNull,
  parseMobileEffect,
} from "../src/assurance/engines/mobile-artemis/effects.js";
import {
  assertFreshMobileBindingV1,
  bindMobileRequestContextV1,
  MOBILE_ARTEMIS_PROTOCOL_VERSION,
  MOBILE_COMPLETION_STATES,
  negotiateMobileProtocolV1,
  parseMobileRequestV1,
  parseMobileResultV1,
} from "../src/assurance/engines/mobile-artemis/protocol.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const SCHEMA_PATH = join(
  REPO_ROOT,
  "schemas",
  "mobile-artemis",
  "v1",
  "protocol.json",
);

const DIGEST_A =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST_B =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function validContext() {
  return {
    run_id: "run:a1-proof",
    source_digest: DIGEST_A,
    engine_descriptor_digest: DIGEST_B,
    donor_sha: MOBILE_ARTEMIS_DONOR_SHA,
  };
}

describe("ARTEMIS-A1 frozen mobile engine descriptor", () => {
  it("freezes an external contract-only descriptor with no execution authority", () => {
    const descriptor = createMobileArtemisDescriptorV1();
    expect(descriptor.engine_id).toBe(MOBILE_ARTEMIS_ENGINE_ID);
    expect(descriptor.engine_kind).toBe("EXTERNAL");
    expect(descriptor.authority_ceiling).toBe("E0_READ_ONLY_ANALYSIS");
    expect(descriptor.requirements.process_required).toBe(false);
    expect(descriptor.requirements.network_required).toBe(false);
    expect(descriptor.requirements.provider_requirements).toEqual([]);
    expect(descriptor.requirements.sandbox_required).toBe(false);
    expect(descriptor.license_provenance_state.license_identity).toBe(
      "license:apache-2.0",
    );
    expect(Object.isFrozen(descriptor)).toBe(true);
  });

  it("binds a stable descriptor digest", () => {
    const first = mobileArtemisDescriptorDigestV1(
      createMobileArtemisDescriptorV1(),
    );
    const second = mobileArtemisDescriptorDigestV1(
      createMobileArtemisDescriptorV1(),
    );
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
  });
});

describe("ARTEMIS-A1 mobile effect classes", () => {
  it("freezes exactly the thirteen canonical mobile effects", () => {
    expect([...MOBILE_EFFECTS]).toEqual([
      "DEVICE_READ",
      "DEVICE_INPUT",
      "APP_LAUNCH",
      "APP_INSTALL",
      "APP_UNINSTALL",
      "FILE_PUSH",
      "FILE_PULL",
      "LOGCAT_READ",
      "SCREEN_CAPTURE",
      "SCREEN_RECORD",
      "ADB_SHELL_READ",
      "ADB_SHELL_MUTATE",
      "DEVICE_SETTINGS_MUTATE",
    ]);
    expect(parseMobileEffect("DEVICE_READ")).toBe("DEVICE_READ");
    expect(parseMobileEffect("NOT_AN_EFFECT")).toBeNull();
    expect(mobileEffectCeilingOrNull("NOT_AN_EFFECT")).toBeNull();
  });

  it("freezes the conservative ceiling mapping", () => {
    expect(mobileEffectCeiling("DEVICE_READ")).toBe("E0_READ_ONLY_ANALYSIS");
    expect(mobileEffectCeiling("LOGCAT_READ")).toBe("E0_READ_ONLY_ANALYSIS");
    expect(mobileEffectCeiling("SCREEN_CAPTURE")).toBe("E0_READ_ONLY_ANALYSIS");
    expect(mobileEffectCeiling("SCREEN_RECORD")).toBe(
      "E2_LOCAL_WRITE_ARTIFACT_ONLY",
    );
    expect(mobileEffectCeiling("DEVICE_INPUT")).toBe(
      "E4_BROWSER_OR_APP_INTERACTION",
    );
    expect(mobileEffectCeiling("APP_LAUNCH")).toBe(
      "E4_BROWSER_OR_APP_INTERACTION",
    );
    expect(mobileEffectCeiling("ADB_SHELL_READ")).toBe(
      "E4_BROWSER_OR_APP_INTERACTION",
    );
    expect(mobileEffectCeiling("APP_INSTALL")).toBe(
      "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
    );
    expect(mobileEffectCeiling("APP_UNINSTALL")).toBe(
      "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
    );
    expect(mobileEffectCeiling("FILE_PUSH")).toBe(
      "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
    );
    expect(mobileEffectCeiling("FILE_PULL")).toBe(
      "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
    );
    expect(mobileEffectCeiling("ADB_SHELL_MUTATE")).toBe(
      "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
    );
    expect(mobileEffectCeiling("DEVICE_SETTINGS_MUTATE")).toBe(
      "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
    );
  });
});

describe("ARTEMIS-A1 version negotiation and stale rejection", () => {
  it("negotiates exactly protocol v1", () => {
    expect(negotiateMobileProtocolV1([1])).toEqual({
      status: "NEGOTIATED",
      version: 1,
    });
    expect(negotiateMobileProtocolV1([2, 1])).toEqual({
      status: "NEGOTIATED",
      version: 1,
    });
    expect(negotiateMobileProtocolV1([])).toEqual({
      status: "REFUSED",
      reason: "EMPTY_OFFER",
    });
    expect(negotiateMobileProtocolV1([2, 3])).toEqual({
      status: "REFUSED",
      reason: "UNKNOWN_PROTOCOL_VERSION",
    });
    expect(MOBILE_ARTEMIS_PROTOCOL_VERSION).toBe(1);
  });

  it("rejects stale donor, protocol, and descriptor bindings in order", () => {
    const expected = {
      donor_sha: MOBILE_ARTEMIS_DONOR_SHA,
      protocol_version: 1,
      descriptor_digest: DIGEST_A,
    };
    expect(assertFreshMobileBindingV1(expected, { ...expected })).toEqual({
      status: "FRESH",
    });
    expect(
      assertFreshMobileBindingV1(expected, {
        ...expected,
        donor_sha: "0000000000000000000000000000000000000000",
      }),
    ).toEqual({ status: "STALE", reason: "STALE_DONOR_SHA" });
    expect(
      assertFreshMobileBindingV1(expected, { ...expected, protocol_version: 2 }),
    ).toEqual({ status: "STALE", reason: "STALE_PROTOCOL_VERSION" });
    expect(
      assertFreshMobileBindingV1(expected, {
        ...expected,
        descriptor_digest: DIGEST_B,
      }),
    ).toEqual({ status: "STALE", reason: "STALE_DESCRIPTOR_DIGEST" });
  });

  it("binds request context with strict identity formats", () => {
    const context = bindMobileRequestContextV1(validContext());
    expect(context.protocol_version).toBe(1);
    expect(context.donor_sha).toBe(MOBILE_ARTEMIS_DONOR_SHA);
    expect(Object.isFrozen(context)).toBe(true);
    expect(() =>
      bindMobileRequestContextV1({ ...validContext(), donor_sha: "main" }),
    ).toThrow();
  });
});

describe("ARTEMIS-A1 envelope validation", () => {
  it("accepts a well-formed request and rejects contract violations", () => {
    const valid = {
      protocol_version: 1,
      request_id: "req:a1-1",
      effect: "DEVICE_READ",
      action: "action:observe",
      budgets: { max_steps: 10, max_seconds: 60 },
      context: validContext(),
    };
    const parsed = parseMobileRequestV1(valid);
    expect(parsed.ok).toBe(true);

    expect(
      parseMobileRequestV1({ ...valid, extra: true }).ok,
    ).toBe(false);
    expect(
      parseMobileRequestV1({ ...valid, protocol_version: 2 }).ok,
    ).toBe(false);
    expect(parseMobileRequestV1({ ...valid, effect: "FLY" }).ok).toBe(false);
    expect(
      parseMobileRequestV1({
        ...valid,
        budgets: { max_steps: -1, max_seconds: 60 },
      }).ok,
    ).toBe(false);
    expect(parseMobileRequestV1(null).ok).toBe(false);
  });

  it("accepts a well-formed result and rejects unknown states", () => {
    const valid = {
      protocol_version: 1,
      request_id: "req:a1-1",
      completion_state: "INCOMPLETE",
      attempted_actions: ["action:observe"],
      blocked_actions: ["action:tap"],
    };
    expect(parseMobileResultV1(valid).ok).toBe(true);
    expect(
      parseMobileResultV1({ ...valid, completion_state: "GREEN" }).ok,
    ).toBe(false);
    expect(
      parseMobileResultV1({ ...valid, unexpected: 1 }).ok,
    ).toBe(false);
    expect([...MOBILE_COMPLETION_STATES]).toHaveLength(10);
  });
});

describe("ARTEMIS-A1 versioned JSON schema artifact", () => {
  it("keeps the schema artifact consistent with the frozen TypeScript contracts", () => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as {
      $id: string;
      $defs: {
        mobileEffect: { enum: string[] };
        completionState: { enum: string[] };
      };
    };
    expect(schema.$id).toBe("urn:ascout:mobile-artemis:protocol:v1");
    expect(schema.$defs.mobileEffect.enum).toEqual([...MOBILE_EFFECTS]);
    expect(schema.$defs.completionState.enum).toEqual([
      ...MOBILE_COMPLETION_STATES,
    ]);
  });
});
