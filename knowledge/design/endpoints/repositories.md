# Design: Repositories Endpoint

**Purpose:** Explain how `repositories.json` identifies repositories and supports joins from other Registry views and manifests.

**Publication:** Manual.

**Endpoint:** `data/repositories.json`

**Schema:** [`schema/v1/repositories.schema.json`](../../../schema/v1/repositories.schema.json)

## Rationale

Repository identity is published in both GitHub slug and SSH remote form because consumers need both stable joins and a clone address. `canonical` is the join key used by repository links in manifests; `remote` is the transport address. For GitHub repositories, the canonical slug determines the remote.

## References

- `owner` is a kind-qualified project reference resolved against `projects.json`.
- Other views refer to repositories by their kind-qualified `name`; manifest repository links use `canonical`.

The JSON Schema is authoritative for the complete payload shape and field constraints.
