# ARTEMIS-A11 — Security and Privacy Hardening

Ledger: Issue #475.
Predecessor: ARTEMIS-A10 CLOSED_CANONICAL / COMPLETE.

## Scope

A11 freezes policy validators and audit guards: network modes,
provider modes, donor-telemetry-off audit, ADB argv classification,
artifact path containment, and untrusted-output sanitization. Policy
and audit code only; no execution and no network changes.

## Rules

- Network defaults fail closed. `DENY_ALL` needs nothing;
  `ALLOWLIST` needs validated hosts; `UNRESTRICTED_EXPLICIT` needs a
  written justification. Unknown modes and hostnames that are not
  plain hostnames or IPs are refused.
- Provider policy needs an explicit screenshot-upload boolean: there
  is no silent default for exfiltrating pixels. Retention is bounded
  to a year. `ALLOWLIST` without models is refused.
- Donor telemetry is off. The audit passes only when every known
  telemetry flag is absent or false, and names every offending flag
  otherwise.
- ADB invocations outside the frozen read-plus-bounded-input catalog
  are refused, including bare shells, foreign subcommands, power
  keys, unbounded monkey runs, installs, and non-adb binaries. Bare
  `dumpsys package` stays permitted as a fixed read-only catalog
  member; verbosity is not an authority boundary.
- Artifact paths must be contained relative paths. Absolute paths,
  parent traversal, home expansion, backslashes, drive letters, and
  NUL bytes are refused.
- Untrusted text is length-bounded with truncation flags, control
  characters are stripped except newline, carriage return, and tab,
  and NUL content is refused outright as corruption evidence.

## Non-goals for A11

Transport enforcement (later phases consult these validators),
qualification (A12), release admission (A13), and everything after.
No A11 code opens sockets, spawns processes, or touches a device.
