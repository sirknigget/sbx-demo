---
name: sbx-dotfiles-sync
description: >-
  Use for persistent non-agent sandbox, system, or user-environment changes outside project
  checkouts. Do not use for project-local dependencies, temporary state, or changes limited to
  tracked agent configuration.
---

# Sandbox dotfiles sync

Make persistent sandbox changes reproducible in the demo's `dotfiles/` repository. For packages or
base-image behavior, update its `Dockerfile`; for secret-free user configuration or helpers, update
`home/`. Keep credentials and machine-specific state out of tracked home and use the repository's
copy-only state flow when applicable. Do not run Docker builds inside the sandbox.

Do not use this skill for work inside another project checkout, its dependencies or artifacts, or
changes confined to agent settings and skills already tracked in `dotfiles/home/.agents/` or
`dotfiles/home/.omp/`. When directly editing the dotfiles repository, the tracked change is already
the record; do not create an extra change log.

For a persistent change made outside a project checkout, locate the tracked sandbox template and
apply the corresponding source change there. If the environment change cannot be represented safely
in tracked files, state what remains manual and why; never commit secrets. Verify the affected
tracked change with a focused check that does not rebuild the image inside the sandbox.
