#!/usr/bin/env python3
"""Writes the flow sections of the E2E evidence comment, scoped to what the PR changed.

Every flow still runs on every PR (the flows guard each other), but only the flows whose area the PR touched
show their steps and screenshots. A flow outside the PR that passed gets one line, and its screenshots are deleted
so they are not published. A flow that failed always shows everything, whatever the PR touched.

Usage: e2e-evidence.py <changed-files.txt> <e2e-out dir>
Env:   OUTCOME_<FLOW> = success | failure | skipped | cancelled  (the step outcome of each flow)

To add a flow: add a row to FLOWS with the paths that belong to its screens and API.
"""
import fnmatch
import os
import sys
from pathlib import Path

B = "backend/src/main/java/com/hrmdemo"
W = "web/src"

# name, title, report file, screenshot prefix, paths whose change puts the flow in scope
FLOWS = [
    ("auth", "Sign-in and password", "report.md", "[0-9][0-9]-", [
        f"{W}/features/auth/*", f"{W}/pages/login/*", f"{W}/pages/forgot-password/*", f"{W}/pages/reset-password/*",
        f"{B}/security/*", f"{B}/*/auth/*Auth*", f"{B}/*/auth/*Token*", f"{B}/*/auth/*Password*",
        f"{B}/*/auth/RefreshCookies*", "web/e2e/auth-flow.mjs",
    ]),
    ("org", "Org structure", "report-org.md", "org-", [
        f"{W}/features/org-unit/*", f"{W}/pages/org/*", f"{W}/components/ui/tree*", f"{W}/components/ui/org-chart*",
        f"{B}/*/orgunit/*", "web/e2e/org-flow.mjs",
    ]),
    ("accounts", "Accounts", "report-accounts.md", "accounts-", [
        f"{W}/features/account/*", f"{W}/pages/accounts/account*", f"{W}/pages/accounts/accounts-*",
        f"{B}/*/auth/Account*", "web/e2e/accounts-flow.mjs",
    ]),
    ("roles", "Roles and permissions", "report-roles.md", "roles-", [
        f"{W}/features/role/*", f"{W}/pages/accounts/role*", f"{W}/components/ui/matrix*",
        f"{W}/components/ui/save-bar*", f"{W}/components/ui/use-matrix-navigation*", f"{B}/*/accessscope/*",
        "web/e2e/roles-flow.mjs",
    ]),
    ("demo", "Demo as…", "report-demo.md", "demo-", [
        f"{W}/features/demo/*", f"{W}/components/ui/person-menu*", f"{B}/*/auth/DemoPersona*", f"{B}/*/auth/Demo*",
        "web/e2e/demo-flow.mjs",
    ]),
    ("catalogs", "Catalogs", "report-catalogs.md", "catalogs-", [
        f"{W}/features/catalog/*", f"{W}/pages/catalogs/*", f"{B}/*/catalog/*",
        "backend/src/main/resources/db/migration/*catalog*", "web/e2e/catalogs-flow.mjs",
    ]),
    ("employees", "Employees", "report-employees.md", "employees-", [
        f"{W}/features/employee/*", f"{W}/pages/employees/*", f"{W}/components/ui/tree-select*",
        f"{W}/components/ui/masked-value*", f"{W}/components/ui/search-select*", f"{W}/components/ui/profile-header*",
        f"{B}/*/employee/*", "backend/src/main/resources/db/migration/*employee*", "web/e2e/employees-flow.mjs", "web/e2e/xlsx.mjs",
    ]),
    ("approvals", "Approval inbox", "report-approvals.md", "approvals-", [
        f"{W}/features/approval/*", f"{W}/features/profile-update/*", f"{W}/pages/approvals/*",
        f"{W}/pages/approval-flows/*", f"{W}/pages/profile/*", f"{W}/components/ui/switch*",
        f"{W}/components/ui/approval-steps*", f"{W}/components/ui/notification-item*", f"{W}/features/notification/*",
        f"{W}/components/layout/sidebar-nav*", f"{W}/components/layout/app-header*", f"{B}/*/notification/*",
        f"{W}/components/layout/nav-items*", f"{B}/*/approval/*", f"{B}/*/profileupdate/*",
        "backend/src/main/resources/db/migration/*approval*", "web/e2e/approvals-flow.mjs",
    ]),
    ("projects", "Projects", "report-projects.md", "projects-", [
        f"{W}/features/project/*", f"{W}/pages/projects/*", f"{W}/components/ui/heat-*", f"{W}/components/ui/allocation-*", f"{B}/*/project/*", f"{B}/*/allocation/*",
        "backend/src/main/resources/db/migration/*project*", "web/e2e/projects-flow.mjs",
    ]),
]


def main() -> None:
    changed = [line.strip() for line in Path(sys.argv[1]).read_text().splitlines() if line.strip()]
    out = Path(sys.argv[2])
    sections, others = [], []
    for name, title, report, prefix, patterns in FLOWS:
        outcome = os.environ.get(f"OUTCOME_{name.upper()}", "")
        touched = any(fnmatch.fnmatch(path, pattern) for path in changed for pattern in patterns)
        failed = outcome not in ("success", "")
        report_file = out / report
        if touched or failed:
            text = report_file.read_text() if report_file.is_file() and report_file.stat().st_size else f"The {title} flow did not start."
            sections.append(text.rstrip())
            continue
        # Outside this PR and passed: one line, and its screenshots are not published.
        for png in out.glob(f"{prefix}*.png"):
            png.unlink()
        others.append(title)
    if sections:
        print("\n\n".join(sections))
    else:
        print("No flow covers the files this PR changed.")
    if others:
        print()
        print(f"Also run and passed, not changed by this PR (no screenshots): {', '.join(others)}.")


if __name__ == "__main__":
    main()
