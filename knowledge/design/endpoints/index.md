# Design: Endpoint Index

**Purpose:** Explain how consumers discover published Registry views and their schemas.

**Publication:** Manual.

**Endpoint:** `data/endpoints.json`

## Rationale

The index is the discovery entry point: consumers can find available views and their validation schemas without hard-coding the Registry's endpoint list. It lists published views, not itself, avoiding recursive self-description.

Endpoint URLs are relative to the `data/` directory, while schema URLs are absolute so a consumer can fetch the exact validation contract directly.

The index is currently maintained manually and must be updated with each view or schema publication or version change.
