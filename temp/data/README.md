# Registry Inventory Inputs

**Status:** temporary planning input — not a published Registry endpoint.

`$REGISTRY/temp/data/` holds one source-cited JSON snapshot per workspace checkout: every root and nested `package.json` found in that checkout, plus the repository, project, package, and `Package Dependency Set` records that describe those manifests. The snapshot exists so the Packages and Dependency Sets iterations of `plan-poc-manifest-registry` consume one durable input instead of rescanning checkouts.

This directory sits beside the published Registry views (`data/`, `schema/`) but is **not** one of them: it is never served as an endpoint, and it is removed only by the `Clean Up Registry` iteration.

## Path rule

- Every inventory lives at `$REGISTRY/temp/data/{owner}/{repository}/inputs.json`, where `{owner}/{repository}` is that checkout's registered repository canonical slug.
- Worked example: canonical `noodlestan/art-md` maps to `temp/data/noodlestan/art-md/inputs.json`.
- One file per checkout: each checkout resolves to exactly one registered canonical, so each repository owns exactly one snapshot that consumers can read, diff, and check for staleness on its own. Generation aborts — writing nothing — when a checkout has no registered canonical, two checkouts resolve to the same canonical, or a canonical is not a safe `owner/repository` slug, so no repository can overwrite another's inventory.
- `$REGISTRY/temp/data/README.md` (this file) sits beside the per-checkout directories and is the data dictionary for all of them.
- Checkouts with missing, malformed, or conflicting sources still get exactly one `inputs.json`; their conditions are reported in that file's `issues` array rather than by omission.

## Keys of `schemaVersion: 2`

Every `inputs.json` contains exactly these top-level keys:

| Key                   | Type    | Meaning                                                                                      |
| --------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `schemaVersion`       | integer | Contract version of this layout; currently `2`.                                              |
| `repositoryCanonical` | string  | Registered canonical slug observed for the checkout (`owner/repository`).                    |
| `checkout`            | object  | Which checkout this file describes.                                                          |
| `sourceSnapshot`      | object  | When and from which git state the snapshot was captured.                                     |
| `coverage`            | object  | Which records and manifests were covered while building the file.                            |
| `issues`              | array   | Missing, malformed, conflicting, or unresolved source data observed while building the file. |
| `manifests`           | array   | One entry per inventoried root or nested `package.json`.                                     |

### `checkout`

| Key    | Type   | Meaning                                                                    |
| ------ | ------ | -------------------------------------------------------------------------- |
| `name` | string | Checkout directory name under `$WORKSPACE/checkouts`.                      |
| `path` | string | Checkout directory relative to `$WORKSPACE` (example: `checkouts/art-md`). |

### `sourceSnapshot`

| Key          | Type           | Meaning                                                                                                                                      |
| ------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `capturedAt` | string         | ISO 8601 UTC timestamp of the run.                                                                                                           |
| `commit`     | string \| null | `HEAD` of the source checkout at capture time; `null` when git could not report it (also recorded as an issue).                              |
| `dirtyPaths` | string[]       | Uncommitted and untracked paths reported by git at capture time, relative to the source checkout, sorted; empty when the checkout was clean. |

### `coverage`

