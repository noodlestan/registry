# Design: Data

**Purpose:** Every input and managed data source the ecosystem reads or maintains: what is duplicated across sources, and which tool reads or updates each so the duplications stay in sync. Endpoints are excluded — they are outputs.

## Duplication Map

The same facts appear in more than one place by design (see [adr/registry.md](../adr/registry.md), "accept duplication"):

| Fact                        | Manifest                  | Record                          | Kept in sync by                                       |
| --------------------------- | ------------------------- | ------------------------------- | ----------------------------------------------------- |
| `name` (canonical identity) | `name` field              | `canonicalName` / resource name | `registry-pre-commit` validates; human on change      |
| `version`                   | `version` field           | `Package Dependency` records    | `registry-pre-commit` enforces canonical versions     |
| `canonical` (slug, scope)   | `repository`/scope in use | `Canonical` field               | validation at commit; registration reports mismatches |
| `purpose`, `description`    | `description`             | `Purpose` / `Description`       | human; registration projects the record side          |

Rule of thumb: the manifest wins for what npm consumes; the record wins for what tools consume; validation flags disagreement rather than silently choosing.

## Records

Sub-level = Structures (see [design/records.md](records.md)).

### Project records

Read by: registration (projects view). Updated by: humans and migration tooling.

### Repository records

Read by: registration (repositories view), workspace-cli (checkout resolution). Updated by: humans; validated by `registry-pre-commit`.

### Namespace records

Read by: registration (namespaces view). Updated by: humans.

### Package records

Read by: registration (package fields inside the projects view). Updated by: humans.

### Dependency set records

Read by: registration (planned dependency views). Updated by: humans and `registry-pre-commit`.

## Manifests

### Root manifests

Read by: registration (project-level fields), commons (own repo), website collector. Updated by: humans and `registry-pre-commit`.

### Package manifests

Read by: registration (resource fields), commons (dependency declarations). Updated by: humans, `registry-pre-commit`, and `commons` for its generated block.

## Eventually Read

Not consumed yet; listed so their inclusion is a decision, not an accident:

- Deployment records (`npm-deployment`, `static-app-deployment`).
- Application records.
- `_guide.md` per repository.
- `README.md` per repository and package.
- `knowledge/index.md` files across repositories.
