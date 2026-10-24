# 0002. Bounded native HEAD query batching

Status: accepted (2026-10-24), for prospective Task021-T01 planning against main92433f7. This records the selected pattern, not implementation or merge authorization; independent planning gates remain pending.

## Context

Current local Git-native controls exceed unchanged5/15second deadlines. Repeated native process launches dominate earlier successful diagnostic traces. The existing reader uses four processes for one HEAD metadata observation; an existing Ascout draft contains a compatible two-process candidate.

## Decision

Choose only that native HEAD-query pattern, with strict exact output validation and the existing sequential error classifier as fallback. Requalify it independently against current main and retain internal source commitbb7ff354db2bcee9274785b1e69a1cc61ad474ed/PR614. Keep its security/hashing ancestors and their scopes excluded.

Reject cache/memoization because stale source identity is unacceptable; reject a new runner/framework/dependency and deadline/skip relaxation because they do not establish the original contracts. Do not merge the whole draft stack merely to obtain a performance change. One small prospective task makes the selected scope and gates independently reviewable.

## Consequences

Valid metadata should use two processes. A malformed/unsupported batch costs one extra process before the unchanged fallback. Actual native source-bound comparison and complete-suite qualification, rather than assumed speedup, decide whether the task resolves E00; a remaining failure requires diagnosis, not a relaxed budget.
