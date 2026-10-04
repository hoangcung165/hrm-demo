# Agent team: Design, BE, FE

How the three role agents work on one issue without stepping on each other. Applies to Claude Code subagents (`.claude/agents/hrm-*.md`), Codex, and humans taking the same role.

## Roles and file ownership

| Role | Agent | Owns (may edit) | Reads |
|---|---|---|---|
| Orchestrator | main Claude Code session | git, GitHub (labels, comments, PRs), `AGENTS.md`, `docs/agents/` | everything |
| Design | `hrm-design` | `docs/design/`, design artifacts on claude.ai, `brand/` | `docs/contexts/`, PRD, issue |
| Backend | `hrm-be` | `backend/`, `docker-compose.yml`, `.env.example` | `docs/adr/`, `docs/contexts/`, Design spec |
| Frontend | `hrm-fe` | `web/` | Design spec, API contract, `docs/contexts/` |

- A role agent edits **only its own paths**. Needs a change elsewhere → says so in its report; the orchestrator routes it.
- **Only the orchestrator runs git and writes to GitHub.** Role agents never branch, commit, push, or edit issues/labels. This is what lets them run in parallel in one folder.
- Glossary changes (`docs/contexts/*/CONTEXT.md`) go through the orchestrator.

## One issue = one branch = one PR

The orchestrator claims the issue, creates `hrm-xx-slug`, and runs the roles on that branch. All three roles commit into the same PR (vertical slice). Issues already split into BE/FE sub-issues (e.g. HRM-01) keep one branch per sub-issue.

## Hand-off artifacts (the sync points)

Each hand-off is posted by the orchestrator as an **issue comment** with a fixed heading, so every agent (Claude, Codex, human) reads the same source.

| # | Heading | Author | Content | Unblocks |
|---|---|---|---|---|
| 1 | `## Design spec` | Design | Artboard link(s), patterns used (P1–P11), states (empty/loading/error), copy, token additions | FE |
| 2 | `## API contract` | BE | Endpoints (method, path, role), request/response JSON examples, error `code`s, pagination | FE |
| 3 | `## Integration notes` | FE | Contract gaps found while building, UI-only assumptions | BE / orchestrator |

Source of truth after merge:
- **Tokens:** design system artifact → `web/` CSS variables (`DESIGN_PLAN.md` §2).
- **API:** springdoc OpenAPI at `/v3/api-docs`. FE generates TypeScript types from it; the `## API contract` comment is only the early draft.

## Order for an issue with UI

```
claim (orchestrator)
  ├─▶ Design: spec + artboard ──(human approves artboard)──┐
  └─▶ BE: API contract draft ──▶ BE: implement + tests      │
                    │                                       ▼
                    └──────────▶ FE: build against MSW mocks of the contract
                                       ──▶ FE: switch to real API, regen types
  ──▶ orchestrator: run all tests, commit, open PR
```

- **Design runs one week ahead** (`DESIGN_PLAN.md` §6). For hero screens the issue is not claimed until its artboard is approved.
- **BE and FE run in parallel** once the API contract draft exists. FE mocks with MSW; it does not wait for BE code.
- Contract change after FE started → BE updates the `## API contract` comment and reports it; the orchestrator tells FE.

## Definition of done (all roles)

- `./gradlew test` and `npm test` (in `web/`) green.
- UI matches the artboard or pattern; `web-design-guidelines` and `design:accessibility-review` run on the UI.
- OpenAPI types in `web/` regenerated from the final backend.
- Glossary terms used in class, table, API, and UI names.
