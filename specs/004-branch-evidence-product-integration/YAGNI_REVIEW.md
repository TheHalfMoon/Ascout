# YAGNI Review: Branch-Evidence Product Integration

**Spec:** 004  
**Date:** 2026-09-01  
**Status:** PLANNING  

## Y-001 — Function coverage

**Verdict:** REJECT.  
**Reason:** Not proved by Spec 003, not authorized by architecture review, not required by measured evidence. Would expand scope beyond the proven gap.

## Y-002 — AST/CFG reconstruction

**Verdict:** REJECT.  
**Reason:** LCOV `BRDA:` records already provide branch identity without reconstruction. AST/CFG adds complexity, new dependencies, and untrusted execution surface without justified product need.

## Y-003 — Branch coverage percentage thresholds

**Verdict:** REJECT.  
**Reason:** No arbitrary threshold is invented. Binary `EXERCISED`/`NOT_EXERCISED`/`UNRESOLVED` states are sufficient for changed-code verification. Percentage thresholds would introduce invented product semantics.

## Y-004 — Receipt v2

**Verdict:** REJECT.  
**Reason:** Additive v1 extension is sufficient. Receipt v2 would break backward compatibility without justified product need.

## Y-005 — CLI flags for branch control

**Verdict:** REJECT.  
**Reason:** Branch evidence is derived from existing LCOV output. No new user configuration is needed. CLI flags would expand the surface without solving a measured problem.

## Y-006 — New runtime dependencies

**Verdict:** REJECT.  
**Reason:** Node.js standard library is sufficient. New dependencies would violate Native Capability Before Invention and Minimal Core constitutional constraints.

## Y-007 — Browser/API/security integration

**Verdict:** REJECT.  
**Reason:** Out of scope for branch-evidence product integration. No measured evidence justifies expansion into these domains.

## Y-008 — Plugin architecture

**Verdict:** REJECT.  
**Reason:** Out of scope. Would introduce arbitrary plugin surface without measured justification.

## Y-009 — Agent/RAG/memory expansion

**Verdict:** REJECT.  
**Reason:** Out of scope. No measured evidence or canonical selection authorizes these domains for Spec 004.

## Y-010 — Terminal summary enrichment beyond additive branch counts

**Verdict:** REJECT unless explicitly planned.  
**Reason:** The default plan preserves existing terminal summary. Any display change must be explicitly authorized by a separate planning artifact.

## Y-011 — Arbitrary branch coverage "support" claim in product

**Verdict:** REJECT.  
**Reason:** Spec 003 qualification proved only that branch evidence can reveal gaps. Product branch-coverage support as a standalone claim is not authorized and would overclaim measured evidence.

## Y-012 — Expanded benchmark corpus or new benchmark cases

**Verdict:** REJECT.  
**Reason:** Spec 003 benchmark corpus is sufficient for product-integration planning. New benchmark cases are not required for the measured integration scope.

## Y-013 — Silent fallback from branch gap to line-only pass

**Verdict:** REJECT.  
**Reason:** This would violate no-green-by-omission. Unavailable branch data must remain unresolved or fail closed, never silently converted to PASS.

## Y-014 — Automatic branch coverage enablement without user consent

**Verdict:** REJECT.  
**Reason:** Branch evidence is derived from existing LCOV output. There is no separate user consent step for parsing data that the project already produces. However, the implementation must not silently make branch coverage "mandatory" in any sense that changes exit-code semantics beyond additive incompleteness.
