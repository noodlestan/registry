# Design: Endpoints

**Purpose:** The endpoint contract: the URLs, the discovery index, identity derivations, and the rules consumers rely on.

## URLs

Base: `https://raw.githubusercontent.com/noodlestan/registry/main/`

| Resource             | Path                                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| Namespaces view      | `data/namespaces.json`                                                              |
| Repositories view    | `data/repositories.json`                                                            |
| Projects view        | `data/projects.json`                                                                |
| Packages view        | `data/packages.json` _(planned)_                                                    |
| Dependency Sets view | `data/dependency-sets.json` _(planned)_                                             |
| Endpoint index       | `data/endpoints.json`                                                               |
| Schemas              | `schema/v1/{namespaces,repositories,projects,packages,dependency-sets}.schema.json` |

The paths are the contract: `data/` for views, `schema/v1/` for versioned schemas. They move only with a deliberate version or location decision.

## Discovery

`data/endpoints.json` (`version: 1`) lists each endpoint with `name`, `description`, relative `url`, and absolute `schema` URL — a consumer needs no other knowledge of this repository.

## Identity Derivations

```text
canonical "noodlestan/art-js"
  -> https   https://github.com/noodlestan/art-js
  -> ssh     git@github.com:noodlestan/art-js.git
  -> raw     https://raw.githubusercontent.com/noodlestan/art-js/main/{path}

remote "git@github.com:noodlestan/art-js.git"  ->  canonical (strip prefix / .git)
```
