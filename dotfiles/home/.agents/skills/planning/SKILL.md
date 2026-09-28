---
name: planning
description:
  Use for planning during task execution or when the user asks for a plan or specification.
---

# Planning

This is the entry point for planning. This file owns mode selection and who makes the plan. The
shared planning rules and output formats live in the references named below.

## Agent role

- Main agent: select one mode for a new planning request. Make the plan in Mode A or B. In Mode C,
  delegate the initial plan to a `planner` subagent. Tell it the original request, any established
  context, and explicitly identify it as the planner for Mode C. Instruct it to read
  `skill://planning` as a planner subagent and not to delegate planning. If the planner returns a
  material clarification question, ask the user and send the answer back to a planner continuing
  Mode C. For plan review comments, send the comments and existing plan to a planner continuing Mode
  C for revision; do not select a new mode.
- Planner subagent: use the supplied Mode C. Do not select a mode, invoke another planner, or send
  the task back for routing. Read `skill://planning/references/planning-rules.md` and
  `skill://planning/references/deep-plan.md`, then make or revise the plan. If the user must resolve
  a material gap, return the question to the main agent. Continue with the user's answer or review
  comments when provided.

## Mode selection for the main agent

Select the mode only for the first planning request. Keep it through clarification, approval, and
plan revisions; do not route a follow-up as a new request.

- **Mode A — internal:** Select when planning is part of doing a task and the user did not ask to
  see a plan or confirm one first. Read `skill://planning/references/planning-rules.md`. Plan
  internally, show no plan, and continue with the task.
- **Mode B — quick:** Select when the user asks for a quick or short plan, quick research before
  execution, confirmation before coding, or simply asks to see a plan without requesting detail or a
  file. Read `skill://planning/references/planning-rules.md` and
  `skill://planning/references/quick-plan.md`. Plan as the main agent and reply in the quick format.
  If execution was requested, wait for confirmation or adjustments before implementing.
- **Mode C — deep:** Select when the user asks for a deep, thorough, comprehensive, or detailed plan
  or research before execution, or requests a plan file. Delegate to the `planner` subagent as
  described above. Do not load the shared rules or deep format or make the plan as the main agent.
  The planner writes the file in the deep format. When it returns, give the user the plan file path
  or link.

If the request combines conflicting modes or does not say what to plan, ask the user to clarify.
Planning quality and the rule for resolving material gaps are identical in all three modes; only the
output and approval point change.
