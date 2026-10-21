# Dotfiles sandbox

Build the same ARM64 development kit locally or in Docker Sandboxes Cloud. It includes OMP, Pi, Codex, Claude Code, Node.js, Bun, Git, and Docker.

Run the commands below **on your host**, from a checkout of this repository. You need Docker with Buildx and `sbx` (tested with 0.49.1). Cloud use also needs a Docker account with Cloud Sandboxes access. The kit builds on the host in either mode.

## Use `dev-demo` by name (optional)

From the repository root, link the launcher into a directory on your host `PATH`:

```bash
mkdir -p "$HOME/.local/bin"
ln -s "$PWD/dotfiles/dev-demo" "$HOME/.local/bin/dev-demo"
export PATH="$HOME/.local/bin:$PATH"
```

Add the `PATH` export to `~/.zshrc` or `~/.bashrc` for new terminals. After creating a sandbox, use `dev-demo codex` locally or `dev-demo --cloud codex` from this checkout. If the link already exists, inspect it before replacing it.

## Local sandbox

1. Store a provider login if you want to use an agent immediately. This is optional; for example, `sbx secret set openai --oauth` signs in with OpenAI.
2. Choose a directory containing this checkout and any other projects you want to share. From the repository root:

   ```bash
   export SBX_DEMO_WORKSPACE="$(dirname "$PWD")"
   ./dotfiles/regenerate_sandbox --workspace-mount "$SBX_DEMO_WORKSPACE"
   ```

3. Launch from the repository root:

   ```bash
   ./dotfiles/dev-demo pi
   ```

Use `./dotfiles/dev-demo` for OMP (the default), or replace `pi` with `codex`, `claude`, or `bash`. From another project, use the launcher's absolute path or its `PATH` command. Keep `SBX_DEMO_WORKSPACE` set in each host terminal.

The workspace is mounted into the sandbox. Edits on either side appear in the same files. Setup saves a clean local template under `~/agent-sandbox-backup/`. To move private agent state from an older sandbox with the same mount, add `--old-name NAME` when creating; review and remove private copies left in `dotfiles/staging/` afterward.

## Cloud sandbox

1. Sign in and check access:

   ```bash
   sbx login
   sbx --cloud diagnose
   ```

2. Configure cloud credentials if needed. Cloud and local secrets are separate. For OpenAI, use `sbx --cloud secret set openai --oauth`. For a private GitHub repository, also use `sbx --cloud secret set github`.
3. From the repository root, build and launch:

   ```bash
   ./dotfiles/regenerate_sandbox --cloud
   ./dotfiles/dev-demo --cloud pi
   ```

Use `--cloud` with the other launcher choices too, for example `./dotfiles/dev-demo --cloud bash`. Run it from this checkout or one of its subdirectories.

Cloud cannot mount your host workspace. Setup builds the same kit for ARM64, then clones the default branch of this checkout's HTTPS GitHub `origin` into `/home/agent/workspace/sbx-demo` and links its settings there. Unpushed changes and other branches are not copied; push and check out the branch you need in cloud. Later cloud edits stay in the clone until you push them. Cloud setup does not transfer old sandbox state or save a local template backup.

## How it works

- `Dockerfile` installs the tools and copies secret-free defaults from `home/`. Setup links tracked settings and skills back to the mounted checkout or cloud clone, so those files stay under Git. Rebuild after changing the Dockerfile or kit definition.
- `sbx-demo.yaml` declares network access and optional provider credentials. Docker manages real credentials outside tracked files. Check stored logins with `sbx secret ls` or `sbx --cloud secret ls`.
- Local and cloud sandboxes have separate state, even though both are named `sbx-demo`. Creation refuses to replace an existing sandbox. A stopped sandbox resumes when you use the launcher; stop one with `sbx stop sbx-demo` or `sbx --cloud stop sbx-demo`.
- Docker can run inside a cloud sandbox. Docker documents a [cloud limitation](https://docs.docker.com/ai/sandboxes/cloud/usage/#docker-exec-and-healthchecks) affecting `docker exec`, `docker compose exec`, and healthchecks; `docker run` starts the container's main process correctly.


## Example pi prompt with installation + versioned extension creation:
## (run this from a different project than this one)

```
Install this tool globally on this machine: https://github.com/schachmat/wego, and then create a pi extension that displays visually appealing Tel Aviv weather information from open-meteo on the right half of the screen.
```