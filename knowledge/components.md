# Components: Registry

**Purpose:** Inventory every component of the registry ecosystem — what exists today, what is planned, and where it lives.

## Endpoints

| Endpoint                             | Serves                     | Status |
| ------------------------------------ | -------------------------- | ------ |
| `data/namespaces.json`               | Namespaces view            | LIVE   |
| `data/repositories.json`             | Repositories view          | LIVE   |
| `data/projects.json`                 | Projects view              | LIVE   |
| `data/endpoints.json`                | Endpoint index (discovery) | LIVE   |
| `schema/v1/namespaces.schema.json`   | Namespaces schema          | LIVE   |
| `schema/v1/repositories.schema.json` | Repositories schema        | LIVE   |
| `schema/v1/projects.schema.json`     | Projects schema            | LIVE   |

All are raw GitHub URLs on `noodlestan/registry` — see [design/endpoints.md](design/endpoints.md).

## Manifest Design

| Component               | Scope                        | Reference                                  |
| ----------------------- | ---------------------------- | ------------------------------------------ |
| Root manifest fields    | monorepo root `package.json` | [design/manifests.md](design/manifests.md) |
| Package manifest fields | package `package.json`       | [design/manifests.md](design/manifests.md) |

## CLIs

| Tool                              | Responsibility                                             | Status  | Home                                                           |
| --------------------------------- | ---------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| `@noodlestan/registration`        | Updates the registry views on its triggers                 | PLANNED | `$WORKSPACE_TOOLING/cli/registration`, installed in `registry` |
| `@noodlestan/commons`             | Validates a monorepo's dependencies at pre-commit          | PLANNED | `$WORKSPACE_TOOLING/cli/commons`                               |
| `@noodlestan/registry-pre-commit` | Regenerates and validates records in a source repository   | PLANNED | `$WORKSPACE_TOOLING`                                           |
| `@art-works/workspace-cli`        | Workspace operations: clone, sanity, branch, link, publish | EXISTS  | `$ART_WORKS/cli/workspace`                                     |
| Website record collector          | Collects project records into the website's data           | EXISTS  | `$NOODLESTAN_WEB/scripts`                                      |

## Pre-commit Hooks

| Hook                       | Runs in             | Effect                                          |
| -------------------------- | ------------------- | ----------------------------------------------- |
| `commons` job              | any monorepo        | dependency validation gates the commit          |
| `registry-pre-commit`      | source repositories | records regenerated and validated before commit |
| repository lint (lefthook) | `registry`          | formatting of views, schemas, knowledge         |

## GitHub Actions

| Workflow                        | Status  | Effect                                             |
| ------------------------------- | ------- | -------------------------------------------------- |
| Registration refresh on push    | PLANNED | a known repository's push refreshes registry views |
| Registration scheduled backstop | PLANNED | periodic refresh regardless of pushes              |
