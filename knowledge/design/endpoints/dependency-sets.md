# Design: Dependency Sets Endpoint

**Purpose:** Explain how `dependency-sets.json` identifies sets, how they are named and composed, and what consumers read from it.

**Publication:** Planned.

**Endpoint:** `data/dependency-sets.json`

**Schema:** `schema/v1/dependency-sets.schema.json` (planned)

## Rationale

Sets live in one place instead of being duplicated in every repository: validators stop scanning checkouts and compare a repository or package manifest against the sets its record names — and each repository or package composes whichever sets it needs.

## References

- Migration: `$MANAGEMENT/_backlog/4-next/plan-poc-manifest-registry/instructions/migrate-dependency-sets.md`.
- Validation side: `$OPS/knowledge/design/dependency-sets.md`.

## Definitions

- **Dependency** — one entry in a manifest's `dependencies`, `peerDependencies`, or `devDependencies`, pinned exactly.
- **Dependency set** — a named group of dependencies that a class of package or repository is expected to declare.
- **Package Dependency Set** — legacy name of a dependency set record; migration renames the kind to `Dependency Set`.
- **Target** — whether the set serves a repository manifest or a package manifest. Exclusive.
- **Dependency Set field** — on repository and package records, the list of set names that the manifest must satisfy. Names only, no versions.

## Current State

Dependency sets are currently spread across repositories as `Package Dependency Set` declarations, each repo declaring its own copies under `$PROJECT/_records/dependencies/`.

```text
$PROJECT/_records/dependencies/{file}.art

## Package Dependency Set: Root Tools

**Dependencies:**

- Package Dependency: Lefthook
- Package Dependency: Rollup
- Package Dependency: Turbo
```

Consequences: the same set name is declared many times, drift is only detectable by comparison, and consumers must scan repositories.

## Target State

A plan exists to centralise the declarations and expose them as an endpoint:

- **Source records:** `$REGISTRY/_records/dependency-sets/*.art` (planned).
- **Published view:** `$REGISTRY/data/dependency-sets.json` (planned) — see `$REGISTRY/knowledge/design/endpoints.md`.

The records are authored by humans; the initial set is written by hand during migration, with no generating tooling.

```text
planned
dependency set (record)  ->  registry records  ->  data/dependency-sets.json  ->  consumers
```

## Record Shape

The record kind is `Dependency Set`. Its structure is authoritative at `$REGISTRY/domain/structures/dependency-set.art` and is not restated here. Dependencies are split into three qualified fields — `dependencies`, `peerDependencies`, `devDependencies` — each a list of `{package name}@{version}`.

```md
## Dependency Set: Root Tools

**Purpose:** Tooling shared by every repository root manifest.

**Description:** Pinned toolchain required by all repositories.

**Target:** `repo`

**PackageManager:** `npm`

**DevDependencies:**

- `turbo@2.11.10`
- `lefthook@2.2.2`
- `prettier@3.9.10`
```

Records that declare sets reference them by name:

```md
**Dependency Set:**

- Dependency Set: SolidJS Application
```

Repository and package records carry no `dependencies` field: the `Dependency Set:` field replaces it.

## Naming and Composition

Sets are named after the package type they serve; the package type lives in the name and description, not in a field — `target` only separates repository from package.

**Naming:** `{Framework} {Type}` — `SolidJS App`, `Astro Lib`, `SolidJS Lib`, `CLI Development`. Groups shared by several types keep the concern name — `Vite Build`.

**Overlap:** two package types may share dependencies while each keeps its own. Shared groups are extracted, so each dependency belongs to exactly one set:

```md
A1, A2, A3 (apps): solid-js deps, astro deps, vite deps
B1, B2, B3 (libs): solid-js deps, vite deps
```

```text
Dependency Set: SolidJS App   — app-only dependencies
Dependency Set: Astro Lib     — lib-only dependencies
Dependency Set: Vite Build    — the shared group, extracted
```

**Composition:** done by the manifest — it lists every set it needs (`Astro Lib` plus `Vite Build`). Sets do not include other sets.

## View Shape

```text
Dependency Set
- name              "Dependency Set: Root Tools"
- purpose           "Tooling shared by every repository root manifest."
- description       "Pinned toolchain required by all repositories."
- target            "repo" | "package"
- packageManager    "npm"
- dependencies      ["turbo@2.11.10"]
- peerDependencies  ["typescript@5.9.3"]
- devDependencies   ["prettier@3.9.10"]
```

## Consumers

- Commons Registry Indexer — publishes the endpoint (see `$COMMONS/knowledge/design/commons-indexer.md`).
- Commons Registry Peer — validates manifests against it (see `$OPS/knowledge/design/dependency-sets.md`).
