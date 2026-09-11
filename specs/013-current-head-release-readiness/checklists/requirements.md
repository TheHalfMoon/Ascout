# Spec 013 Requirements Quality Checklist

**Status:** `PLANNING / IMPLEMENTATION_NOT_AUTHORIZED / PUBLICATION_NOT_AUTHORIZED`

- [x] Problem is measured from exact live repository truth.
- [x] Historical T088 evidence is treated as stale for current source.
- [x] Target release version is explicit and bounded to `0.1.0`.
- [x] GitHub release and npm publication are distinct authority surfaces.
- [x] `private: true` remains mandatory through Spec 013.
- [x] T124 mutation is exactly two files and version-only semantics.
- [x] Dependency resolution, SRI, scripts, engines, name, bin, files, and license are frozen.
- [x] Exact candidate qualification occurs after version mutation.
- [x] Six-lane Project CI and Self Verification remain exact-head gates.
- [x] Actual tarball creation, inspection, and separate-consumer install are required.
- [x] Tarball filename, size, and SHA-256 are required authority inputs.
- [x] Benchmark and historical evidence immutability is explicit.
- [x] Publication authorization is separate from qualification success.
- [x] Tag target is required to equal the qualified candidate exactly.
- [x] Release upload must reuse qualified tarball bytes without rebuild.
- [x] Post-publication verification is mandatory before closeout.
- [x] npm credentials/publication are prohibited in this spec.
- [x] Failure returns to planning/repair instead of weakening gates.
- [x] No new runtime subsystem, dependency, action, service, or release bot is introduced.
- [x] Task order is exactly `T124 -> T125 -> T126 -> T127 -> T128`.

```text
REQUIREMENTS_CHECKLIST = PASS
```
