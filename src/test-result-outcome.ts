/**
 * Reads whether a Vitest or Jest JSON machine result records a failure.
 *
 * A runner's exit code alone cannot pass a test task: configuration such as
 * Jest's `testFailureExitCode`, or a hook that rewrites the exit status, can
 * make a failing run exit 0. Anything that is not a JSON object counts as a
 * failure, so a caller that skipped validation still fails closed.
 */
export function machineResultRecordsFailure(text: string): boolean {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return true;
  }
  if (!isRecord(value)) return true;

  if (value.success === false || value.wasInterrupted === true) return true;
  if (
    positiveCount(value.numFailedTests) ||
    positiveCount(value.numFailedTestSuites) ||
    positiveCount(value.numRuntimeErrorTestSuites)
  ) return true;

  const suites = Array.isArray(value.testResults) ? value.testResults : [];
  return suites.some((suite) => {
    if (!isRecord(suite)) return false;
    if (suite.status === "failed") return true;
    const assertions = Array.isArray(suite.assertionResults) ? suite.assertionResults : [];
    return assertions.some((assertion) => isRecord(assertion) && assertion.status === "failed");
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveCount(value: unknown): boolean {
  return typeof value === "number" && value > 0;
}
