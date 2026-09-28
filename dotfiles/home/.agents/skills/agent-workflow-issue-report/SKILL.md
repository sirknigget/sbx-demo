---
name: agent-workflow-issue-report
description: >-
  Use when execution exposes avoidable harness, tool, environment, instruction, context, or
  subagent workflow friction.
---

# Agent workflow issue report

Record observed workflow friction without replacing the primary task. Report tool inconsistencies,
missing setup, contradictory guidance, ineffective delegation, or undocumented workarounds. Do not
report ordinary task complexity or product bugs that do not affect the workflow. Do not spend time
investigating unrelated root causes.

In the active project, write one short Markdown report under `.agent-issue-reports/`, named
`<issue-title>-<YYYY-MM-DD>-<HH-MM-SS>.md` using local time. Reuse an existing report for the same
issue in the same task. Keep it under 60 lines and include:

- Task and observed behavior, with the tool or subsystem involved.
- Minimal exact evidence and any retry or workaround; redact secrets and private data.
- Impact, expected behavior, and the smallest suggested improvement. Mark inference clearly.

Follow the project's Git and scope instructions for committing; do not create a commit when the
current task forbids one. Continue the assigned work after recording the report.
