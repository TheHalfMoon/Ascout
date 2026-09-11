# Spec 013 Ponytail / YAGNI Review — Plan Reduction

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`

## Review

The plan was reduced against the measured release gap.

Rejected from the implementation plan:

- npm publication and `private` removal;
- any release workflow or bot;
- semantic-release, Changesets, release-please, provenance service, installer, updater, or channel;
- product source edits during release qualification;
- committed qualification artifacts that would change the qualified source tree;
- lockfile regeneration or dependency refresh merely because a release is being prepared;
- new changelog machinery when the GitHub Release body can describe this first release;
- rebuild-after-qualification publication behavior.

Retained:

- two-file version metadata mutation;
- existing PR Self Verification and six-lane Project CI;
- exact clean-checkout release qualification;
- one immutable tarball and SHA-256;
- separate publication authorization;
- tag/Release publication and post-release verification.
The five-task sequence is necessary because source mutation must precede qualification,
qualification must precede authorization, authorization must precede publication, and live
publication must be verified after the fact. Combining those phases would weaken identity
or authority boundaries rather than simplify them.

```text
PONYTAIL_PLAN_REDUCTION = PASS
PLAN_SURFACE_FROZEN = YES
MINIMUM_DEPENDENCY_ORDERED_TASKS = 5
```
