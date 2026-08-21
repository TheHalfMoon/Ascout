# Code Provenance Policy

**Status:** `T004 / M1 IMPLEMENTATION POLICY`  
**Applies to:** Ascout source code, tests, examples, generated artifacts committed to the repository, and future imported or adapted code.  
**Project license:** Apache License 2.0 (`LICENSE`).

## 1. Purpose

Ascout is an evidence-first verification tool. Its own code provenance must therefore be inspectable, reproducible where practical, and conservative when ownership or licensing is uncertain.

This policy defines what source material may influence Ascout implementation, what must be recorded, and what is prohibited. It does not replace third-party license texts or legal obligations and is an engineering-governance policy, not legal advice. Rights or licensing questions that remain unresolved must be escalated to an authorized project decision-maker or qualified legal counsel rather than guessed away.

## 2. Canonical project license

The repository's top-level `LICENSE` remains the canonical Apache License 2.0 license for Ascout-authored project material unless a file or directory states a different compatible license.

T004 does not modify, replace, shorten, or reinterpret `LICENSE`.

## 3. Provenance classes

Every committed implementation should fall into one of these classes.

### A. Original Ascout implementation

Code or documentation written specifically for Ascout from the project's canonical specifications, tests, issue descriptions, public standards, public documentation, and independently derived design reasoning.

Requirements:
- implementation must satisfy the canonical Ascout specification rather than copy an external implementation;
- reviewers must be able to understand the code without access to private donor material;
- any material external design influence that could affect attribution or clean-room reasoning should be recorded in the relevant PR or research note.

### B. Third-party dependency

A package consumed as a dependency rather than copied into the repository.

Requirements:
- exact direct dependency version, role, upstream identity, license, and lockfile binding are recorded in `THIRD_PARTY_NOTICES.md`;
- the lockfile remains the machine-readable resolved dependency record;
- adding or changing a product runtime dependency requires explicit review rather than incidental installation;
- a dependency license must be compatible with the intended Ascout distribution before adoption.

### C. Imported or adapted third-party source

Source copied, vendored, translated, or materially adapted from an external codebase.

This class is **not allowed implicitly**.

Before commit, record at minimum:
- upstream repository URL;
- for repository source, the exact immutable commit object ID; a branch name, release name, or tag alone is insufficient because it may be moved or replaced;
- for a standalone release artifact that is the source of the imported material, a versioned artifact URL plus a cryptographic checksum of the exact artifact used;
- exact upstream path(s), or exact paths within the checked artifact;
- upstream license and applicable copyright notice;
- whether the material is copied, translated, generated from, or materially adapted;
- Ascout destination path(s);
- local modifications;
- license-compatibility review;
- required attribution or notice text.

If any required provenance field cannot be established, do not import the code.

### D. Public design/reference material

Public papers, standards, documentation, blog posts, public repositories, research reports, API docs, and product behavior may inform design without becoming source-code donors.

Requirements:
- conceptual use does not imply permission to copy source text or implementation;
- quotations and copied material must remain within applicable license/copyright terms;
- if implementation becomes materially derivative of a specific codebase, reclassify it as imported/adapted third-party source and apply Class C requirements.

### E. AI-assisted contribution

Code or documentation produced with an AI coding assistant is treated as a project contribution requiring the same review and provenance discipline as human-authored material.

Rules:
- model output is not evidence of copyright ownership, originality, correctness, or license compatibility;
- an assistant must not import code merely because it claims the code is public or permissively licensed;
- external snippets suggested by an assistant must be independently traced before material reuse;
- reviewers assess the committed artifact, its cited sources, and its license/provenance record, not the assistant's confidence;
- AI assistance never weakens Ascout's verification, review, or source-binding gates.

## 4. Prohibited source material

Do not use as an Ascout implementation source:
- proprietary or non-public source code without explicit authorization and compatible rights;
- leaked, credential-gated, or improperly obtained code;
- code whose license cannot be established;
- source copied from a product or service merely because its behavior can be observed;
- material that would require relicensing Ascout incompatibly with the repository's Apache-2.0 distribution intent.

When exposure to non-public or gated material may have occurred, do not make unsupported claims that contributors have "never seen" it and do not continue using the exposed material. Apply the clean-room exposure procedure in Section 5 before affected implementation proceeds.

## 5. Clean-room boundary for competitive references

Ascout may study publicly observable behavior and public documentation of other developer tools to understand the problem space.

