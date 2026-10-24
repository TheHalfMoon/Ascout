# Plan reduction

One bounded local snapshot and per-mutation native lock replace a generic journal/database abstraction. No compaction, backend interface, plugin registry, queue, worker, takeover protocol or configuration language. Digest-only records avoid a new secret-redaction subsystem. Recovery decisions preserve existing Ascout authority and require a caller to resolve actual evidence.
