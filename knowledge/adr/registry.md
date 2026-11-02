# ADR: Registry

**Purpose:** The global principles that shape the registry — each a short decision with its rationale.

## Decision: Manifests Are The First Source Of Truth

The `package.json` manifest is authoritative for anything npm consumes; records are authoritative for what tools consume. Rationale: every contributor already edits manifests at the point of change, and npm ignores records — a fact only living in a record would be invisible to the toolchain that must agree with it.

## Decision: Records As IaC For Scaffolding

Records are the templates from which new repositories, packages, and namespaces are scaffolded. Rationale: bootstrap consistency — a scaffolded resource starts with its records complete and its relationships declared, instead of being hand-assembled and reconciled later.

## Decision: Records As Extended Metadata

Records carry what manifests must not: purpose, description, owner, lifecycle, and planning links. Rationale: manifests stay npm-shaped for consumers; the human and agent context lives beside the code, in a format designed for it.

## Decision: Accept Records Duplication

Where a fact exists in both manifest and record, the duplication is accepted rather than eliminated. Rationale: some consumers prefer reading one format only; the cost of duplication is a sync rule plus validation (see [design/data.md](../design/data.md)), which is cheaper than forcing every consumer through one source.

## Decision: Async Refresh Via Registration

The registry is updated by `@noodlestan/registration` reacting to triggers — never by hand-editing published views. Rationale: freshness without relying on human memory, and a single writer whose runs are idempotent and reproducible from committed inputs.
