# Components: Registry

**Purpose:** Inventory every component of the registry ecosystem — what exists today, what is planned, and where it lives.

## Endpoints

Raw GitHub URLs on `noodlestan/registry` repository.

Specification in [design/endpoints.md](design/endpoints.md).

Inventory in its own endpoint: [endpoints.json](../data/endpoints.json).

## Manifest Design

Root and package manifests are governed by [Project: Noodlestan Ops]($OPS/knowledge/design/manifests.md).

## CLIs

| Tool                     | Responsibility                                      | Status  | Home                                                 |
| ------------------------ | --------------------------------------------------- | ------- | ---------------------------------------------------- |
| Commons Registry Indexer | Generates and publishes Registry data views.        | PLANNED | `noodle-commons/cli/indexer` (`commons-indexer-cli`) |
| Commons Registry Peer    | Checks source manifests, records, and dependencies. | PLANNED | `noodle-commons/cli/peer` (`commons-peer-cli`)       |

## Pre-commit Hooks

| Hook                       | Runs in            | Effect                                     |
| -------------------------- | ------------------ | ------------------------------------------ |
| Commons Registry Peer      | adopting monorepos | validates source data and gates the commit |
| repository lint (lefthook) | `registry`         | formatting of views, schemas, knowledge    |

## GitHub Actions

| Workflow                                    | Status  | Effect                                      |
| ------------------------------------------- | ------- | ------------------------------------------- |
| Commons Registry Indexer refresh on push    | PLANNED | a managed repository's push refreshes views |
| Commons Registry Indexer scheduled backstop | PLANNED | periodic refresh regardless of pushes       |
