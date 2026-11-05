# Design: Endpoints

**Purpose:** The endpoint contract: the URLs, the discovery index, identity derivations, and the rules consumers rely on.

## Endpoints

Base: `https://raw.githubusercontent.com/noodlestan/registry/main/`

| Resource             | Path                        | Status  | Spec                                              |
| -------------------- | --------------------------- | ------- | ------------------------------------------------- |
| Namespaces view      | `data/namespaces.json`      | manual  | [namespaces](./endpoints/namespaces.md)           |
| Repositories view    | `data/repositories.json`    | manual  | [repositories](./endpoints/repositories.md)       |
| Projects view        | `data/projects.json`        | manual  | [projects](./endpoints/projects.md)               |
| Packages view        | `data/packages.json`        | planned | [packages](./endpoints/packages.md)               |
| Dependency Sets view | `data/dependency-sets.json` | planned | [dependency sets](./endpoints/dependency-sets.md) |
| Endpoint index       | `data/endpoints.json`       | manual  | [index](./endpoints/index.md)                     |

The paths are the contract: `data/` for views, `schema/v1/` for versioned schemas. They move only with a deliberate version or location decision.

Status describes how each endpoint is currently produced: `manual` means committed hand-authored data, `automated` means generated and maintained by tooling, and `planned` means not yet published.

## Discovery

`data/endpoints.json` (`version: 1`) lists each endpoint with `name`, `description`, relative `url`, and absolute `schema` URL — a consumer needs no other knowledge of this repository.

The index lists the published views, not itself. Its contract is documented in [endpoints/index.md](./endpoints/index.md).

## Schemas

Published view schemas live at `schema/v1/{name}.schema.json`. Each endpoint's design document links its schema and describes its payload contract. An incompatible contract change requires a new schema version path.

## Identity Derivations

```text
canonical "noodlestan/art-js"
  -> https   https://github.com/noodlestan/art-js
  -> ssh     git@github.com:noodlestan/art-js.git
  -> raw     https://raw.githubusercontent.com/noodlestan/art-js/main/{path}

remote "git@github.com:noodlestan/art-js.git"  ->  canonical (strip prefix / .git)
```
