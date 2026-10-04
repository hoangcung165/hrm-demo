#!/usr/bin/env python3
"""Prints a Markdown summary of the Gradle JUnit XML results (backend/build/test-results/test)."""
import glob
import sys
import xml.etree.ElementTree as ET

files = sorted(glob.glob("backend/build/test-results/test/TEST-*.xml"))
print("### Backend tests (`./gradlew test`)")
print()
if not files:
    print("No test result files found: the build failed before the tests ran.")
    sys.exit(0)

total = failed = skipped = 0
rows = []
failures = []
for path in files:
    suite = ET.parse(path).getroot()
    suite_name = suite.get("name", "").rsplit(".", 1)[-1]
    for case in suite.iter("testcase"):
        total += 1
        problem = case.find("failure")
        if problem is None:
            problem = case.find("error")
        if problem is not None:
            failed += 1
            status = "FAILED"
            failures.append((suite_name, case.get("name"), (problem.text or problem.get("message") or "")[:1500]))
        elif case.find("skipped") is not None:
            skipped += 1
            status = "skipped"
        else:
            status = "passed"
        rows.append((suite_name, case.get("name", "").removesuffix("()"), status, case.get("time", "")))

print(f"{total} tests: {total - failed - skipped} passed, {failed} failed, {skipped} skipped.")
print()
print("| Class | Test | Result | Seconds |")
print("|---|---|---|---|")
for suite_name, name, status, seconds in rows:
    print(f"| `{suite_name}` | {name} | {status} | {seconds} |")
for suite_name, name, text in failures:
    print()
    print(f"**{suite_name}.{name}**")
    print()
    print("```")
    print(text.strip())
    print("```")
