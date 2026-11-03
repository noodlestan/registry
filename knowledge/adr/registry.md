# ADR: Registry

**Purpose:** Decisions about registry authority, records, and how registry data is maintained.

## Decision: Manifests Are the First Source of Truth

**Status:** ADOPTED

**Decision:** `package.json` is authoritative for anything npm consumes; records are authoritative for what tools consume.

**Consequences:** Contributors already edit manifests at the point of change. npm ignores records, so facts existing only in records would be invisible to the toolchain that must agree with them.

## Decision: Records as IaC for Scaffolding

**Status:** ADOPTED

**Decision:** Records are templates from which new repositories, packages, and namespaces are scaffolded.

**Consequences:** New resources start with their records complete and relationships declared, rather than being hand-assembled and reconciled later.

## Decision: Records as Extended Metadata

**Status:** ADOPTED

**Decision:** Records carry what manifests must not: purpose, description, owner, lifecycle, and planning links.

**Consequences:** Manifests stay npm-shaped; human and agent context lives beside the code, in a format designed for it.

## Decision: Accept Records Duplication

**Status:** ADOPTED

**Decision:** Where a fact exists in both manifest and record, duplication is accepted rather than eliminated.

**Consequences:** Some consumers prefer reading one format only. The cost of duplication — a sync rule and validation — is cheaper than forcing every consumer through one source. See [design/data.md](../design/data.md).

## Decision: Async Refresh Via the Commons Registry Indexer

**Status:** ADOPTED

**Decision:** Registry views are updated by the Commons Registry Indexer reacting to triggers, never by hand-editing published views.

**Consequences:** Freshness does not depend on human memory. A single writer produces idempotent, reproducible runs from committed inputs.
