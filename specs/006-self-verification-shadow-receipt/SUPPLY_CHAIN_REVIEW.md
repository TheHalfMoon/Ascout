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
- action metadata blob at that commit: `7cb4d1e81db55320b41217e1a78a1a46e3d2baef`
- runtime declared by action metadata: `node24`

## Required inputs used by Spec 006

Only:

- `path`
- `if-no-files-found: error`
- `retention-days: 30`

Optional compression/default behavior may remain default.

Spec 006 does not need overwrite, hidden-file inclusion, or cross-job artifact merging.

## Data exposure

The action may receive only two explicitly generated files from runner-temp output:

- `self-verification-receipt.json`
- `self-verification-envelope.json`

The receipt is already subject to Ascout receipt privacy/redaction rules.

The envelope is restricted to:

- schema/classification;
- verifier head/tree Git object IDs;
- subject base/head/tree Git object IDs;
- observed receipt exit code;
- receipt SHA-256;
- receipt filename.

The envelope MUST NOT contain:

- raw remote URL;
- repository path;
- absolute filesystem path;
- GitHub actor/user identity;
- hostname;
- home directory;
- environment dump;
- credentials/tokens/secrets;
- arbitrary stderr/stdout.

## Permissions

The planned workflow declares only:

```yaml
permissions:
  contents: read
```

No repository/PR/issues/actions write permission is justified.

Artifact upload uses GitHub's workflow artifact service through the action runtime; Spec 006 does not authorize comments, status mutation, release creation, repository writes, or secret-backed APIs.

## Pinning decision

A floating reference such as `actions/upload-artifact@v7` is not authorized.

If implementation is later authorized, it must use the exact reviewed commit SHA after re-verifying immediately before mutation that:

1. the SHA still belongs to `actions/upload-artifact`;
2. the repository remains under the expected GitHub `actions` owner;
3. the exact commit's action metadata still has the reviewed execution model;
4. license/provenance remain acceptable;
5. no newly discovered security/use concern changes the decision.

If the exact reviewed SHA is unsuitable at implementation time, return to planning and record a new exact-version review before changing the dependency.

## License conclusion

MIT is compatible with Ascout's Apache-2.0 repository use for this workflow dependency. No donor source is copied into Ascout.

## Security conclusion

Risk is bounded because:

- official GitHub action;
- full commit pin required;
- read-only repository token permission;
- explicit upload file allowlist;
- bounded retention;
- no hidden files;
- no secrets required;
- no write API behavior authorized.

This does not claim GitHub Actions or artifact storage is local/offline. It is optional repository CI infrastructure, not Ascout core truth.

## Decision

`SUPPLY_CHAIN_REVIEW = PASS_FOR_PLANNING`

Implementation remains unauthorized until the complete Spec 006 planning chain is canonically merged and a separate durable implementation authorization explicitly binds the exact reviewed action SHA or a prospectively re-reviewed replacement.