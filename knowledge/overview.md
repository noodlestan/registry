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
- **Registry indexing** — Commons Registry Indexer, which refreshes and publishes Registry views on triggers. See [design/tools.md](design/tools.md).
- **Source validation** — Commons Registry Peer, which checks repository manifests, records, and dependencies. See [design/tools.md](design/tools.md).
- **Trigger** — what causes a tool to run. See [design/workflows.md](design/workflows.md).
- **Duplication** — the same fact stored in more than one source (manifest and record). See [design/data.md](design/data.md).
- **IaC** — records reused as templates when scaffolding new resources. See [adr/registry.md](adr/registry.md).
