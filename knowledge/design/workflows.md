# Design: Workflows

**Purpose:** What runs when: one overview table of triggers, then one section per trigger. Field-level effects live in [design/data.md](data.md); tool responsibilities in [design/tools.md](tools.md).

## Overview

| Trigger                           | Tool                     | Action                                                 | Outcome                              |
| --------------------------------- | ------------------------ | ------------------------------------------------------ | ------------------------------------ |
| Manual run                        | Commons Registry Indexer | Regenerate views and publish                           | `data/*.json` refreshed              |
| Push to a managed repository      | Commons Registry Indexer | Refresh views from the pushed repo's committed records | Views refreshed without human memory |
| Scheduled backstop                | Commons Registry Indexer | Periodic full refresh                                  | Catches anything dispatch missed     |
| Registering a new repository      | human + workspace-cli    | Add the repository identity to Registry configuration  | Repository becomes managed           |
| Pre-commit in a source repository | Commons Registry Peer    | Validate and maintain source records and manifests     | Source data consistent at commit     |
| Pre-commit in a monorepo          | Commons Registry Peer    | Validate dependencies and planning links               | Commit gated on consistency          |
| Commit in `registry`              | repository lint hook     | Format views, schemas, knowledge                       | Published files stay canonical       |

## Push Refresh

A managed repository pushes to `main` → dispatch fires → the Commons Registry Indexer refetches that repository's committed records over raw URLs and re-projects the affected views. Only a Registry commit publishes changes.

## Scheduled Backstop

Dispatch covers registered pushes; the schedule covers drift, missed events, and upstream rewrites. Same action as push refresh, full scope.

## Shared

- All runs are idempotent: same inputs, same views.
- The Commons Registry Indexer is the single writer of `data/*.json`; nothing else edits published views.
- Source-side consistency is checked by the Commons Registry Peer; the Indexer projects committed source data.
