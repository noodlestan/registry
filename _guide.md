# Guide: Registry

> Publish machine-consumable Noodlestan registry views as raw JSON endpoints.

JSON views (namespaces, repositories, projects) and their schemas, consumed by `@noodlestan/commons` and other tooling through raw GitHub URLs.

## Recommended Reading

Agents SHOULD scan these files for relevant clarifications when faced with ambiguity or omissions that may result from missing definitions.

- `_guide.md` — this file: system overview, layout, setup, verification.
- `README.md` — purpose, endpoints, schemas, and consumption notes.

## Repository Layout

```
_guide.md           — this file
README.md           — endpoints, schemas, consumption notes
package.json        — root manifest (private)
lefthook.yml        — pre-commit hooks (prettier)
data/namespaces.json    — Namespaces view
data/repositories.json  — Repositories view
data/projects.json      — Projects view
data/endpoints.json     — Endpoint index for discoverability
schema/                 — JSON schemas, one per view
_records/           — project, repository, and license records
```

## Records Management

Records are co-located with the resources they describe in `_records/` directories:

- **Project:** `_records/project.art`
- **Repository:** `_records/repository.art`

## Operating Instructions

### Operating Instructions: Setting Up

**Instructions:**

Run from the repository root:

```bash
npm ci # to install dependencies.
```

### Operating Instructions: Verifying Step

**Instructions:**

Run from the repository root:

```bash
npm run lint:fix # to fix formatting issues automatically
npm run lint # to report other issues
```

### Operating Instructions: Verifying Completion

**Instructions:**

Runs automatically on pre-commit hook (from the repository root):

```bash
npm run ci # lint
```
