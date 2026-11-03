# ADR: Schema

**Purpose:** Decisions about registry identity, entity identifiers, and schema versioning.

# ADR: Schema

## Decision: Canonicals as Identifiers

**Status:** ADOPTED

**Decision:** Every cross-reference in views and manifests uses the entity's canonical form: GitHub slug for repositories, npm scope for namespaces, npm name for packages, and resource name for projects and sets.

**Consequences:** Joins use exact string equality against identities that already exist outside the registry. No synthetic ID pool to allocate, stabilise, or translate; the same string works in manifests, views, and URLs.

## Decision: Version Schemas by Path, Identify Payloads by ID

**Status:** ADOPTED

**Decision:** Schema compatibility uses two complementary tokens: the schema path (`schema/v1/…`) for location and version, and the payload's `schema` ID (`noodlestan.registry.namespaces/1`) for compatibility detection.

**Consequences:** Payloads in the wild never point at a moved or redefined file. The ID survives repository renames and path moves, while the path provides a stable, cacheable URL. See [design/schema.md](../design/schema.md).
