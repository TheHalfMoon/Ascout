"""Ascout mobile bridge sidecar (ARTEMIS-A2).

Operational contract:
- Python standard library only. No third-party dependencies.
- No network access. No subprocesses. No file writes.
- Exactly one JSON request line on stdin produces exactly one JSON
  response line on stdout, then the process exits.
- Syntax stays compatible with Python 3.10 so version reporting works
  even where the 3.12 release pin is not satisfied; the release pin is
  enforced by the TypeScript availability probe, not by this file.
"""

import json
import sys

SIDECAR_VERSION = "1.0.0"
PROTOCOL_VERSION = 1
DONOR_SHA_PINNED = "371aa6df56880643da57b30da936e9812fb0ec66"


def respond(payload):
    sys.stdout.write(json.dumps(payload, sort_keys=True) + "\n")
    sys.stdout.flush()


def error_response(reason):
    return {
        "protocol_version": PROTOCOL_VERSION,
        "status": "ERROR",
        "reason": reason,
    }


def handle_handshake(request):
    if request.get("protocol_version") != PROTOCOL_VERSION:
        return error_response("UNKNOWN_PROTOCOL_VERSION")
    return {
        "protocol_version": PROTOCOL_VERSION,
        "status": "READY",
        "sidecar_version": SIDECAR_VERSION,
        "python_version": sys.version.split()[0],
        "donor_sha_pinned": DONOR_SHA_PINNED,
    }


def handle_request(request):
    if not isinstance(request, dict):
        return error_response("MALFORMED_JSON")
    command = request.get("command")
    if command == "handshake":
        return handle_handshake(request)
    return error_response("UNKNOWN_COMMAND")


def main():
    line = sys.stdin.readline()
    if line is None or line.strip() == "":
        respond(error_response("EMPTY_REQUEST"))
        return 0
    try:
        request = json.loads(line)
    except (ValueError, TypeError):
        respond(error_response("MALFORMED_JSON"))
        return 0
    respond(handle_request(request))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
