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

/**
 * Reads whether a pytest JUnit XML report records a failure: a test suite whose failures or
 * errors count is above zero, or a test case holding a failure or error element. A report with no
 * test suite counts as a failure, so a missing or emptied report fails closed.
 */
export function junitResultRecordsFailure(xml: string): boolean {
  const suites = [...xml.matchAll(/<testsuite\b([^>]*)>/gu)];
  if (suites.length === 0) return true;
  for (const [, attributes] of suites) {
    for (const pattern of [/\bfailures="(\d+)"/u, /\berrors="(\d+)"/u]) {
      const value = pattern.exec(attributes ?? "")?.[1];
      if (value === undefined || Number(value) > 0) return true;
    }
  }
  return /<(?:failure|error)\b/u.test(xml);
}
