---
name: sbx-dotfiles-sync
description:
  Sync persistent non-agent sandbox, system, and user-environment changes into the
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

If an `env-setup` subagent is available, assign it the live environment change and the template
sync below. Give it the intended change and this skill's scope and checks. Review its result.
If no `env-setup` subagent is available, do the work yourself.

After making a persistent change outside a project checkout:

1. Use `MOUNTED_WORKSPACE` to find the template at
   `$MOUNTED_WORKSPACE/sbx-demo/dotfiles`. This variable is set when `sbx-demo` is created. If it
   is unset or the template is not there, stop and report the missing mount or checkout. Do not
   guess another path.
2. Read `$MOUNTED_WORKSPACE/sbx-demo/dotfiles/AGENTS.md` before changing the template. Follow its
   guidance and the guidance already provided for the checkout.
3. Update the template files that own the live change. 
   For example, reproduce global package installs in `Dockerfile`, runtime setup in the appropriate tracked scripts, 
   and user settings in `home/`.
   Every tracked global project that has dependencies (such as npm or pip) or a build step must
   set up the active project path during regeneration. Put its idempotent install/build commands
   in a tracked `home/.config/sbx-demo/post-link.d/*.sh` hook. `link-tracked-home` runs the hooks
   after linking in local and cloud sandboxes; installing or building a copied home path in
   `Dockerfile` can be hidden by the later link. Keep system toolchain installs in `Dockerfile`.
   Make the template reproduce the final installation or configuration, not a description of it.
   Do not copy credentials or private state into the checkout. Keep generated project files
   untracked when a linked project builds in the checkout.
   For a new home path, check `home/.local/bin/link-tracked-home`: tracked files link individually,
   but a directory that must capture future files needs an entry in `DIRECTORY_LINKS` and a
   placeholder tracked by Git if it would otherwise be empty. Keep credential and state
   directories out of these links.
4. Run focused checks allowed inside the sandbox for the changed template path. Do not run host
   sandbox creation or image builds inside the sandbox. Report the changed files and what you verified.

Before ending the turn, create a pull request in the `sbx-demo` repository for all tracked changes
made to that repository during the turn, including tracked agent configuration changes that did not
need a template sync. Update the current pull request instead if one already exists. Do not include
unrelated changes that were present before the turn.
