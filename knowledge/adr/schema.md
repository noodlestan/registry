# ADR: Schema

**Purpose:** Why identities and schema versions are expressed the way they are.

## Decision: Canonicals As Identifiers

Every cross-reference in views and manifests uses the entity's canonical form — GitHub slug for repositories, npm scope for namespaces, npm name for packages, resource name for projects and sets. Rationale: joins are exact string equality against identities that already exist in the world outside this registry; no synthetic id pool to allocate, keep stable, or translate — and the same string works in a manifest, a view, and a URL.

## Decision: Version Schemas By Path, Identify Payloads By Id

Schema compatibility lives in two complementary tokens: the schema path (`schema/v1/…`) for location-and-version, and the payload's `schema` id (`noodlestan.registry.namespaces/1`) for compatibility detection. Rationale: payloads already in the wild must never point at a moved or redefined file — the id survives repository renames and path moves, while the path gives consumers a boring, cacheable URL. See [design/schema.md](../design/schema.md).
