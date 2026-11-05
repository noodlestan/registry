# Design: Packages Endpoint

**Purpose:** Explain how `packages.json` identifies packages, locates them in their repository, and what consumers read from it.

**Publication:** Planned.

**Endpoint:** `data/packages.json`

**Schema:** `schema/v1/packages.schema.json` (planned)

## Rationale

A Registry package view replaces the drifting hand-maintained inventory with a discoverable projection of package records and manifests.

## References

- Baseline: the hand-maintained inventory in `$OPS/knowledge/package-inventory.md`.
- Plan: `$MANAGEMENT/_backlog/3-now/plan-poc-manifest-registry/plan.md`.

## Definitions

- **Package** — a publishable unit declared by a package manifest (`package.json`) inside a project checkout.
- **Canonical name** — the npm name, e.g. `@art-lib/logger`; unscoped (no `@scope/`, e.g. `apps-art-md-web`) for private apps.
- **Project** — the repository checkout that owns the package.
- **Locator** — the owning repository slug, resolved against the repositories view; the package directory is not carried separately.

## Current State

The inventory is a hand-maintained document listing every project checkout and its packages, with local version, npm version, lifecycle status, and documentation files. It drifts: versions and status are snapshots.

## Target State

A plan exists to derive the view from records and package manifests, and expose it as an endpoint:

- **Source:** records (`$PROJECT/_records/project.art` resources) plus package manifests.
- **Published view:** `$REGISTRY/data/packages.json` (planned) — see `$REGISTRY/knowledge/design/endpoints.md`.

```text
package manifest + project record  ->  data/packages.json  ->  consumers
```

## View Shape

```text
Package
- name          resource name, e.g. "Package: Logger"
- canonical     "@art-lib/logger"
- owner         "Project: Art Lib"
- repository    "noodlestan/art-lib"
- license       "MIT"
- keywords      ["library", "records"]
- version       semver; omitted when the package was never published
- dependencies      ["commander@12.0.0"]
- peerDependencies  ["typescript@5.9.3"]
- devDependencies   ["prettier@3.9.10"]
```

## Rules

- Membership is repository-scoped: a package is listed when its project record declares it as a resource.
- Only public packages are published; private packages are filtered out.
- Unscoped names (no `@scope/`, e.g. `apps-art-md-web`) are private app packages per `$OPS/knowledge/design/manifests.md`, and are therefore not listed.
- `version` is present only for published packages; absence means unpublished, not zero.
- `repository` is the owning slug only; the package directory is taken from the package manifest (`repository.directory`).
- Dependencies are reported in three separate lists, mirroring the manifest: `dependencies`, `peerDependencies`, `devDependencies`.
- The dependency lists carry the pins **declared in the package manifest**, not the pins resolved from the dependency sets.

## Consumers

- Commons Registry Indexer — publishes the endpoint.
- Commons Registry Peer — validates repository and package manifest dependencies against the packages endpoint: alerts, blocks, and/or fixes stale dependencies.

## Deferred

Lifecycle status (`PUBLISHED`, `AHEAD`, `BEHIND`) is out of the view until use cases settle. Absence of `version` means unpublished. The remaining decisions belong to consumers, not the endpoint: whether to auto-update, alert, or block a commit depends on the consumer's version delta; recursive upgrades depend on other dependencies moving with it; the source for those decisions is probably each dependency's CHANGELOG.
