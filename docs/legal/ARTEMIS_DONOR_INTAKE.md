# ARTEMIS Donor Intake Record

Status: PLANNED_NOT_IMPORTED
Target project: Ascout
Donor repository: https://github.com/google/artemis
Donor commit: 371aa6df56880643da57b30da936e9812fb0ec66
Donor license: Apache-2.0
Ascout license: Apache-2.0
Intake class: Class C — imported or adapted third-party source

## Founder authorization

The project owner explicitly authorized copying and adapting the ARTEMIS source into Ascout.
This authorization does not replace immutable provenance, attribution, license notice preservation, or Ascout review/evidence requirements.

## Exact donor binding

Only google/artemis commit 371aa6df56880643da57b30da936e9812fb0ec66 is authorized by this intake plan.
Any later ARTEMIS commit requires a separate donor delta with a new immutable SHA and provenance review.

## Intended capability intake

- Android real-device and emulator control
- accessibility and UI hierarchy collection
- visual/OCR/multimodal locating
- screenshot/video evidence
- Logcat and device diagnostics
- exploratory and deterministic mobile tests
- Flash and Pro execution strategies
- checkpoint verification and final review
- task history compression and replay
- MCP device-control concepts
- Python client integration
- Android accessibility helper
- mobile console concepts

## Mandatory isolation

The donor must first enter as an immutable vendor snapshot under vendor/google-artemis/ (or an equivalently immutable subtree approved by the canonical implementation task).
No donor startup script, installer, telemetry path, cloud integration, model provider, shell operation, global IDE mutation, dependency installer, or network-capable component receives execution authority merely because its source is present.

## Required Class C record before import merge

SOURCE_PROVENANCE_RECORD:
- upstream_repository: https://github.com/google/artemis
- upstream_commit_sha: 371aa6df56880643da57b30da936e9812fb0ec66
- upstream_paths: complete repository snapshot at exact commit
- upstream_license: Apache-2.0
- upstream_copyright: preserve donor file notices and license/notice material
- use_type: copied + adapted
- ascout_paths: vendor/google-artemis/** plus separately reviewed Ascout adapters
- modifications: none inside immutable donor snapshot unless separately recorded
- license_compatibility_review: PASS subject to notice preservation
- required_attribution: preserve Apache-2.0 notices and donor-origin documentation
- reviewer: Alibaba Open Code Review plus canonical Ascout governance

## Review constraints

- Alibaba Open Code Review is the required implementation review engine where phase authority permits execution.
- Negative findings and unavailable evidence remain visible.
- No donor code may bypass Ascout intent, policy, descriptor, phase authority, provenance, evidence, or effect-ceiling controls.
- Donor source presence is evidence input, never a grant of runtime authority.

## Current state

DONOR_DISCOVERED = YES
DONOR_SHA_PINNED = YES
LICENSE_IDENTIFIED = YES
FOUNDER_AUTHORIZATION_RECORDED = YES
FULL_SOURCE_IMPORTED = NO
DEPENDENCIES_ADMITTED = NO
RUNTIME_AUTHORITY_GRANTED = NO
ASCOUT_ADAPTER_IMPLEMENTED = NO
MOBILE_EXECUTION_ENABLED = NO