| Key                        | Type           | Meaning                                                                                                                                                              |
| -------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkoutRecordPath`       | string \| null | Registered checkout record under `$WORKSPACE/_records/checkouts`, written relative to the source checkout (example: `../../_records/checkouts/art-md-checkout.art`). |
| `repositoryRecordPath`     | string \| null | Registered repository record under `$WORKSPACE/_records/repositories`, written relative to the source checkout (example: `../../_records/repositories/art-md.art`).  |
| `manifestPathsDiscovered`  | string[]       | Every root and nested `package.json` found in the checkout (source-checkout-relative, sorted), including malformed ones.                                             |
| `manifestPathsInventoried` | string[]       | The discovered manifests that have a `manifests` entry; malformed manifests are discovered but not inventoried.                                                      |
| `recordPaths`              | string[]       | Every record file present anywhere in the checkout under a `_records/` directory (source-checkout-relative, sorted).                                                 |

### `issues[]`

| Key          | Type           | Meaning                                                                                                               |
| ------------ | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `sourcePath` | string \| null | Source-checkout-relative path of the affected (or expected but absent) source data; `null` only when no path applies. |
| `code`       | string         | Stable issue code; see "Issue codes" below.                                                                           |
| `message`    | string         | What was observed, citing the source paths involved.                                                                  |

### `manifests[]`

| Key                         | Type             | Meaning                                                                                                                                                                                                      |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `path`                      | string           | Manifest path relative to the source checkout.                                                                                                                                                               |
| `canonical`                 | string \| null   | The observed manifest `name`.                                                                                                                                                                                |
| `version`                   | string \| null   | The observed manifest `version`.                                                                                                                                                                             |
| `private`                   | boolean \| null  | The observed manifest `private`.                                                                                                                                                                             |
| `license`                   | string \| null   | The observed manifest `license`.                                                                                                                                                                             |
| `keywords`                  | string[] \| null | The observed manifest `keywords` array.                                                                                                                                                                      |
| `dependencies`              | object \| null   | The exact `dependencies` map as declared (direct declarations only).                                                                                                                                         |
| `peerDependencies`          | object \| null   | The exact `peerDependencies` map as declared.                                                                                                                                                                |
| `devDependencies`           | object \| null   | The exact `devDependencies` map as declared.                                                                                                                                                                 |
| `repositoryRecord`          | object \| null   | `{ path, identity }` for the checkout's co-located `_records/repository.art`, or `null` when that record is absent.                                                                                          |
| `projectRecord`             | object \| null   | `{ path, identity }` for the checkout's co-located `_records/project.art`, or `null` when that record is absent.                                                                                             |
| `packageRecord`             | object \| null   | `{ path, identity }` for the package record resolved to this manifest, or `null` (root manifests and nested manifests without a resolved record; the latter raise an issue).                                 |
| `dependencySetDeclarations` | array            | `{ path, fields }` per distinct `Package Dependency Set` referenced by the manifest's entity record (its package record, or the checkout repository record when there is no package record); `[]` when none. |
| `recordFiles`               | string[]         | Record files describing this manifest's repository/package entity: the checkout's root `_records/**` plus, when present, the manifest directory's own `_records/**`.                                         |

### Record references (`repositoryRecord`, `projectRecord`, `packageRecord`)

Each record reference is `{ "path": string, "identity": object }`; `path` is source-checkout-relative. `identity` carries the parsed identity and locator fields of the record, each `null` when the record does not declare it:

| Reference          | `identity` keys                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `repositoryRecord` | `name`, `canonical`, `remote`, `owner`, `packageFile`, `private`, `workspaces`               |
| `projectRecord`    | `name`, `owner`, `repository`, `code`, `private`                                             |
| `packageRecord`    | `name`, `canonicalName`, `path`, `packageFile`, `namespace`, `owner`, `private`, `published` |

Value handling: scalar values keep the text as written with the backticks that fully enclose them removed; `workspaces` and other list values are the bullet contents without the marker; `private` and `published` become JSON booleans when the record writes `true`/`false` and stay text otherwise.

### `dependencySetDeclarations[]`

| Key      | Type   | Meaning                                                                                               |
| -------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `path`   | string | Source-checkout-relative path of the record file declaring the set.                                   |
| `fields` | object | The declaration's parsed content: each `**Field:**` name of the `## Package Dependency Set:` section. |

In `fields`, a scalar field maps to its text as written (enclosing backticks stripped); a list field maps to the record's bullet lines verbatim, indentation included, so nested kind groups survive exactly as authored.

### Path rules

- `checkout.path` is relative to `$WORKSPACE`.
- Manifest paths, record paths, `issues[].sourcePath`, and `sourceSnapshot.dirtyPaths` are relative to the source checkout they describe.
- `coverage.checkoutRecordPath` and `coverage.repositoryRecordPath` cite workspace-level records through the same source-checkout-relative rule, which resolves to `../../_records/...`.
- `repositoryCanonical` is a slug, not a path; the output directory is derived from it.

### `null` versus `{}`

- A missing scalar (manifest `name`, `version`, `private`, `license`, an undeclared identity field, an absent record reference) is `null`; the key is always present.
- A dependency map or the `keywords` array that the manifest does not declare is `null`; a declaration the manifest writes empty is preserved as `{}` or `[]`. The two are never collapsed into each other.
- `dependencySetDeclarations` and the `coverage` lists are always present; an empty array means "present but empty", which is different from `null`.

## Worked example

A checkout `noodlestan/example` with a root manifest, one nested package manifest, one malformed manifest, and a root repository record that references `Package Dependency Set: Build Tools`:

```json
{
  "schemaVersion": 2,
  "repositoryCanonical": "noodlestan/example",
  "checkout": {
    "name": "example",
    "path": "checkouts/example"
  },
  "sourceSnapshot": {
    "capturedAt": "2026-11-06T09:00:00.000Z",
    "commit": "9f2c1ab7d4e6f5a3b2c1d0e9f8a7b6c5d4e3f2a1",
    "dirtyPaths": ["libs/widget/package.json"]
  },
  "coverage": {
    "checkoutRecordPath": "../../_records/checkouts/example-checkout.art",
    "repositoryRecordPath": "../../_records/repositories/example.art",
    "manifestPathsDiscovered": [
      "libs/widget/package.json",
      "package.json",
      "tools/broken/package.json"
    ],
    "manifestPathsInventoried": ["libs/widget/package.json", "package.json"],
    "recordPaths": [
      "_records/dependencies/build-tools.art",
      "_records/project.art",
      "_records/repository.art",
      "libs/widget/_records/package.art"
    ]
  },
  "issues": [
    {
      "sourcePath": "tools/broken/package.json",
      "code": "malformed-manifest",
      "message": "Manifest is not parseable JSON (Unexpected token } in JSON at position 42)."
    }
  ],
  "manifests": [
    {
      "path": "package.json",
      "canonical": "example",
      "version": "0.1.0",
      "private": true,
      "license": null,
      "keywords": null,
      "dependencies": null,
      "peerDependencies": null,
      "devDependencies": {
        "prettier": "^3.0.0"
      },
      "repositoryRecord": {
        "path": "_records/repository.art",
        "identity": {
          "name": "Example",
          "canonical": "noodlestan/example",
          "remote": "git@github.com:noodlestan/example.git",
          "owner": "Project: Example",
          "packageFile": "package.json",
          "private": false,
          "workspaces": "None"
        }
      },
      "projectRecord": {
        "path": "_records/project.art",
        "identity": {
          "name": "Example",
          "owner": "Project: Tooling",
          "repository": "Repository: Example",
          "code": "https://github.com/noodlestan/example",
          "private": false
        }
      },
      "packageRecord": null,
      "dependencySetDeclarations": [
        {
          "path": "_records/dependencies/build-tools.art",
          "fields": {
            "Dependencies": ["- Package Dependency: Turbo", "- Package Dependency: Lefthook"]
          }
        }
      ],
      "recordFiles": [
        "_records/dependencies/build-tools.art",
        "_records/project.art",
        "_records/repository.art"
      ]
    },
    {
      "path": "libs/widget/package.json",
      "canonical": "@example/widget",
      "version": "1.2.3",
      "private": false,
      "license": "MIT",
      "keywords": ["example", "widget"],
      "dependencies": {
        "turbo": "^2.9.18"
      },
      "peerDependencies": {},
      "devDependencies": null,
      "repositoryRecord": {
        "path": "_records/repository.art",
        "identity": {
          "name": "Example",
          "canonical": "noodlestan/example",
          "remote": "git@github.com:noodlestan/example.git",
          "owner": "Project: Example",
          "packageFile": "package.json",
          "private": false,
          "workspaces": "None"
        }
      },
      "projectRecord": {
        "path": "_records/project.art",
        "identity": {
          "name": "Example",
          "owner": "Project: Tooling",
          "repository": "Repository: Example",
          "code": "https://github.com/noodlestan/example",
          "private": false
        }
      },
      "packageRecord": {
        "path": "libs/widget/_records/package.art",
        "identity": {
          "name": "Widget",
          "canonicalName": "@example/widget",
          "path": "libs/widget/",
          "packageFile": "package.json",
          "namespace": "@example",
          "owner": "Project: Example",
          "private": false,
          "published": true
        }
      },
      "dependencySetDeclarations": [],
      "recordFiles": [
        "_records/dependencies/build-tools.art",
        "_records/project.art",
        "_records/repository.art",
        "libs/widget/_records/package.art"
      ]
    }
  ]
}
```

## Observed values and issue reporting

Values are copied as observed: nothing is inferred, reconciled, or normalized.

- Missing data becomes `null` (or an empty array where the contract says "always an array"), never a guessed value.
- Malformed data is reported as an issue; a malformed manifest keeps its place in `manifestPathsDiscovered` and is left out of `manifests` and `manifestPathsInventoried`.
- Conflicting data (two records claiming different canonicals, a package record whose `Path:` disagrees with its location) is reported with every source path and both values stay in the file as observed.
- Unresolved references (a record naming a `Package Dependency Set` that this checkout never declares) stay unresolved and are reported; names are matched exactly, never fuzzily.
- Record data is parsed without rewriting: field text keeps its wording, list lines keep their markers and indentation where the contract says "verbatim".

### Issue codes

Recorded in the `issues` array of the affected checkout:

| Code                                   | Meaning                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `duplicate-repository-record`          | More than one registered repository record resolves the checkout's repository name; all agree on the canonical.        |
| `source-snapshot-unavailable`          | git could not report the checkout's commit and/or dirty state.                                                         |
| `missing-checkout-repository-record`   | The checkout has no co-located `_records/repository.art`.                                                              |
| `repository-canonical-conflict`        | The co-located repository record and the registered repository record declare different canonicals.                    |
| `missing-project-record`               | The checkout has no co-located `_records/project.art`.                                                                 |
| `malformed-record`                     | A record file is unreadable or lacks its expected `## {Kind}:` section.                                                |
| `multiple-package-records-in-file`     | A `package.art` file declares more than one `## Package:` section; only the first is inventoried.                      |
| `duplicate-dependency-set-declaration` | Two record files declare the same `## Package Dependency Set:` name within one checkout.                               |
| `malformed-manifest`                   | A discovered `package.json` is unreadable or not a JSON object; it is reported, never omitted silently.                |
| `missing-manifest-name`                | The manifest declares no `name`; `canonical` is `null`.                                                                |
| `malformed-manifest-field`             | `name`, `version`, `private`, `license`, `keywords`, or a dependency map has the wrong JSON type; the value is `null`. |
| `missing-package-record`               | A nested manifest has no resolvable package record.                                                                    |
| `package-record-path-conflict`         | A package record's `Path:` disagrees with the directory it sits in.                                                    |
| `duplicate-package-record-claim`       | Two package records claim the same manifest directory.                                                                 |
| `package-record-without-manifest`      | A package record describes a directory where no `package.json` was discovered.                                         |
| `unresolved-dependency-set-reference`  | An entity record references a set name this checkout never declares.                                                   |

### Blockers (generation aborts, nothing is written)

| Code                              | Meaning                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `unmatched-checkout`              | A checkout directory has no registered checkout record.                                                |
| `unmatched-checkout-record`       | A registered checkout record names a location with no checkout directory (or declares no `Location:`). |
| `duplicate-checkout-record`       | More than one registered checkout record matches the same checkout directory.                          |
| `unresolved-repository-canonical` | The checkout's repository record, canonical, or canonical agreement cannot be resolved.                |
| `unsafe-repository-canonical`     | The canonical is not a safe `owner/repository` slug (would allow overwriting another path).            |
| `duplicate-repository-canonical`  | Two checkouts resolve to the same canonical (would overwrite one inventory with another).              |

## Schema version policy

Increment `schemaVersion` whenever a key is added or removed, a type changes, the `null`/`{}` semantics change, or a field's meaning changes. Consumers must stop when they meet a `schemaVersion` they do not support. Data-value changes alone (new manifests, new issues, different versions) never bump the schema version.

## Regeneration ownership

Only the maintained inventory generator — `$REGISTRY/scripts/inventory-registry-inputs.mjs`, run as part of the `inventory-registry-inputs` iteration of `plan-poc-manifest-registry` — may create or replace this README and the `inputs.json` files.

Consumers that find the snapshot incomplete or missing report it and wait for that iteration to regenerate it. Consumers must not edit these files and must not regenerate them independently.

## Consumer obligations

- Read this README first, then the `inputs.json` files.
- Check `schemaVersion` and the checkout coverage (exactly one file per checkout) before trusting the data; stop on an unsupported version and request regeneration. Treat `sourceSnapshot` as provenance for diagnostics, not as a freshness gate.
- Do not rescan manifests and do not read lockfiles; this snapshot is the sole manifest-discovery input.
- Use only direct dependencies from the three manifest maps (`dependencies`, `peerDependencies`, `devDependencies`); never infer transitive dependencies.
- Preserve observed values; surface conflicts and issues instead of guessing a winner.

## Regenerating

From `$WORKSPACE`:

```bash
node checkouts/registry/scripts/inventory-registry-inputs.mjs
```

The run is read-only outside `$REGISTRY/temp/data/`: it reads checkout records, repository/project/package records, dependency-set declarations, and `package.json` files, then replaces the `inputs.json` outputs and this README. On a blocker it writes nothing and exits with a non-zero status. The generator lays the outputs out with the repository's Prettier when it is installed, so a fresh run stays `npm run lint`-clean; after a run without Prettier, run `npm run lint:fix` from `$REGISTRY` before committing.
