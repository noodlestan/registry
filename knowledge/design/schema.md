# Design: Schema

**Purpose:** How view schemas are versioned and referenced — the rules only; the schemas themselves live at `schema/v1/*.schema.json` and are never restated here.

## Versioning

- **Path is the version:** `schema/v1/…`. An incompatible change ships as `schema/v2/…`; old payloads keep resolving against v1.
- **Payload `schema` id is the compatibility token:** e.g. `noodlestan.registry.namespaces/1`. Consumers detect evolution without fetching anything — see [adr/schema.md](../adr/schema.md).
- **`$id` is absolute:** each schema document declares its own canonical raw URL, so a schema is itself an addressable resource.

## Rules

- New fields are **optional** within a version; required-set changes are a version bump.
- Views are objects with `additionalProperties: false` — unknown keys fail validation, which is exactly why additive fields are introduced carefully.
- The full schemas are authoritative here: `schema/v1/*.schema.json` in this repository; this document never duplicates them.
