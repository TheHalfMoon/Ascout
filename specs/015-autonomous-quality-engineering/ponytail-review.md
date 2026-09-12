# Spec 015 Ponytail Review — First Complexity Reduction

**Status:** `PLANNING_ONLY`
**Base:** `55688b5bca22f2e9979b71739bb6802c652bda9d`

The first slice must remain local-first and benchmark-driven. The following are explicitly removed from first-slice implementation:

- graph database; use simplest deterministic serializable structure supporting required queries;
- persistent memory server; memory remains non-authoritative planning concept only;
- public plugin SDK; internal adapter boundaries only, no plugin loading;
- hosted control plane or SaaS backend;
- browser farm and device lab;
- generalized untrusted-repository platform; trusted local scope preserved;
- every testing domain at once; security, performance, accessibility, AI-system deferred;
- organization-wide dashboards and metrics warehouse;
- automatic source merge or commit authority;
- single universal AI model or provider lock-in;
- proprietary replacement for Vitest, Jest, TypeScript, ESLint, or pytest paths.

Any item above requires a separate benchmark-backed expansion justification with provenance review before reconsideration. YAGNI reduction preserved.

```text
PONYTAIL_REVIEW = PASS / FIRST_SLICE_NARROWED
```
