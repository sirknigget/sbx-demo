---
name: shell-command-guidelines
description: >
  Use in any session where bash commands are invoked.
---

# Choose and supervise shell commands

Use OMP's Bash, wait, and process tools as described by the harness. Choose the execution path by
the work the command needs, not by its output size alone.

## Choose the execution path

- **Direct foreground Bash:** Run bounded, non-interactive commands, including focused tests,
  diagnostics, and commands with large but finite output. The Bash hook summarizes eligible output
  when it is long enough. Do not start an agent solely to reduce output volume.
- **`command-runner`:** Delegate commands that need progress monitoring, interaction, or supervision
  over an uncertain duration, such as full test suites, builds, installations, migrations, and
  network-heavy work. Give it exact commands, cwd, a timeout or stop condition, and the success
  signal. Its output is not summarized by the Bash hook.
- **Bash with `async: true`:** Use for finite, unattended work with a small, low-output, predictable
  result while other work continues. It avoids starting an agent and delivers the completed result
  automatically, but the hook does not summarize that result. Use `command-runner` instead when
  background output needs monitoring or analysis, or has noisy output.

Use a named Bash service for a persistent process with a readiness signal. The Bash hook skips
service results. Check a running job or service with `proc://` when needed, not in a polling loop.

## Use the Bash output summarizer

The hook summarizes long visible results from completed foreground Bash calls by the main agent and
the `developer`, `debugger`, and `env-setup` subagents. Short results remain unchanged. Background
results, services, and other subagents do not use this hook.

Put either control before the command as a leading shell assignment:

- `NO_SUMMARIZE=1 bun test` keeps the raw Bash result. Use it when exact output must be parsed or
  inspected without a summary (for example - when needing an exact git diff).
- `SUMMARIZE_QUESTION='Which test failed?' bun test` focuses the summary on a question. Use it when
  the answer matters more than a general overview.

These controls do not apply when placed later in a pipeline or command chain. The hook links to an
original artifact only when OMP can resolve it. Otherwise, it saves the visible output and labels
any capped or reduced excerpt as incomplete. Read the referenced output when a decision needs exact
lines; a summary is not a substitute for the original.

Run independent tool calls in parallel instead of using a separate model turn for each call. Keep
dependent calls in order. Use `eval` when Python must retain state, orchestrate related calls, or
combine and reduce several tool results; do not wrap one simple command. A nested `tool.bash` call
follows the same Bash hook rules; the outer `eval` output is not summarized by that hook. Print only
the findings rather than a full log.

For bounded, low-stakes decisions in `eval`, use `judge` to classify one state or `judge_batch` to
classify multiple states concurrently. Use `completion(model="smol")` when the task needs a short
generated answer rather than a fixed choice; `default` and `slow` models are also available. Use
`agent` for a background subagent or `workpool` for independent delegated items when the work
requires delegation, not merely to run a simple shell command. Keep consequential decisions and
final integration with the main agent.

## Supervise and report

Choose when to inspect progress before starting a slow command. A checkpoint is not a hard timeout;
set a deadline only when stopping then is safe. Healthy progress calls for continued supervision of
the same process, not a kill and rerun to extend its timeout.

Inspect status and output when progress stalls, a prompt appears, retries repeat, or an explicit
error occurs. If stuck, stop the process when safe, find the cause, and change the relevant
condition before rerunning. A timeout means the command stopped, not that its underlying task
failed. Report completion, timeout, interruption, or active state, plus the exit code or readiness
signal and the last meaningful output. Progress alone does not prove success.
