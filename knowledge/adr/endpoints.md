# ADR: Endpoints

**Purpose:** Decisions about how registry data is published and consumed through endpoints, establishing a shared transport and a single agreed source of truth.

## Decision: Raw GitHub Is the Transport

**Status:** ADOPTED

**Decision:** Views and schemas are plain files in a public repository, served through `raw.githubusercontent.com` URLs.

**Consequences:** No infrastructure to run or secure; CDN included. The transport is the same mechanism used to read records from other repositories — one HTTP client everywhere, no service to operate.

## Decision: Endpoint-First Consumption

**Status:** ADOPTED

**Decision:** Every consumer reads published endpoints; nobody reads another repository's local checkout for registry data.

**Consequences:** Consumers need no workspace clone, git credentials, or knowledge of another repository's branch state. `main` on the registry is the agreed truth, and uncommitted work cannot contaminate another consumer's view.

Bootstrap — registering a new repository — is the one step preceding this loop. See [design/workflows.md](../design/workflows.md).
