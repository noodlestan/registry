# Knowledge: Registry

## Documents

| Document                       | Purpose                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| [overview.md](overview.md)     | What the registry ecosystem is: one-line definitions and the canonical identifier per entity   |
| [components.md](components.md) | Inventory of every component: endpoints, schemas, manifest design, CLIs, hooks, GitHub actions |

## Design Documents

| Document                                   | Purpose                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [design/data.md](design/data.md)           | Input data sources, their duplications, and which tool reads or updates each to stay in sync |
| [design/endpoints.md](design/endpoints.md) | The endpoint contract: URLs, discovery index, identity rules, derivations                    |
| [design/records.md](design/records.md)     | The records the tools read: one section per Structure, fields as used by the registry        |
| [design/schema.md](design/schema.md)       | How view schemas are versioned and referenced — without repeating the schemas                |
| [design/tools.md](design/tools.md)         | One section per tool: its responsibility and trigger                                         |
| [design/workflows.md](design/workflows.md) | One overview table, then one section per trigger → action                                    |

**See Also:**

- `$OPS/knowledge/design/manifests.md` — Exhaustive manifest field specification (hosted in Ops knowledge).
- `$OPS/knowledge/design/dependency-sets.md` — Manifest validation against dependency sets: inputs, checks, responsibilities (hosted in Ops knowledge).

## Decision Records

| Record                               | Purpose                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [adr/registry.md](adr/registry.md)   | Global principles: source of truth, records as IaC, records as metadata, duplication, async refresh |
| [adr/endpoints.md](adr/endpoints.md) | Raw GitHub as transport; endpoint-first consumption                                                 |
| [adr/schema.md](adr/schema.md)       | Canonicals as identifiers; versioned schema paths                                                   |
| [adr/manifests.md](adr/manifests.md) | Normalized manifests with locally owned `artDependencies`                                           |
