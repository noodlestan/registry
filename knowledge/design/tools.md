# Design: Tools

**Purpose:** One section per tool: what it is responsible for and when it runs. Field-level detail lives in [design/records.md](records.md), [design/manifests.md](manifests.md), and [design/data.md](data.md).

## `@noodlestan/registration`

**Responsibility:** Updates the registry — regenerates the view JSON files from source records and commits them — for whatever reason a run was triggered. The single writer of `data/*.json`.

**Triggers:** manual run, push from a registered repository, scheduled backstop. See [design/workflows.md](workflows.md).

**Hosted in:** `$WORKSPACE_TOOLING/cli/registration`. **Installed in:** `registry` (it runs with the registry checkout).

## `@noodlestan/commons`

**Responsibility:** Validates a monorepo's dependency declarations against the published views before a commit lands; regenerates the monorepo's own generated manifest block.

**Triggers:** pre-commit in any monorepo that adopts it.

## `@noodlestan/registry-pre-commit`

**Responsibility:** Regenerates and validates a source repository's records against manifest policy, enforcing canonical versions at commit time.

**Triggers:** pre-commit in each source repository.

## `@art-works/workspace-cli`

**Responsibility:** Workspace operations over checkouts and records: `clone`, `sanity`, `branch`, `link`, `publish`. It does **not** generate or update registry views.

**Triggers:** manual.

## Website Record Collector

**Responsibility:** Builds the website's project collection from project records.

**Triggers:** manual (`npm run update-project-records`, `update-project-collection`). Its data source moves from local checkouts to published endpoints.
