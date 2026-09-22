import { describe, expect, it } from "vitest";

import { canonicalAssuranceSha256V1 } from "../src/assurance/contracts/canonical-serialization.js";
import { createEngineRegistryV1 } from "../src/assurance/kernel/registry.js";
import {
  NATIVE_ENGINE_ID,
  createNativeEngineDescriptorV1,
  nativeEngineConfigurationIdentityV1,
  nativeEngineRegistryEntryV1,
} from "../src/assurance/engines/native/descriptor.js";

describe("UA-P02-T09 Native Ascout engine adapter", () => {
  it("exposes one fixed read-only native descriptor identity", () => {
    const first = createNativeEngineDescriptorV1();
    const second = createNativeEngineDescriptorV1();

    expect(first.engine_id).toBe(NATIVE_ENGINE_ID);
    expect(first.engine_kind).toBe("INTERNAL");
    expect(first.effect_classes).toEqual(["E0_READ_ONLY_ANALYSIS"]);
    expect(first.authority_ceiling).toBe("E0_READ_ONLY_ANALYSIS");
    expect(first.requirements.process_required).toBe(false);
    expect(first.requirements.network_required).toBe(false);
    expect(first).toEqual(second);
    expect(canonicalAssuranceSha256V1(first)).toBe(
      canonicalAssuranceSha256V1(second),
    );
  });

  it("registers through the canonical T01 registry without ambiguity", () => {
    const entry = nativeEngineRegistryEntryV1();
    const registry = createEngineRegistryV1([entry]);

    expect(registry.entries).toHaveLength(1);
    expect(registry.entries[0]?.descriptor.engine_id).toBe(NATIVE_ENGINE_ID);
    expect(nativeEngineConfigurationIdentityV1().configuration_id).toBe(
      "configuration:ascout-native",
    );
  });

  it("creates no second execution path and carries no execution authority", () => {
    const descriptor = createNativeEngineDescriptorV1();
    const entry = nativeEngineRegistryEntryV1();

    expect("execution_authority" in descriptor).toBe(false);
    expect("process_authority" in descriptor).toBe(false);
    expect("network_authority" in descriptor).toBe(false);
    expect("runCheck" in entry).toBe(false);
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.descriptor)).toBe(true);
  });

  it("preserves existing ascout check semantics vocabulary", () => {
    const descriptor = createNativeEngineDescriptorV1();

    expect(descriptor.capabilities).toEqual(["capability:check"]);
    expect(descriptor.supported_inputs).toEqual(["input:source"]);
    expect(descriptor.supported_outputs).toEqual(["output:evidence"]);
    expect(descriptor.known_limitations).toEqual([
      "Native adapter is a read-only projection.",
    ]);
  });
});
