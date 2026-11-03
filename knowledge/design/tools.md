# Design: Tools

**Purpose:** Identify the tools that produce and consume Registry data and explain their responsibilities.

**Commons repository:** `noodlestan/noodle-commons` hosts both tools.

## Commons Registry Indexer — `@noodle-commons/indexer`

**Binary:** `commons-indexer-cli`.

See [design/workflows.md](workflows.md).

**Responsibilities:**

- The source of truth for the list of "managed repositories" (its config).
- The single writer of `data/*.json`.
- Updates the registry data endpoints on pushes to managed repositories, by regenerating the views from current snapshot and incremental updates.
- Updates the registry data endpoints on schedule by re-reading all sources and regenerating the views.

**Triggers:**

- manual run
- push from a managed repository
- scheduled backstop.

**Hosted in:** `$COMMONS/cli/indexer`.

**Installed in:** `registry` (it runs with the registry checkout).

## Commons Registry Peer — `@noodle-commons/peer`

**Binary:** `commons-peer-cli`.

**Responsibilities:**

- Validates monorepo root and package manifests vs policy.
- Autofixes monorepo and package manifests vs policy and vs records when fields are absent.
- Validates monorepo root vs root records, and package manifest vs package records.
- Identifies cross repo dependencies and reflects them in the root manifest.
- Identifies recuprocal cross repo artDependencies (planning/execution) and reflects them in the root manifest.
- Validates monorepo and package manifest dependencies against dependency sets (dependency sets are only recorded in records, never in manifests), example: `Dependency Set: Root` (available in registry).
- Validates package manifest dependencies against `Dependency Set: Root` (available in registry).

**Triggers:** pre-commit in source repository.

**Hosted in:** `$COMMONS/cli/peer`.

**Installed in:** All managed monorepos.

## `@art-works/workspace-cli`

**Responsibilities:**

- Consumer only — executes workspace operations over checkouts: `clone`, `sanity`, `branch`, `link`, `publish` — Currently reads records, might consume registry endpoints in the future.

## `noodlestan-web` Website Collection Builder

**Responsibilities:**

- Consumer only — builds the website's project collection from project records. Currenly reads records, will switch to registry soon.

**Triggers:** manual (`npm run update-project-records`, `update-project-collection`).
