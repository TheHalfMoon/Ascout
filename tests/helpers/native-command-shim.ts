import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function nativeCommandShimName(command: string): string {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

export function nativeCommandShimRepositoryPath(command: string, prefix = ""): string {
  const root = prefix === "" ? "" : `${prefix}/`;
  return `${root}node_modules/.bin/${nativeCommandShimName(command)}`;
}

export function writeNodeCommandShim(
  binRoot: string,
  command: string,
  script: string,
): string {
  mkdirSync(binRoot, { recursive: true });
  const scriptPath = join(binRoot, `${command}-fixture.cjs`);
  const shimPath = join(binRoot, nativeCommandShimName(command));
  writeFileSync(scriptPath, script, "utf8");

  if (process.platform === "win32") {
    writeFileSync(
      shimPath,
      `@echo off\r\n"${process.execPath}" "${scriptPath}" %*\r\n`,
      "utf8",
    );
  } else {
    writeFileSync(
      shimPath,
      `#!/bin/sh\nexec "${process.execPath}" "${scriptPath}" "$@"\n`,
      "utf8",
    );
    chmodSync(shimPath, 0o755);
  }
  return shimPath;
}

export function writePackageNodeCommandShim(
  binRoot: string,
  command: string,
  packageEntryRelativeToBin: string,
): string {
  mkdirSync(binRoot, { recursive: true });
  const shimPath = join(binRoot, nativeCommandShimName(command));

  if (process.platform === "win32") {
    const entry = packageEntryRelativeToBin.replaceAll("/", "\\");
    writeFileSync(
      shimPath,
      `@echo off\r\n"${process.execPath}" "%~dp0\\${entry}" %*\r\n`,
      "utf8",
    );
  } else {
    writeFileSync(
      shimPath,
      `#!/bin/sh\nexec "${process.execPath}" "$(dirname "$0")/${packageEntryRelativeToBin}" "$@"\n`,
      "utf8",
    );
    chmodSync(shimPath, 0o755);
  }
  return shimPath;
}
