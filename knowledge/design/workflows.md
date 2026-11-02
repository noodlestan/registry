# Design: Workflows

**Purpose:** What runs when: one overview table of triggers, then one section per trigger. Field-level effects live in [design/data.md](data.md); tool responsibilities in [design/tools.md](tools.md).

## Overview

| Trigger                           | Tool                                  | Action                                              | Outcome                                      |
| --------------------------------- | ------------------------------------- | --------------------------------------------------- | -------------------------------------------- |
| Manual run                        | `@noodlestan/registration`            | Regenerate views and commit                         | `data/*.json` refreshed                      |
| Push to a registered repository   | `@noodlestan/registration` (dispatch) | Same refresh, scoped to the pushed repo's records   | Views refreshed without human memory         |
| Scheduled backstop                | `@noodlestan/registration`            | Periodic full refresh                               | Catches anything dispatch missed             |
| Registering a new repository      | human + workspace-cli                 | Add repository record; registry gains the canonical | Bootstrap — the one move events cannot start |
| Pre-commit in a source repository | `@noodlestan/registry-pre-commit`     | Regenerate and validate that repo's records         | Records consistent at commit time            |
| Pre-commit in a monorepo          | `@noodlestan/commons`                 | Validate dependencies; regenerate own block         | Commit gated on consistency                  |
| Commit in `registry`              | repository lint hook                  | Format views, schemas, knowledge                    | Published files stay canonical               |

## Push Refresh

A registered repository pushes to `main` → dispatch fires → registration refetches that repository's records over raw URLs and re-projects the affected views. Only the registry's own commit publishes changes.

## Scheduled Backstop

Dispatch covers registered pushes; the schedule covers drift, missed events, and upstream rewrites. Same action as push refresh, full scope.

## Bootstrap: Registering A Repository

Events can only fire for repositories the registry already knows. A new repository is registered by a human: add its repository record (workspace-cli), then registration picks it up on its next run. This is the only hand-operated step in the loop.

## Shared

- All runs are idempotent: same inputs, same views.
- Registration is the single writer of `data/*.json`; nothing else edits published views.
- Source-side record consistency is enforced earlier, by the pre-commit hooks — registration only projects what has been committed.
