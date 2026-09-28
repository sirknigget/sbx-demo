---
name: sbx-git-hooks
description:
  Use when the user asks to configure, enable, disable, inspect, fix, or adopt Git pre-commit hooks
  in the sbx sandbox.
---

# sbx Git hooks

Use this skill to configure a repository for the sandbox-managed global Git pre-commit dispatcher.

## Workflow

1. Work in the target repository. If the user did not name a repository and the current directory is
   a Git work tree, use the current repository.
2. Inspect the current state first:

   ```bash
   sbx-precommit status
   ```

3. Before enabling JS/TS checks, explicitly inform the user that there are two opt-in choices and
   get a clear decision if they have not already specified one:
   - **Local config only** — best for most repos and private checkout preferences.

     ```bash
     sbx-precommit enable
     ```

     This sets `sbx.precommit.tsChecks=true` in repo-local Git config. It is not committed and
     affects only this checkout.

   - **Tracked marker** — best only when the user intentionally wants clone-friendly project
     behavior, usually for personal/non-shared repos.

     ```text
     .sbx/precommit/ts-checks.enabled
     ```

     The marker is project content and should be committed only when that shared behavior is
     intentional. It overrides repo-local `sbx.precommit.tsChecks=false`.

   If the user's request just says to "configure precommit hooks" or "enable JS/TS checks" without
   choosing, stop and ask them to choose **local config only** or **tracked marker** before changing
   either state.

4. If `sbx-precommit status` reports that local `core.hooksPath` overrides the global dispatcher,
   preserve that hook path by adopting it:

   ```bash
   sbx-precommit adopt-hookspath
   ```

   This stores the old local hook path in `sbx.precommit.chainHooksPath` and unsets local
   `core.hooksPath` so Git falls back to the sandbox global dispatcher. The dispatcher will chain
   the adopted hook before running opt-in JS/TS checks.

5. If the user wants to disable JS/TS checks in this checkout:

   ```bash
   sbx-precommit disable
   ```

6. If the user wants to undo adoption and restore a repo-local hook path:

   ```bash
   sbx-precommit restore-hookspath
   ```

## JS/TS package script expected by the checks

When JS/TS checks are enabled, the dispatcher calls `~/.local/lib/git-precommit/ts-checks.sh` with
the staged JS/TS file paths. That script groups files by the nearest ancestor `package.json` and
runs the `precommit` package script once from each affected package root.

The script appends the affected files as package-relative arguments. For example:

```text
npm run precommit -- src/changed.ts test/changed.test.ts
```

The package owns the checks behind `precommit`. It can use the file arguments directly or forward
them to its internal formatting, linting, and other scripts.

When helping with a JS/TS project, inspect each relevant `package.json` and verify that it defines
`precommit`. Do not claim that specific checks run unless the package script includes them.

For example:

```json
{
  "scripts": {
    "precommit": "prettier --check"
  }
}
```

Behavior to mention when helping users:

- `precommit` runs once for each affected package.
- It receives all staged JS/TS files in that package as package-relative arguments.
- If `precommit` is missing, the package is skipped with a warning.
- A non-zero `precommit` exit status stops the commit.
- The package manager is detected from `packageManager`, then `pnpm-lock.yaml`, then `yarn.lock`,
  and otherwise defaults to npm.

## What to explain to the user

- The sandbox global dispatcher lives at `/home/agent/.config/git/hooks/pre-commit` via global
  `core.hooksPath`.
- JS/TS checks are disabled by default per repo.
- The dispatcher chains executable adopted hooks, `.git/hooks/pre-commit`, and
  `.githooks/pre-commit` before JS/TS checks.
- A repo-local `core.hooksPath` bypasses the global dispatcher unless adopted.
- Use local config for private checkout preferences; use the marker only when tracked project-level
  opt-in is deliberate.

## Validation

After changing hook configuration, run:

```bash
sbx-precommit status
```

If the tracked marker file was created or removed, run the relevant repo validation before
committing. Stage and commit `.sbx/precommit/ts-checks.enabled` only if the user intentionally wants
the opt-in tracked.
