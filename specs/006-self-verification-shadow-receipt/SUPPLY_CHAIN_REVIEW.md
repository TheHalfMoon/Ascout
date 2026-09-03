# Spec 006 Supply-Chain / License / Data Review

**Status:** PLANNING_REVIEW_COMPLETE / IMPLEMENTATION_REVERIFY_REQUIRED
**Date:** 2026-09-03

## Candidate dependency

Purpose: upload the generated self-verification receipt and qualification envelope as bounded GitHub Actions artifacts.

Repository:

- `actions/upload-artifact`
- owner: GitHub `actions` organization
- public repository
- license reported by GitHub: MIT

Reviewed current release/ref at planning time:

- release: `v7.0.1`
- tag target / exact commit: `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`
- action metadata blob: `7cb4d1e81db55320b41217e1a78a1a46e3d2baef`
- runtime: `node24`

## Required inputs

Only:

- `path`
- `if-no-files-found: error`
- `retention-days: 30`

No overwrite, hidden-file inclusion, or cross-job artifact merging is needed.

## Data exposure

The action may receive only:

- `self-verification-receipt.json`
- `self-verification-envelope.json`

The receipt remains subject to Ascout receipt privacy/redaction rules.

The envelope allowlist is limited to:

- schema/classification;
- verifier head/tree Git object IDs `H/HT`;
- GitHub event base-tip Git object ID `B` as provenance;
- subject unique merge-base Git object ID `M`;
- subject target head/tree `H/HT`;
- observed receipt exit code;
- receipt SHA-256;
- receipt filename.

It MUST NOT contain raw remote/repository URL, repository/absolute filesystem path, GitHub actor/user identity, hostname, home directory, environment dump, credentials/tokens/secrets, or arbitrary stderr/stdout.

## Permissions

```yaml
permissions:
  contents: read
```

No repository/PR/issues/actions write permission is justified. Spec 006 does not authorize comments, status mutation, releases, repository writes, or secret-backed APIs.

## Pinning decision

Floating references such as `actions/upload-artifact@v7` are not authorized.

Implementation must reverify immediately before mutation that the exact reviewed SHA belongs to the expected official repository/owner, retains the reviewed action execution model, and remains license/security acceptable. If unsuitable, return to planning and record a new exact-version review.

## License conclusion

MIT is compatible with Ascout's Apache-2.0 repository use for this workflow dependency. No donor source is copied into Ascout.

## Security conclusion

Risk is bounded by official action provenance, full commit pin, read-only repository permission, explicit two-file upload allowlist, bounded retention, no hidden files, no secrets, and no write API behavior.

This does not claim GitHub Actions or artifact storage is local/offline; it is optional repository qualification infrastructure, not Ascout core truth.

## Decision

`SUPPLY_CHAIN_REVIEW = PASS_FOR_PLANNING`

Implementation remains unauthorized until Spec 006 planning is canonically merged and a separate durable authorization binds the exact planning merge and reviewed action SHA or a prospectively re-reviewed replacement.