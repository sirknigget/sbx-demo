---
name: agent-workflow-issue-report
description:
  Use when task execution exposes avoidable harness, tool, environment, instruction, context, or
  subagent workflow friction.
---

# Agent workflow issue report

Record actionable workflow friction discovered while completing another task. Do not wait for a user
request.

## Constraint

Do not further diagnose or debug the workflow problem. Take only the minimal action needed to report
the observed issue, then continue the assigned task.

## When to report

Create a report when the agent encounters an avoidable problem in any of these areas:

- harness or MCP tools fail, return inconsistent results, or need retries
- project setup required to complete a task is missing or undocumented
- project guidance is insufficient, stale, or fails when followed
- instructions conflict or require unnecessary interpretation
- subagent orchestration, communication, output quality, or performance is ineffective
- excessive context, repeated discovery, or redundant probes materially slow the task
- environment or tooling behavior requires an undocumented workaround

Do not report ordinary task complexity, a user-caused requirement change, or an expected product bug
unless it exposes workflow or setup friction.

## Workflow

1. Preserve evidence while working: exact tool or subsystem, observed behavior, relevant error text,
   retries or probes, workaround, and impact. Remove credentials, tokens, private data, and
   unrelated output.
2. Complete or continue the primary task when possible. Reporting must not replace delivery of the
   requested work.
3. Identify the project root from the active task and create its `.agent-issue-reports/` directory
   if absent.
4. Summarize the issue as a short lowercase kebab-case title. Keep it specific to the root cause or
   observed friction.
5. Use local time and write exactly one Markdown file for the observation:

   `<project-root>/.agent-issue-reports/<summarized-title>-<YYYY-MM-DD>-<HH-MM-SS>.md`

6. Keep the complete file at 60 lines or fewer. Prefer compact evidence over narrative.
7. If the same issue already has a report in the current task, update that report instead of
   creating a duplicate.
8. Commit the report in the current branch you're working on, with a message like
   `agent: report <summarized-title> workflow friction`.

## Report format

```markdown
# <Concise issue title>

- Observed: <YYYY-MM-DD HH:MM:SS local time>
- Area: <harness | MCP | environment | project setup | instructions | subagents | context>
- Task: <what the agent was trying to accomplish>

## Observation

<Full, self-contained account of what happened and where.>

## Evidence

- <Exact error, unexpected result, or concrete behavior>
- <Tools, commands, files, or instructions involved>
- <Number and kind of retries, probes, or workarounds required>

## Impact

<Extra work, delay, context growth, uncertainty, or reliability risk caused.>

## Expected behavior

<What should have happened when documented guidance or the normal workflow was followed.>

## Suggested improvement

<Smallest actionable change likely to prevent recurrence. Distinguish confirmed facts from inference.>
```

Include enough detail for a maintainer who did not see the original task to reproduce or investigate
the issue. Quote only the relevant portion of errors and instructions. Never include secrets or dump
full transcripts.
