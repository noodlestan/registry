# Design: Records

**Purpose:** The records the registry and its tools read — one section per Structure, summarising the fields they use. Who reads or updates what lives in [design/data.md](data.md); field semantics of manifests live in [design/manifests.md](manifests.md).

## Project

**Structure:** `$DOMAINS/projects/structures/project.art`

Fields used by the ecosystem: resource `name`, `purpose`, `description`, `keywords`, `owner`, `repository` (reference), `code`, `website`, `docs`, `private`, `resources` (owned things).

## Repository

**Structure:** `$DOMAINS/repositories/structures/repository.art`

Fields used by the ecosystem: resource `name`, `canonical` (GitHub slug), `remote` (SSH), `owner` (reference), `purpose`, `description`.

## Namespace

**Structure:** `$DOMAINS/packages/structures/namespace.art`

Fields used by the ecosystem: resource `name`, `canonical` (npm scope), `owner` (reference), `purpose`, `description`.

## Package

**Structure:** `$DOMAINS/packages/structures/package.art`

Fields used by the ecosystem: resource `name`, `canonicalName` (npm name), `path`, `code`, `website`, `docs`, `private`, `keywords`.
