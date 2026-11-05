# Design: Data

**Purpose:**

- Every input and managed data source the ecosystem reads or maintains: what is duplicated across sources, and which tool reads or updates each so the duplications stay in sync. Endpoints are excluded — they are outputs.

## Duplication Map

The same facts appear in more than one place by design (see [adr/registry.md](../adr/registry.md), "accept duplication"):

| Fact                        | Manifest                  | Record                          | Kept in sync by                                   |
| --------------------------- | ------------------------- | ------------------------------- | ------------------------------------------------- |
| `name` (canonical identity) | `name` field              | `canonicalName` / resource name | Commons Registry Peer validates; human on change  |
| `version`                   | `version` field           | `Package Dependency` records    | Commons Registry Peer enforces canonical versions |
| `canonical` (slug, scope)   | `repository`/scope in use | `Canonical` field               | validation at commit; Indexer reports mismatches  |
| `purpose`, `description`    | `description`             | `Purpose` / `Description`       | human; Indexer projects the record side           |

Rule: Package manifests is the authority on identity and registry core data. Records augment this data with metadata and become the source of truth for consumers that can tolerate eventual consistency.

## Canonicals Per Entity

| Entity         | Canonical form                      | Example                              |
| -------------- | ----------------------------------- | ------------------------------------ |
| Project        | resource name                       | `Project: Art JS`                    |
| Repository     | GitHub slug / manifest `name` field | `noodlestan/art-js`                  |
| Namespace      | npm scope                           | `@art-js`                            |
| Package        | manifest `name` field               | `@art-js/records`, `apps-art-md-web` |
| Dependency set | resource name                       | `Dependency Set: Build Tools`        |

## Records

See [design/records.md](records.md)

### Project records

**Read by:**

- Commons Registry Indexer (projects view).

**Updated by:**

- migration tooling.

### Repository records

**Read by:**

- Commons Registry Indexer (repositories view)
- `workspace-cli` (checkout resolution).

**Updated by:**

- Commons Registry Peer (validates and updates)

### Namespace records

**Read by:**

- Commons Registry Indexer (namespaces view).

**Updated by:**

- humans.

### Package records

**Read by:**

- Commons Registry Indexer (package fields inside the projects view).

**Updated by:**

- Commons Registry Peer (validates and updates)

### Dependency Set records

**Migration:** There are currently ~70 instances of `Package Dependency Set`, co-located with repos and packages. Migration will move them to the registry repository, simplifying their `kind` to `Dependency Set` and make them available to the Registry Commons Peer via a registry endpoint. In the same commit, the per-repo and per-package `_records/dependencies/` files are deleted and the owning repository and package records gain a `Dependency Set:` field listing the sets they must satisfy.

**Hosted in:** `$REGISTRY/_records/dependency-sets/*.art`

**Read by:**

- Commons Registry Indexer (planned dependency views).

**Updated by:**

- humans.

## Manifests

### Root manifests

**Read by:**

- Commons Registry Indexer (project-level fields),
- Commons Registry Peer (local repository)

**Updated by:**

- Commons Registry Peer.

### Package manifests

**Read by:**

- Commons Registry Indexer (resource fields)
- Commons Registry Peer (dependency declarations).

**Updated by:**

- Commons Registry Peer.

## Eventually Read

Not consumed yet; listed so their inclusion is a decision, not an accident:

- Deployment records (`npm-deployment`, `static-app-deployment`).
- Application records.
- `_guide.md` per repository.
- `README.md` per repository and package.
- `knowledge/index.md` files across repositories.