That research must remain behavior/design research unless source reuse is separately authorized under Class C.

In particular:
- no non-public TestSprite material is an Ascout source;
- no TestSprite source import is authorized by this policy;
- public documentation or a public repository may be cited as a design reference only under its actual terms;
- the same rule applies to any other proprietary or gated competitor.

### Exposure procedure

If a contributor has accessed non-public, gated, proprietary, leaked, or otherwise non-permitted material that could influence an Ascout implementation:

1. **Document the exposure fact without reproducing protected content.** Record who or which role was exposed, the material category/source, the approximate time, and the potentially affected Ascout work. Do not copy the protected material into issues, PRs, prompts, logs, or provenance records.
2. **Stop using the exposed material.** Do not quote, summarize for implementation, transform, or continue supplying it to people or AI systems working on the affected Ascout code.
3. **Quarantine potentially influenced implementation.** Treat code, notes, prompts, or generated output materially influenced by the exposure as provenance-unresolved until the clean-room path is decided; passing tests do not clear this status.
4. **Prefer independent reimplementation.** Assign the affected implementation to a contributor who was not exposed to the restricted material, using only canonical Ascout requirements and other permitted public sources. The PR should record the clean-room basis and permitted inputs without revealing the protected material.
5. **Alternative handling requires documented authorization.** If independent reimplementation is not the chosen path, do not proceed merely on an informal assumption. Record a project-approved rights/legal determination that identifies why the alternative process is permitted and any conditions or attribution it requires.
6. **Review before merge.** The affected PR remains blocked until reviewers can determine from permitted records that provenance is resolved. If that cannot be established, remove or independently replace the affected material.

This procedure is intentionally about provenance isolation, not about asserting that exposure itself creates or does not create any particular legal consequence.

## 6. Research does not authorize adoption

Creating a research note or issue about an external system does not authorize:
- adding its SDK or dependency;
- sending repository data to its service;
- adopting its architecture as canonical;
- copying its source;
- changing an Ascout requirement.

For example, research such as the Chroma Foundation agent-learning direction may inform a future design discussion, but it remains non-authoritative until a separately reviewed Ascout specification explicitly adopts a capability.

## 7. Required PR provenance statement

A PR that adds or materially changes implementation should state which of the following applies:

```text
CODE_PROVENANCE:
- original_ascout: YES|NO
- third_party_dependencies_changed: YES|NO
- imported_or_adapted_source: YES|NO
- public_design_references: <none or references>
- ai_assistance_used: YES|NO|UNKNOWN
- provenance_notes: <concise factual notes>
```

If `imported_or_adapted_source=YES`, include the full Class C record before merge.

`ai_assistance_used=UNKNOWN` is acceptable when authorship history cannot be established; it must not be converted into an unsupported claim.

## 8. Review rule

A provenance finding is a merge blocker when it could materially affect:
- the right to distribute the code;
- required attribution;
- license compatibility;
- whether the implementation was independently derived from permitted sources.

Ambiguity fails closed: resolve the provenance question, remove the material, or replace it with an independently derived implementation.

## 9. Relationship to verification evidence

Code provenance and runtime verification are separate concerns.

A passing test does not prove lawful provenance. A valid license does not prove correct behavior. Ascout requires both appropriate provenance and appropriate technical evidence for the artifact being shipped.

## 10. Record template for future source imports

```text
SOURCE_PROVENANCE_RECORD:
- upstream_repository: <url or N/A for standalone artifact>
- upstream_commit_sha: <full immutable commit object ID or N/A for standalone artifact>
- upstream_artifact_url: <versioned artifact URL or N/A for repository source>
- upstream_artifact_checksum: <algorithm:digest or N/A for repository source>
- upstream_paths: <repository paths or paths within artifact>
- upstream_license: <SPDX/license name>
- upstream_copyright: <notice or reference>
- use_type: copied|adapted|translated|generated_from
- ascout_paths: <paths>
- modifications: <summary>
- license_compatibility_review: PASS|FAIL|UNRESOLVED
- required_attribution: <text/reference>
- reviewer: <identity or review record>
```

For repository source, `upstream_commit_sha` is required and the artifact fields may be `N/A`. For a standalone release artifact, `upstream_artifact_url` and `upstream_artifact_checksum` are required; a release or tag name alone is not sufficient immutable provenance.

No `UNRESOLVED` record authorizes merge of the affected imported source.
