# Design: Namespaces Endpoint

**Purpose:** Explain the role of `namespaces.json` and the relationships consumers resolve through it.

**Publication:** Manual.

**Endpoint:** `data/namespaces.json`

**Schema:** [`schema/v1/namespaces.schema.json`](../../../schema/v1/namespaces.schema.json)

## Rationale

The view connects npm scopes to the projects and repositories that publish under them. Consumers can discover the repositories associated with a scope without inferring membership from package names.

## References

- `owner` is a kind-qualified project reference resolved against `projects.json`.
- Each value in `repositories` is a kind-qualified repository reference resolved against `repositories.json`.
- `canonical` is the npm scope used as the namespace's external identifier.

The JSON Schema is authoritative for the complete payload shape and field constraints.
