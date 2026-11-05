# Design: Projects Endpoint

**Purpose:** Explain how `projects.json` represents the ownership graph and gives consumers useful locators for owned resources.

**Publication:** Manual.

**Endpoint:** `data/projects.json`

**Schema:** [`schema/v1/projects.schema.json`](../../../schema/v1/projects.schema.json)

## Rationale

Projects form the ownership graph used to interpret the other Registry views. Top-level projects have no parent owner; child projects refer to their owner by the kind-qualified project name.

`resources` is a nested array of partial resource data, not a second reference object. A partial carries the identity and locator fields a consumer needs in the project context, avoiding a join merely to find an owned resource. For package resources, `canonical` identifies the package and `path` locates it within the project's repository. Optional links provide direct code, website, or documentation destinations. `private` lets consumers distinguish resources that should not be resolved through npm.

## References

- `owner` is a kind-qualified project reference resolved against another project entry.
- `repository` is a kind-qualified repository reference resolved against `repositories.json`.
- Resource partials remain embedded here; the package endpoint, when delivered, is the dedicated package inventory rather than a change to this view's existing representation.

The JSON Schema is authoritative for the complete payload shape, required fields, and field constraints.
