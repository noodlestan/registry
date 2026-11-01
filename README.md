# Noodlestan Registry

> Publish machine-consumable Noodlestan registry views as raw JSON endpoints.

Hand-authored JSON views of Noodlestan identity — namespaces, repositories, and projects — with their JSON schemas. Data-only: no generator, no CI, no npm packages; refreshes are ordinary human PRs that bump each view's `snapshot`.

**Keywords:** noodlestan, registry.

## Endpoints

| View | Endpoint | Schema |
| --- | --- | --- |
| Namespaces | https://raw.githubusercontent.com/noodlestan/registry/main/namespaces.json | `schema/namespaces.schema.json` |
| Repositories | https://raw.githubusercontent.com/noodlestan/registry/main/repositories.json | `schema/repositories.schema.json` |
| Projects | https://raw.githubusercontent.com/noodlestan/registry/main/projects.json | `schema/projects.schema.json` |

- Identity is the record's resource `name` (example: `Namespace: Art JS`); references between views are exact `name` matches.
- `canonical` carries the npm scope (namespaces), the GitHub slug (repositories), or the npm package name (project resources).
- Consumers compose file URLs as `https://raw.githubusercontent.com/{canonical}/main/{path}`.
- The payload's `schema` field identifies the view version; the endpoint URLs never move.
- Authoring sources and acceptance rules: the registry views specs attached to Plan: POC Manifest Registry.

## Development

### Scripts

- **$** `npm run lint` — Lint markdown files.
- **$** `npm run lint:fix` — Fix formatting and lint issues.
- **$** `npm run ci` — Run all CI scripts in all packages.

## License

MIT License

Copyright (c) 2026 Noodlestan https://noodlestan.org/

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
