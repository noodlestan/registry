# ADR: Manifests

**Purpose:** Why manifests are normalized and how relationships are declared in them.

## Decision: Normalized Manifests

Every manifest follows one shape: fixed field order, exact version pins (caret only for peers), explicit `private`/`type`/`sideEffects`, repository with `directory` on packages, custom fields before `scripts`. Rationale: normalization makes manifests machine-comparable — diffing, validating, and generating against them becomes mechanical — while staying within what npm itself understands.

## Decision: Relationships Are Locally Owned (`artDependencies`)

Planning and implementation relationships are declared in the manifest that owns them (`artDependencies`: `role` + `repository`/`package` + `url` + `directory`, `qualifier` optional), never in a central registry. Rationale: the declaring manifest is edited exactly when the relationship changes, one-sided declarations are legitimate, reciprocity is a convention warned about rather than enforced, and `directory` — required unless the target is a repository root — makes the link resolvable from the manifest alone without consulting anyone. See [design/manifests.md](../design/manifests.md).
