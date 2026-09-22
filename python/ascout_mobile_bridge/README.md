# Ascout Mobile Bridge (ARTEMIS-A2)

Isolated Python sidecar for the versioned local protocol. Availability
validation only; no execution authority.

## Operational contract

- Python standard library only. No third-party dependencies are installed
  or required.
- No network access, no subprocesses, no file writes, no device access.
- `sidecar.py` reads exactly one JSON request line on stdin and writes
  exactly one JSON response line on stdout, then exits.
- Supported command: `handshake` with `protocol_version` 1.
- Response statuses: `READY` or `ERROR` with a machine-readable `reason`.
- Exit code is nonzero only on interpreter or transport catastrophe, never
  as a substitute for the structured `ERROR` response.
- Compatible with Python 3.10+ syntax so version reporting works
  everywhere; the 3.12 release pin is enforced by the TypeScript
  availability probe (`src/assurance/engines/mobile-artemis/availability.ts`).

## Handshake example

Request:

```json
{"protocol_version": 1, "command": "handshake", "request_id": "req:example"}
```

Response:

```json
{"donor_sha_pinned": "371aa6df56880643da57b30da936e9812fb0ec66", "protocol_version": 1, "sidecar_version": "1.0.0", "status": "READY", "python_version": "3.12.1"}
```

## Boundaries

Device enumeration, screenshots, input injection, ADB mutation, and every
other effect stay outside this bridge until their own phased
authorization. The bridge never starts an ADB server and never touches
the donor snapshot.
