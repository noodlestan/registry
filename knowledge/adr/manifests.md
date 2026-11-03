# ADR: Manifests

**Purpose:** Decisions about package and repository manifests — their shape, ownership of relationships, and machine-readable conventions.

## Decision: Normalized Manifests

**Status:** ADOPTED

**Context:** Manifests need a consistent shape for mechanical comparison, validation, and generation.

**Decision:** Every manifest follows one shape: fixed field order, exact version pins (caret only for peers), explicit `private`/`type`/`sideEffects`, repository with `directory` on packages, and custom fields before `scripts`. Stay within what npm itself understands.

## Decision: Relationships Are Locally Owned (`artDependencies`)

**Status:** ADOPTED

**Decision:** Planning and implementation relationships are declared in the owning manifest via `artDependencies`: `role` + `repository`/`package` + `url` + `directory`, with optional `qualifier`. They are never declared in a central registry.

**Consequences:** The declaring manifest is edited when the relationship changes. One-sided declarations are legitimate; reciprocity is a convention warned about, not enforced. `directory` is required unless the target is a repository root, making the link resolvable from the manifest alone. See [design/manifests.md](../design/manifests.md).
