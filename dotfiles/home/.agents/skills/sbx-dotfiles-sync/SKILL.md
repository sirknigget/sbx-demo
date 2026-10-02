---
name: sbx-dotfiles-sync
description:
  Sync persistent non-agent sandbox, system, and user-environment changes into the uncommitted
  sbx-demo/dotfiles template. Use only for changes outside project checkouts, such as OS/global
  packages, user-level tool installations or configuration, permissions, and helper scripts.
  Do not use for project-local work or changes limited to tracked agent configuration.
---

Use this skill to reproduce persistent sandbox, system, and user-environment changes in the
`sbx-demo/dotfiles` template, excluding project-local work and agent configuration already tracked
there. Keep tracked home files secret-free.

Do not use this skill for routine development or maintenance inside any project checkout. This
includes project-local dependencies such as `node_modules` and virtual environments, package-manager
installs governed by a project lockfile, build or cache artifacts, temporary worktrees, and
repository-local repairs.

Do not use this skill when already working directly in `sbx-demo/dotfiles` on the template. The tracked
change is already the source of truth.

Do not use this skill when the only changes are under git-tracked configuration paths, for example but not limited to:

- `~/.agents/`
- `~/.claude/agents/`
- `~/.claude/CLAUDE.md`
- `~/.claude/settings.json`

This exclusion includes edits to this skill itself. If a task changes both excluded agent paths
and non-excluded system or environment configuration, sync only the non-excluded changes.

If an `env-setup` subagent is available, assign it the live environment change and the template
sync below. Give it the intended change and this skill's scope and checks. Review its result.
If no `env-setup` subagent is available, do the work yourself.

After making a non-excluded persistent change outside a project checkout:

1. Use `MOUNTED_WORKSPACE` to find the template at
   `$MOUNTED_WORKSPACE/sbx-demo/dotfiles`. This variable is set when `sbx-demo` is created. If it
   is unset or the template is not there, stop and report the missing mount or checkout. Do not
   guess another path.
2. Read `$MOUNTED_WORKSPACE/sbx-demo/dotfiles/AGENTS.md` before changing the template. Follow its
   guidance and the guidance already provided for the checkout.
3. Update the template files that own the live change. For example, reproduce package installs in
   `Dockerfile`, runtime setup in the appropriate tracked scripts, and user settings in `home/`.
   Make the template reproduce the final installation or configuration, not a description of it.
   Do not copy credentials, private state, or generated files into the checkout.
4. Run focused checks allowed inside the sandbox for the changed template path. Do not run host
   sandbox creation or image builds inside the sandbox. Leave the template changes uncommitted.
   Report the changed files and what you verified.
