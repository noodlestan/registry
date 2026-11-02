# Knowledge: Registry

## Documents

| Document                    | Purpose                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `overview.md` _(planned)_   | What the registry ecosystem is: short definitions per term and the canonical identities table |
| `components.md` _(planned)_ | Every component — endpoints, schemas, manifest design, CLIs, pre-commit hooks, GitHub Actions |

## Design Documents

| Document                          | Purpose                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `design/schema.md` _(planned)_    | How view schemas are versioned and referenced — without repeating the schemas themselves |
| `design/manifests.md` _(planned)_ | Exhaustive field specification of the manifest fields the ecosystem reads                |
| `design/workflows.md` _(planned)_ | One overview table, then one section per trigger → action                                |
| `design/endpoints.md` _(planned)_ | The endpoint contract: URLs, discovery index, identity rules, derivations                |

## Decision Records

| Record                         | Purpose                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `adr/registry.md` _(planned)_  | Global principles: source of truth, records as IaC and metadata, async refresh |
| `adr/endpoints.md` _(planned)_ | Raw GitHub as the transport for published views                                |
| `adr/schema.md` _(planned)_    | Canonicals as identifiers; versioned schema paths                              |
| `adr/manifests.md` _(planned)_ | Normalized manifests with locally owned `artDependencies`                      |

Documents in this tree are self-contained: contracts are restated here in summary, never linked from elsewhere.
