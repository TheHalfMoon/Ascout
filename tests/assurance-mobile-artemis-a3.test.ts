import { describe, expect, it } from "vitest";

import {
  bindEvidenceReceiptV1,
  buildReadOnlyAdbCommandV1,
  hashDeviceSerialV1,
  parseHierarchyXmlV1,
  parseLogcatV1,
  READ_ONLY_ADB_COMMANDS,
  redactSecretsV1,
  summarizeScreenshotV1,
  UIAUTOMATOR_DUMP_EXCLUDED_REASON,
} from "../src/assurance/engines/mobile-artemis/evidence.js";
import { MOBILE_ARTEMIS_DONOR_SHA } from "../src/assurance/engines/mobile-artemis/descriptor.js";

const DIGEST_A =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST_B =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const HIERARCHY_FIXTURE =
  '<hierarchy rotation="0">' +
  '<node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.example" content-desc="" clickable="false" bounds="[0,0][1080,2400]" />' +
  '<node index="1" text="Search &amp; Go" resource-id="com.example:id/search" class="android.widget.Button" package="com.example" content-desc="Search" clickable="true" bounds="[100,200][980,320]" />' +
  '<node index="2" text="NoBounds" class="android.view.View" package="com.example" bounds="nonsense" />' +
  "</hierarchy>";

function pngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < signature.length; index += 1) {
    bytes[index] = signature[index] as number;
  }
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes[12] = 73;
  bytes[13] = 72;
  bytes[14] = 68;
  bytes[15] = 82;
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = 2;
  bytes[26] = 0;
  bytes[27] = 0;
  bytes[28] = 0;
  return bytes;
}

describe("ARTEMIS-A3 hierarchy parsing", () => {
  it("extracts flat nodes and skips boundless tags", () => {
    const parsed = parseHierarchyXmlV1(HIERARCHY_FIXTURE);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.skippedTags).toBe(1);
    const first = parsed.nodes[0];
    expect(first?.className).toBe("android.widget.FrameLayout");
    expect(first?.clickable).toBe(false);
    expect(first?.bounds).toEqual({ x1: 0, y1: 0, x2: 1080, y2: 2400 });
    const second = parsed.nodes[1];
    expect(second?.text).toBe("Search & Go");
    expect(second?.resourceId).toBe("com.example:id/search");
    expect(second?.clickable).toBe(true);
  });

  it("rejects declarations, entities, and nested shapes", () => {
    expect(() =>
      parseHierarchyXmlV1('<!DOCTYPE hierarchy><hierarchy><node bounds="[0,0][1,1]" /></hierarchy>'),
    ).toThrow();
    expect(() =>
      parseHierarchyXmlV1('<?xml version="1.0"?><hierarchy><node bounds="[0,0][1,1]" /></hierarchy>'),
    ).toThrow();
    expect(() =>
      parseHierarchyXmlV1('<hierarchy><node bounds="[0,0][10,10]"><node bounds="[1,1][2,2]" /></node></hierarchy>'),
    ).toThrow();
    expect(() => parseHierarchyXmlV1("<div></div>")).toThrow();
  });

  it("skips nodes with undecodable entities instead of corrupting them", () => {
    const parsed = parseHierarchyXmlV1(
      '<hierarchy><node text="&unknown;" bounds="[0,0][1,1]" /><node text="kept" bounds="[0,0][2,2]" /></hierarchy>',
    );
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0]?.text).toBe("kept");
    expect(parsed.skippedTags).toBe(1);
  });
});

describe("ARTEMIS-A3 logcat parsing and redaction", () => {
  it("parses threadtime lines and counts the rest as skipped", () => {
    const text = [
      "09-22 14:00:01.123  1000  2000 I ActivityManager: Start proc com.example",
      "09-22 14:00:02.456  1000  2000 E AndroidRuntime: FATAL EXCEPTION main",
      "this line is not logcat",
      "",
    ].join("\n");
    const parsed = parseLogcatV1(text);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.skippedLines).toBe(1);
    expect(parsed.entries[0]?.priority).toBe("I");
    expect(parsed.entries[0]?.tag).toBe("ActivityManager");
    expect(parsed.entries[1]?.message).toBe("FATAL EXCEPTION main");
  });

  it("redacts caller-supplied secrets longest-first with counts", () => {
    const redacted = redactSecretsV1("a secret-token and token", [
      "token",
      "secret-token",
    ]);
    expect(redacted.text).toBe("a [REDACTED] and [REDACTED]");
    expect(redacted.redactions).toBe(2);
    expect(redactSecretsV1("clean text", ["zzz"]).redactions).toBe(0);
  });
});

