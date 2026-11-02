# Overview: Registry

**Purpose:** Introduce the registry ecosystem in one screen: a one-line definition per term with a pointer to the document that explains it, and the canonical identifier of every entity.

## Definitions

- **Record** — a structured `.art` file describing one resource; its fields are defined by a Structure. See [design/records.md](design/records.md).
- **Structure** — the field schema of a record kind. See `$DOMAINS/packages/structures/package.art` (and siblings).
- **Manifest** — a `package.json`, at root or package level. See [design/manifests.md](design/manifests.md).
- **`artDependencies`** — the manifest field declaring planning/implementation relationships. See [design/manifests.md](design/manifests.md).
- **Canonical** — the natural machine identity of an entity (slug, scope, npm name). See [adr/schema.md](adr/schema.md).
- **View** — a published JSON projection of records. See [design/schema.md](design/schema.md).
- **Endpoint** — a raw GitHub URL serving a view or schema. See [design/endpoints.md](design/endpoints.md).
- **Registration** — `@noodlestan/registration`, the tool that updates the registry on triggers. See [design/tools.md](design/tools.md).
- **Trigger** — what causes a tool to run. See [design/workflows.md](design/workflows.md).
- **Duplication** — the same fact stored in more than one source (manifest and record). See [design/data.md](design/data.md).
- **IaC** — records reused as templates when scaffolding new resources. See [adr/registry.md](adr/registry.md).

## Canonicals Per Entity

| Entity         | Canonical form   | Example                               |
| -------------- | ---------------- | ------------------------------------- |
| Project        | resource name    | `Project: Art JS`                     |
| Repository     | GitHub slug      | `noodlestan/art-js`                   |
| Namespace      | npm scope        | `@art-js`                             |
| Package        | npm package name | `@art-js/records`, `apps-art-md-web`  |
| Dependency set | resource name    | `Package Dependency Set: Build Tools` |
| Manifest       | `name` field     | `noodlestan/art-md`                   |
| View           | schema id        | `noodlestan.registry.namespaces/1`    |
| Endpoint       | raw GitHub URL   | `…/main/data/namespaces.json`         |
