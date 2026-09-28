# Dotfiles demo guidance

## Purpose and scope

This directory is a small example of a Docker `shell-docker` sandbox. It shows how a host builds a template, mounts a shared workspace, links tracked home files, and optionally moves private OMP data to a new sandbox. Keep the example small: OMP, Node.js, Bun, Bash, Git, three example subagents, four example skills, and two cleanup commands. Do not add Claude, MCP, unrelated tooling, or personal paths. Keep all work for this demo inside `dotfiles/`.

Read `README.md` in this directory for host setup and command examples. The parent repository has its own guidance; do not change its files for dotfiles work.
`README.md` is a HUMAN FRIENDLY guide for using this demo. Always keep it that way - easily followable and clear. Do not add there agent guidance.

## Ownership and data boundaries

- `Dockerfile` owns the ARM64 image, pinned OMP/Node.js/Bun installs, and first-boot copies of `home/`. Build it with `dotfiles/` as the Docker context. Do not put credentials or runtime state in the image.
- `home/` owns tracked, secret-free Bash and Git settings, OMP configuration, example agents and skills, and `.local/bin/` commands. It is copied into the image for first boot. `home/.local/bin/link-tracked-home` later links individual tracked files from the mounted checkout into `/home/agent`; it must not replace OMP's runtime database or installed OMP binary. Edits to linked tracked files become active without rebuilding the image.
- `copy-state.sh` owns optional OMP state export and import between sandboxes through `staging/`. It moves only `~/.omp/agent/agent.db` and optional `~/.omp/.env`. `omp-db-copy.py` uses SQLite backup so WAL-backed databases remain consistent. Stop OMP before importing. Keep `staging/` ignored by Git and excluded from Docker builds. Review and remove copied private data when the transfer is complete.
- `regenerate_sandbox` is the host composition root. It takes an explicit absolute `--workspace-mount` path that contains this checkout, checks that sandbox names are available, builds and saves a timestamped template under the host's `~/agent-sandbox-backup/`, optionally exports from `--old-name`, creates `sbx-demo` with VirtioFS cache disabled, optionally imports state, links home files, and checks tool versions. It does not replace an existing `sbx-demo` sandbox.
- `dev-demo` is a host launcher for OMP or Bash in `sbx-demo`. It reads the explicit `SBX_DEMO_WORKSPACE` mount path and keeps the caller's directory relative to that mount. Users can mount a shared `workspace/` that contains both `sbx-demo/` and other projects; this layout is a recommendation, not a fixed path.

## Example commands and maintenance

The OMP settings are in `home/.omp/agent/config.yml`. The example agents are `reader`, `command-runner`, and `env-setup`; the example skills are `planning`, `grilling`, `agent-workflow-issue-report`, and `sbx-dotfiles-sync`. Keep these examples self-contained and free of references to tools not installed by this demo.

`clear_caches` handles npm and npx caches, not Bun. `clear_docker` removes containers and images; build cache and volumes need separate interactive consent. Both offer `--dry-run`, prompt before a default cleanup, and accept `--confirm` for noninteractive cleanup without optional Docker pruning. Keep their responsibilities separate.

Run image builds, sandbox creation, and `dev-demo` only on the host. Do not run host scripts or build the image from inside a sandbox. In a sandbox, use focused syntax checks and isolated home/state smoke checks when changing the corresponding files. Verify the changed path without running host-side commands or using real OMP credentials. No full test suite is provided.
