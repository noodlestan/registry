# Design: Manifests

**Purpose:** Exhaustive field specification of the `package.json` fields the ecosystem reads, at root and package level. Which tool reads or updates a field: [design/data.md](data.md).

## Fields

| Field                                       | Level         | Spec                                                                                                                                         |
| ------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                                      | root, package | Root: repository slug (`noodlestan/art-md`). Package: canonical npm name (`@art-md/records`); unscoped for private apps (`apps-art-md-web`). |
| `version`                                   | root, package | Semver; exact pins are compared against records for drift.                                                                                   |
| `description`                               | root, package | One-line summary; mirrors the record's purpose text.                                                                                         |
| `keywords`                                  | root, package | Root carries project keywords only; package manifest carries package + project keywords, deduplicated, first occurrence wins.                |
| `author`                                    | root, package | `Noodlestan` / `Noodlestan Collective`.                                                                                                      |
| `license`                                   | root, package | Always `MIT`.                                                                                                                                |
| `repository`                                | root, package | `{type, url}`; packages add `directory` (repo-relative path) — the locator for file resolution.                                              |
| `homepage`                                  | root, package | Public site URL when applicable; sits directly after `repository`.                                                                           |
| `docs`                                      | root, package | Documentation base URL when applicable; sits directly after `homepage`.                                                                      |
| `private`                                   | root, package | `true` for apps and internal tooling; filters projects out of published collections.                                                         |
| `publishConfig`                             | package       | `{ "access": "public" }` on public packages.                                                                                                 |
| `files`                                     | package       | Published file patterns; must include README, LICENSE, CHANGELOG on public packages.                                                         |
| `engines`                                   | root, package | `node >= 22`.                                                                                                                                |
| `packageManager`                            | root          | Exact toolchain pin, e.g. `npm@10.2.3`.                                                                                                      |
| `workspaces`                                | root          | Member globs; membership defines intra-repo dependencies.                                                                                    |
| `type`                                      | root, package | Explicit, typically `module`.                                                                                                                |
| `sideEffects`                               | package       | Explicit, typically `false`.                                                                                                                 |
| `main`, `types`, `module`, `exports`, `bin` | package       | Entry points and executables.                                                                                                                |
| `scripts`                                   | root, package | Lifecycle and task scripts; custom fields must precede `scripts`.                                                                            |
| `dependencies`, `devDependencies`           | root, package | Exact pins (`peerDependencies` use `^`).                                                                                                     |
| `artDependencies`                           | root          | Array of `{role, repository                                                                                                                  | package, url, directory, qualifier}`— relationships owned by the declaring manifest.`directory` is required unless the target is a repository root. |

## Field Ordering

Custom fields (`homepage`, `docs`, `artDependencies`) live among "other keys", after tooling configs and before `scripts` — see `$PROJECT/_ops/packages/policy.md` while it remains the maintained copy.
