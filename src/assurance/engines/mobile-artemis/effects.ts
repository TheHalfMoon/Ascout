import type { AssuranceEffectClass } from "../../contracts/intent.js";

export const MOBILE_EFFECTS = [
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
] as const;

export type MobileEffect = (typeof MOBILE_EFFECTS)[number];

const MOBILE_EFFECT_CEILINGS: Record<MobileEffect, AssuranceEffectClass> = {
  DEVICE_READ: "E0_READ_ONLY_ANALYSIS",
  LOGCAT_READ: "E0_READ_ONLY_ANALYSIS",
  SCREEN_CAPTURE: "E0_READ_ONLY_ANALYSIS",
  SCREEN_RECORD: "E2_LOCAL_WRITE_ARTIFACT_ONLY",
  DEVICE_INPUT: "E4_BROWSER_OR_APP_INTERACTION",
  APP_LAUNCH: "E4_BROWSER_OR_APP_INTERACTION",
  ADB_SHELL_READ: "E4_BROWSER_OR_APP_INTERACTION",
  APP_INSTALL: "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
  APP_UNINSTALL: "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
  FILE_PUSH: "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
  FILE_PULL: "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
  ADB_SHELL_MUTATE: "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
  DEVICE_SETTINGS_MUTATE: "E6_AUTHORIZED_EXTERNAL_SIDE_EFFECT",
};

function isMobileEffect(value: unknown): value is MobileEffect {
  return (
    typeof value === "string" &&
    (MOBILE_EFFECTS as readonly string[]).includes(value)
  );
}

export function parseMobileEffect(value: unknown): MobileEffect | null {
  return isMobileEffect(value) ? value : null;
}

export function mobileEffectCeiling(effect: MobileEffect): AssuranceEffectClass {
  return MOBILE_EFFECT_CEILINGS[effect];
}

export function mobileEffectCeilingOrNull(
  value: unknown,
): AssuranceEffectClass | null {
  const effect = parseMobileEffect(value);
  return effect === null ? null : MOBILE_EFFECT_CEILINGS[effect];
}