describe("ARTEMIS-A3 screenshot summary", () => {
  it("summarizes structural PNG headers with hashing", () => {
    const summary = summarizeScreenshotV1(pngBytes(320, 240));
    expect(summary.format).toBe("png");
    expect(summary.width).toBe(320);
    expect(summary.height).toBe(240);
    expect(summary.byteLength).toBe(33);
    expect(summary.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("rejects non-PNG and out-of-range headers", () => {
    const bad = pngBytes(320, 240);
    bad[0] = 0;
    expect(() => summarizeScreenshotV1(bad)).toThrow();
    expect(() => summarizeScreenshotV1(pngBytes(0, 240))).toThrow();
    expect(() => summarizeScreenshotV1(new Uint8Array(10))).toThrow();
  });
});

describe("ARTEMIS-A3 privacy-safe identity and receipt binding", () => {
  it("hashes device serials without persisting them", () => {
    const first = hashDeviceSerialV1("emulator-5554");
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(first).toBe(hashDeviceSerialV1("emulator-5554"));
    expect(first).not.toBe(hashDeviceSerialV1("emulator-5556"));
    expect(first.includes("emulator-5554")).toBe(false);
    expect(() => hashDeviceSerialV1("")).toThrow();
  });

  it("binds source, device, donor, engine, and protocol", () => {
    const receipt = bindEvidenceReceiptV1({
      run_id: "run:a3-proof",
      source_digest: DIGEST_A,
      engine_descriptor_digest: DIGEST_B,
      device_identity_hash: hashDeviceSerialV1("emulator-5554"),
      completion_state: "INCOMPLETE",
      artifacts: [
        {
          artifact_id: "artifact:shot-1",
          kind: "screenshot",
          sha256: DIGEST_A,
          byte_length: 33,
        },
      ],
      observations: [{ kind: "hierarchy", ref: "artifact:shot-1" }],
    });
    expect(receipt.protocol_version).toBe(1);
    expect(receipt.run_id).toBe("run:a3-proof");
    expect(receipt.source_digest).toBe(DIGEST_A);
    expect(receipt.engine_descriptor_digest).toBe(DIGEST_B);
    expect(receipt.donor_sha).toBe(MOBILE_ARTEMIS_DONOR_SHA);
    expect(receipt.completion_state).toBe("INCOMPLETE");
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(() =>
      bindEvidenceReceiptV1({
        run_id: "run:a3-proof",
        source_digest: DIGEST_A,
        engine_descriptor_digest: DIGEST_B,
        device_identity_hash: "not-a-hash",
        completion_state: "PASS",
        artifacts: [],
        observations: [],
      }),
    ).toThrow();
  });
});

describe("ARTEMIS-A3 read-only command catalog", () => {
  it("freezes exact argv for device-side-write-free reads", () => {
    expect(buildReadOnlyAdbCommandV1("DEVICE_PROPERTIES")).toEqual({
      adb: "adb",
      args: ["shell", "getprop"],
    });
    expect(buildReadOnlyAdbCommandV1("SCREENSHOT_STDOUT")).toEqual({
      adb: "adb",
      args: ["exec-out", "screencap", "-p"],
    });
    expect(buildReadOnlyAdbCommandV1("LOGCAT_DUMP")).toEqual({
      adb: "adb",
      args: ["logcat", "-d", "-v", "threadtime"],
    });
    expect(
      buildReadOnlyAdbCommandV1("PACKAGE_STATE", ["com.example"]),
    ).toEqual({ adb: "adb", args: ["shell", "dumpsys", "package", "com.example"] });
    expect(() =>
      buildReadOnlyAdbCommandV1("PACKAGE_STATE", ["com.example;rm"]),
    ).toThrow();
    expect(JSON.stringify(READ_ONLY_ADB_COMMANDS).includes("uiautomator")).toBe(false);
    expect(UIAUTOMATOR_DUMP_EXCLUDED_REASON.length).toBeGreaterThan(0);
  });
});
