# Security Policy

Ascout verifies repository changes by inspecting source state, discovering project-local tooling, executing authorized commands, and writing evidence under `.ascout/`. Security reports that could affect those trust boundaries are welcome.

## Supported versions

Ascout has not published a stable release yet. Until a release policy is established, security fixes are made only on the current canonical `main` branch. Do not assume an older commit, branch, archive, or prerelease snapshot receives security updates.

## Report a vulnerability privately

Do not open a public issue, discussion, or pull request for an undisclosed vulnerability.

Use GitHub's private vulnerability reporting / Security Advisory flow for this repository when it is available. Include enough information to reproduce and assess the issue without attaching real credentials, private customer data, or other secrets.

A useful report includes:

- affected Ascout commit or version;
- operating system, Node.js version, Git version, and relevant project-local tool versions;
- the smallest safe reproduction you can provide;
- the expected security boundary and the observed behavior;
- whether exploitation requires a changed repository file, a changed command surface, explicit command admission, or another precondition;
- impact on confidentiality, integrity, availability, receipt truth, or command execution;
- any proposed mitigation, if known.

If private vulnerability reporting is not available, do not disclose exploit details publicly. Contact the repository owner through a private GitHub-supported channel and request a private reporting path.

## High-value security boundaries

Reports are especially useful when they demonstrate a concrete violation of one of these boundaries:

- **Command admission:** changed command surfaces must not execute as trusted commands without the repository's required explicit per-invocation admission.
- **No hidden shell expansion:** repository commands must not gain an unintended shell command surface, argument reinterpretation, or command-injection path.
- **Process containment:** timeout and cancellation must not leave an owned process tree running after Ascout reports cleanup complete.
- **Source binding:** receipts must remain bound to the exact observed repository state, source-start Git identity, and comparison base rather than a repaired or guessed identity.
- **Path integrity:** repository-relative paths must be canonical and must not escape the repository, collapse distinct raw identities, or become absolute/URI/UNC paths in receipt truth.
- **Secret handling:** Ascout must not intentionally persist configured or recognized secret values in receipt argv, captured output, logs, or artifacts when its redaction contract says those values are redacted.
- **Evidence integrity:** evidence/artifact hashes, task status, truncation/redaction flags, completeness, and exit semantics must not claim stronger proof than was actually observed.
- **Local execution boundary:** Ascout must not add undeclared remote execution, hidden telemetry, or network-dependent verification behavior to a workflow documented as local/project-owned.
- **Package boundary:** published package contents must not accidentally include repository runtime state, tests, private fixtures, secrets, logs, coverage output, or other files outside the declared release surface.

## Usually not a security vulnerability

The following are generally handled as normal bugs unless they cross a security boundary above:

- a test runner, linter, type checker, or other project-local command failing normally;
- a repository command that the user explicitly admitted doing something that command itself is documented to do;
- performance issues or slow tests without a denial-of-service or containment impact;
- unsupported operating systems or tool versions;
- inaccurate findings that do not corrupt persisted evidence or bypass a trust boundary;
- vulnerabilities in third-party tools that Ascout merely invokes and does not cause or amplify.

We still welcome ordinary bug reports through the repository's normal issue workflow when public disclosure is safe.

## Disclosure and remediation

Please allow maintainers a reasonable opportunity to reproduce, assess, and repair a report before public disclosure. Security fixes should preserve Ascout's fail-closed behavior: uncertainty must not be converted into a success claim merely to keep a workflow running.

When a vulnerability is confirmed, maintainers should record the affected boundary, fix and regression-test the defect, reassess related evidence claims, and publish an advisory or release note when an appropriate release/disclosure channel exists.

## Safe research

Use repositories and fixtures you are authorized to test. Do not use Ascout security research as a reason to access third-party systems, credentials, or data without permission. Prefer synthetic, local, and minimal reproductions.
