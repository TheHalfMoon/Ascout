/**
 * FD-4 phase T1-ENV: an allowlisted environment for the tasks `check` runs, by explicit
 * per-invocation opt-in (`ascout check --clean-env`). A task then inherits only what tools need to
 * start (the search path, the home and temporary folders, the locale, and on Windows the system
 * folders), plus any name the operator passes with `--pass-env`, and CI=1.
 *
 * What it guards against: secrets reaching tools that log, report, or upload their own environment.
 * What it doesn't: code that goes looking. Ascout's own process still holds the caller's
 * environment, and a task running as the same user can read it from the operating system (for
 * example /proc on Linux), or read credential files under the home folder it keeps. So the
 * containment tier stays T0 (containment-tier.ts), and the capability probe measures inheritance only.
 */

/** Names any platform's tools need to start. Matched exactly on POSIX, case-insensitively on Windows. */
const COMMON_NAMES = ["PATH", "HOME", "LANG", "LC_ALL", "LC_CTYPE", "TERM", "TZ", "TMPDIR", "TMP", "TEMP", "USER", "LOGNAME", "SHELL"] as const;

/** The system folders and identity Windows programs read at startup. */
const WINDOWS_NAMES = [
  "PATHEXT", "SystemRoot", "SystemDrive", "windir", "ComSpec", "USERPROFILE", "USERNAME", "APPDATA", "LOCALAPPDATA",
  "HOMEDRIVE", "HOMEPATH", "ProgramData", "ProgramFiles", "ProgramFiles(x86)", "ProgramW6432", "CommonProgramFiles",
  "CommonProgramFiles(x86)", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE", "OS",
] as const;

/** A name an operator may pass through: letters, digits, and underscores, not starting with a digit. */
export const PASS_ENV_NAME = /^(?!__proto__$)[A-Za-z_][A-Za-z0-9_]{0,127}$/u;

/** The names a task keeps on this platform, before any operator additions. */
export function allowlistedTaskEnvNamesV1(platform: NodeJS.Platform): readonly string[] {
  return platform === "win32" ? [...COMMON_NAMES, ...WINDOWS_NAMES] : [...COMMON_NAMES];
}

/**
 * Builds a task's environment from the caller's: only allowlisted and operator-passed names that are
 * set, plus CI=1. (Test runners always get CI=1; with this environment, configured commands get it
 * too.) On Windows, names compare without case, as Windows itself does, and each keeps the caller's
 * own spelling; CI is set once, whatever spelling was passed.
 */
export function allowlistedTaskEnvironmentV1(source: NodeJS.ProcessEnv, platform: NodeJS.Platform, passNames: readonly string[] = []): NodeJS.ProcessEnv {
  for (const name of passNames) if (!PASS_ENV_NAME.test(name)) throw new Error(`not an environment variable name: ${JSON.stringify(name)}`);
  const fold = (name: string): string => (platform === "win32" ? name.toUpperCase() : name);
  const wanted = new Set([...allowlistedTaskEnvNamesV1(platform), ...passNames].map(fold));
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(source)) {
    if (value !== undefined && wanted.has(fold(name)) && fold(name) !== fold("CI")) env[name] = value;
  }
  env.CI = "1";
  return env;
}

/** A test runner's environment: the allowlisted one when the operator asked for it, else the caller's, with CI=1. */
export function testRunnerEnvironmentV1(allowlisted: NodeJS.ProcessEnv | undefined, source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...(allowlisted ?? source), CI: "1" };
}
