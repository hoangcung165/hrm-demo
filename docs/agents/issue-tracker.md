# Issue tracker: GitHub

Issues and PRDs for this repo live in **GitHub Issues** of `hoangcung165/hrm-demo`. Use the GitHub MCP tools when available, otherwise the `gh` CLI.

## Conventions

- **The PRD is an issue** labelled `prd`. Every implementation issue is a **sub-issue** of it.
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

Before 10/2026 issues lived as markdown under `.scratch/`; that copy is archived in `docs/archive/scratch-2026-10/` and is no longer updated.
