/**
 * Bounded Git subprocess settings for Ascout-owned Git calls.
 *
 * A repository's configuration is data, not permission to launch helpers.
 * These options suppress Git's optional external-command integrations and
 * prevent inherited GIT_* environment variables from redirecting a run.
 *
 * This is NOT an OS sandbox: filters/attributes and checkout-time effects
 * require separate trust qualification before handling untrusted projects.
 */

// Git for Windows accepts /dev/null here; the Windows NUL device does not.
const NULL_DEVICE = "/dev/null";

const GIT_CONFIG_OVERRIDES = [
  "core.fsmonitor=false",
  `core.hooksPath=${NULL_DEVICE}`,
  "diff.external=",
  "submodule.recurse=false",
  "maintenance.auto=false",
  "gc.auto=0",
] as const;

/** Command-line -c overrides repository-local settings for these keys. */
export function hardenedGitArgs(args: readonly string[]): string[] {
  return [
    ...GIT_CONFIG_OVERRIDES.flatMap((setting) => ["-c", setting]),
    ...args,
  ];
}

/** Remove Git-specific inherited authority and disable global/system config. */
export function hardenedGitEnv(
  inherited: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(inherited)) {
    if (!key.toUpperCase().startsWith("GIT_")) {
      env[key] = value;
    }
  }
  return {
    ...env,
    GIT_CONFIG_GLOBAL: NULL_DEVICE,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
  };
}
