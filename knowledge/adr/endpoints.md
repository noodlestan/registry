# ADR: Endpoints

**Purpose:** Why published registry data is served from raw GitHub, and why consumers read endpoints instead of checkouts.

## Decision: Raw GitHub Is The Transport

Views and schemas are plain files in a public repository, served as `raw.githubusercontent.com` URLs. Rationale: zero infrastructure to run or secure, CDN included, and the transport is the same mechanism the ecosystem already uses to read other repositories' records — one HTTP client everywhere, no service to operate.

## Decision: Endpoint-First Consumption

Every consumer reads the published endpoints; nobody reads another repository's local checkout to obtain registry data. Rationale: independence — a consumer needs no workspace clone, no git credentials, and no knowledge of anyone's branch state; `main` on the registry is the single agreed truth, and a consumer's own uncommitted work can never contaminate another consumer's view. (Bootstrap — registering a new repository — is the one step that precedes this loop; see [design/workflows.md](../design/workflows.md).)
