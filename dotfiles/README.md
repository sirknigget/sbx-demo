# Docker sandbox dotfiles demo

This demo creates a Docker sandbox named `sbx-demo`. It installs OMP, Node.js, and Bun, then links its Bash, Git, and OMP settings to this checkout. A shared workspace mount lets you use the same sandbox for other projects.

Run the setup commands **on your host**, not inside a sandbox. The example image uses Linux ARM64, and the `dev-demo` host command needs Zsh.

## 1. Prepare a workspace

You need Docker, `sbx`, and a checkout of `sbx-demo` on your host. A useful layout is:

```text
workspace/
  sbx-demo/
    dotfiles/
  another-project/
```

The layout is a recommendation. Choose **one absolute directory** to mount. It must contain this `sbx-demo` checkout and can contain other project checkouts. The example below selects `$HOME/workspace`; change it to the directory you chose:

```bash
export SBX_DEMO_WORKSPACE="$HOME/workspace"
```

Keep this value in the host shell where you run the next steps. `dev-demo` also needs it each time you open a new host shell. You can add the export to your host shell startup file if you want it to persist.

## 2. Create the sandbox

Go to the `dotfiles/` directory in your checkout. For the example layout:

```bash
cd "$SBX_DEMO_WORKSPACE/sbx-demo/dotfiles"
bash ./regenerate_sandbox --workspace-mount "$SBX_DEMO_WORKSPACE"
```

The script builds an image, loads it into `sbx`, creates `sbx-demo`, links the tracked settings, and checks the installed tools. It will not replace a sandbox already named `sbx-demo`.

## Optional: move OMP data from an old sandbox

Stop OMP in the old sandbox before moving its data. When you create `sbx-demo` in step 2, add `--old-name` with the name of that sandbox:

```bash
bash ./regenerate_sandbox --workspace-mount "$SBX_DEMO_WORKSPACE" --old-name OLD_SANDBOX
```

The script exports the old OMP database and optional private `.env` file, then imports them into the new sandbox. Do not use an existing `sbx-demo` as the old sandbox. Private data and the saved image remain under `dotfiles/staging/`. This directory is ignored by Git and excluded from image builds. Review and remove its contents when you no longer need them.

## 3. Make `dev-demo` available on the host

Still in `dotfiles/`, link the launcher into your host's local command directory:

```bash
mkdir -p "$HOME/.local/bin" && ln -s "$(pwd -P)/dev-demo" "$HOME/.local/bin/dev-demo"
```

Make sure `$HOME/.local/bin` is on your host `PATH`. If it is not, run `export PATH="$HOME/.local/bin:$PATH"` in this shell and add that line to your host shell startup file for later sessions.

## 4. Open a project in the sandbox

From any directory inside the mount, run `dev-demo` to start OMP or `dev-demo bash` to open Bash. For example:

```bash
cd "$SBX_DEMO_WORKSPACE/sbx-demo"
dev-demo
```

OMP may ask you to sign in. No credentials are included in this checkout. To work on another project, go to its directory inside the same mount and run `dev-demo` again. The launcher opens the matching directory inside the sandbox.

## What lives where

- `Dockerfile` installs tools and copies the tracked `home/` files for first boot.
- `home/` holds the Bash and Git dotfiles, OMP config, four example skills, three example agents, and commands. After setup, these files link to the mounted checkout: edits to them become available without another image build. OMP's live database stays outside the links.
- `copy-state.sh` and `omp-db-copy.py` move only private OMP data. No Claude or MCP setup is included.
- In the sandbox, `clear_caches` and `clear_docker` show a preview by default. Pass `--confirm` only when you intend to remove caches or unused Docker resources.
