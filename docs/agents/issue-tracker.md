# Issue tracker: GitHub

Issues and PRDs for this repo live in **GitHub Issues** of `hoangcung165/hrm-demo`. Use the GitHub MCP tools when they can see this private repo; otherwise use the `gh` CLI or the GitHub REST API with the local git credentials (never print or store the token). Note: as of 10/2026 the `claude.ai github` connector only sees public repos of this account.

## Conventions

- **The PRD is an issue** labelled `prd`. Every implementation issue is a **sub-issue** of it.
- **Slices:** an `[HRM-xx]` issue is split into slice issues titled `[HRM-xx/BE-n]`, `[HRM-xx/FE-n]`, `[HRM-xx/INT-n]`, each a sub-issue of the `[HRM-xx]` issue with "Parent: #<number> [HRM-xx]" in its body (see `workflow.md`, "Slices").
- **Titles** start with a stable code: `[HRM-xx] <title>`. Refer to issues by this code in prose (GitHub numbers differ from HRM codes); link with `#<number>`.
- **Body** follows `.github/ISSUE_TEMPLATE/task.md`: Parent, What to build, Acceptance criteria, Design (if UI), Blocked by.
- **Triage state** is a label (see `triage-labels.md`). Progress state is a `status:*` label (see `workflow.md`).
- **Comments and conversation history** are GitHub issue comments.

## When a skill says "publish to the issue tracker"

Search existing issues first to avoid duplicates. Then create a GitHub issue:
- Give it the next free `HRM-xx` code.
- Set labels: triage label, `type:*`, `area:*`, `milestone:*`, plus `status:ready` or `status:blocked`.
- For an implementation issue, attach it as a sub-issue of the PRD.
- A new PRD gets the `prd` label.

## When a skill says "fetch the relevant ticket"

Read the issue (body and comments) by number, or search by its `HRM-xx` code.

## History

Before 10/2026 issues lived as markdown under `.scratch/`; that copy is archived in `docs/archive/scratch-2026-10/` (with `github-map.json` mapping `HRM-xx` → GitHub issue number) and is no longer updated.
