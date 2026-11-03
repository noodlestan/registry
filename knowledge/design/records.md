# Design: Records

**Purpose:** The records the registry and its tools read — one section per Structure, summarising the fields they use. Who reads or updates what lives in [design/data.md](data.md); field semantics of manifests live in `$OPS/knowledge/design/manifests.md`.

## Project

**Structure:** `$DOMAINS/projects/structures/project.art`

| Field         | Description   | Example                                                                                 |
| ------------- | ------------- | --------------------------------------------------------------------------------------- |
| `name`        | Resource name | `Project: Art JS`                                                                       |
| `purpose`     |               | `Tools for working with Art files as programs.`                                         |
| `description` |               | `Art JS libraries and tools for authoring, validating, and projecting Art MD programs.` |
| `keywords`    |               | `art, markdown, ast`                                                                    |
| `owner`       | Reference     | `Project: Artificials`                                                                  |
| `repository`  | Reference     | `Repository: Art JS`                                                                    |
| `code`        |               | `https://github.com/noodlestan/art-js`                                                  |
| `website`     |               | `https://art-md.noodlestan.org`                                                         |
| `docs`        |               | `https://art-md.noodlestan.org/docs`                                                    |
| `private`     |               | `true`                                                                                  |
| `resources`   | Owned things  | `Package: Records`                                                                      |

## Repository

**Structure:** `$DOMAINS/repositories/structures/repository.art`

| Field         | Description   | Example                                                                                      |
| ------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `name`        | Resource name | `Repository: Art JS`                                                                         |
| `canonical`   | GitHub slug   | `noodlestan/art-js`                                                                          |
| `remote`      | SSH           | `git@github.com:noodlestan/art-js.git`                                                       |
| `owner`       | Reference     | `Project: Art JS`                                                                            |
| `purpose`     |               | `Host and manage the Art JS packages and tools, and their knowledge and planning artefacts.` |
| `description` |               | `Monorepo containing the Art JS roadmap and backlogs, knowledge, and library source code.`   |

## Namespace

**Structure:** `$DOMAINS/packages/structures/namespace.art`

| Field         | Description   | Example                                                                                 |
| ------------- | ------------- | --------------------------------------------------------------------------------------- |
| `name`        | Resource name | `Namespace: Art JS`                                                                     |
| `canonical`   | npm scope     | `@art-js`                                                                               |
| `owner`       | Reference     | `Project: Art JS`                                                                       |
| `purpose`     |               | `Tools for working with Art files as programs.`                                         |
| `description` |               | `Art JS libraries and tools for authoring, validating, and projecting Art MD programs.` |

## Package

**Structure:** `$DOMAINS/packages/structures/package.art`

| Field           | Description   | Example                                                       |
| --------------- | ------------- | ------------------------------------------------------------- |
| `name`          | Resource name | `Package: Records`                                            |
| `canonicalName` | npm name      | `@art-js/records`                                             |
| `path`          |               | `libs/records/`                                               |
| `code`          |               | `https://github.com/noodlestan/art-js/tree/main/libs/records` |
| `website`       |               | `https://art-md.noodlestan.org/`                              |
| `docs`          |               | `https://art-md.noodlestan.org/docs/api/art-md/parser`        |
| `private`       |               | `false`                                                       |
| `keywords`      |               | `library, records`                                            |
