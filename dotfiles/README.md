# Your development sandbox

This demo creates a sandbox named `sbx-demo`: a separate Linux environment with **OMP (Oh My Pi), Pi, Codex, Claude Code, Node.js, Bun, Git, and Docker** ready to use. You can work on this repository or any other project in your shared workspace.

Your project files stay on your computer and are shared with the sandbox. Edits inside the sandbox also change those files on your computer. The sandbox's Bash, Git, agent settings, and skills link back to this repository, so you can keep your setup under version control.

Setup uses Docker **kits v3**. The kit describes the environment and its optional provider credentials; the accompanying Dockerfile installs the tools. One setup command builds and connects everything.

## Before you start

Run all setup and `dev-demo` commands in a terminal **on your computer**, not inside another sandbox.

You need:

- Docker installed and running, with Buildx available.
- Docker Sandboxes (`sbx`) with kits v3 support. This flow was tested with `sbx` 0.46.0.
- A local checkout of this repository.
- Bash or Zsh for the host scripts and launcher. The sandbox uses Bash.

The image is built for Linux ARM64. This setup has been tested on **macOS with Apple Silicon**; other platforms have not been tested. See the [Docker Sandboxes documentation](https://docs.docker.com/ai/sandboxes/) for installation and platform support.

Check your tools before continuing:

```bash
docker info
docker buildx version
sbx version
```

Provider credentials are optional. You can create the sandbox with OpenAI, Anthropic, both, or neither.

## 1. Choose your shared workspace

Choose an absolute directory that contains this repository and any other projects you want to use. For example:

```text
workspace/
  sbx-demo/
    dotfiles/
  another-project/
```

Set the path in your host terminal. Change this example if your workspace lives elsewhere:

```bash
export SBX_DEMO_WORKSPACE="$HOME/workspace"
```

The examples below assume the checkout is named `sbx-demo`. Adjust that part of the paths if you gave it another name.

Keep `SBX_DEMO_WORKSPACE` set whenever you use the launcher. To avoid setting it in every new terminal, add the export to your host shell's startup file, such as `~/.zshrc`.

## 2. Choose your provider credentials — optional

Skip this step if you only want to explore the environment, or if your credentials are already stored in `sbx`.

To see which credentials are stored, run:

```bash
sbx secret ls
```

### OpenAI: use your ChatGPT login

Sign in on the host before creating the sandbox:

```bash
sbx secret set openai --oauth
```

Follow the sign-in instructions. If your OpenAI login is already stored, you do not need to sign in again. OMP, Pi, and Codex will use it through Docker's host proxy.

If you prefer an OpenAI API key, use `sbx secret set openai` and enter the key when prompted instead. API usage is billed separately from a ChatGPT subscription.

### Anthropic: use an API key or Claude subscription

For an Anthropic API key, store it before creating the sandbox:

```bash
sbx secret set anthropic
```

Enter the key at the prompt. If Docker already has an Anthropic OAuth login stored, the setup can reuse it too.

For a new Claude subscription login, create the sandbox first, then open `dev-demo claude` and use `/login` inside Claude Code. This local `sbx` version does **not** support `sbx secret set anthropic --oauth`; see [Docker's Claude authentication instructions](https://docs.docker.com/ai/sandboxes/agents/claude-code/).

A free Claude account does not include Claude Code subscription access. Supported routes include Pro/Max, an eligible team account, or Anthropic Console credentials. Console also supports signing in without creating an API key. See [Claude Code authentication](https://code.claude.com/docs/en/authentication) for account requirements.

### What happens to your credentials?

With the kit's managed credentials, real tokens stay on the host. The tools inside the sandbox use placeholders that Docker replaces when sending provider requests. Do not paste tokens into tracked files in this repository. See [Docker's credential guide](https://docs.docker.com/ai/sandboxes/configuration/credentials/) for details.

OMP and `dev-demo pi` start with OpenAI when it is available, otherwise Anthropic. When neither is configured, each tool keeps its own login flow. Codex and Claude Code each use their respective provider.

For automatic provider selection, prepare your credentials before creation. If you add a previously absent provider later, a fresh setup picks up its mode and updates the agents’ provider settings; this guide does not automatically rebuild an existing sandbox.

## 3. Create the sandbox

From your host terminal:

```bash
cd "$SBX_DEMO_WORKSPACE/sbx-demo/dotfiles"
./regenerate_sandbox --workspace-mount "$SBX_DEMO_WORKSPACE"
```

Optionally add `--old-name OLD_SANDBOX` to bring OMP, Codex, Claude Code, and Pi history, settings, and saved logins from an **old sandbox**. Stop the agents there first and make sure it has this workspace mounted at the same path. The old sandbox stays in place; setup saves a clean template before importing, then applies this demo’s settings and host-managed credentials. Private copies remain in `dotfiles/staging/`; remove them after checking the transfer.

The first build can take several minutes while it downloads tools. If Docker asks to approve the kit's credentials, review the displayed provider domains. Choose **Approve all** to allow this kit to use both declared providers; approval does not create a missing login or API key.

The setup:

1. Builds the kit with its own Docker builder, leaving your selected host builder unchanged.
2. Creates `sbx-demo` with your workspace mounted.
3. Saves a fresh template backup under `~/agent-sandbox-backup/`.
4. Links the repository's settings and skills into the sandbox. Docker's shared skill store is disabled; repo skills remain enabled.
5. Checks installed tools and reports provider status.

When OpenAI is configured, setup also makes small OMP and Pi requests. With OpenAI OAuth, it checks Codex with another small request. These use your provider allowance; API-key requests may incur usage charges. **Setup makes no paid Anthropic request.** A reported Claude login describes authentication, not whether your account has credits or model access.

Look for `Done.` at the end. Missing provider credentials do not prevent creation. The script refuses to replace an existing sandbox named `sbx-demo`.

## 4. Add the launcher to your host

Make `dev-demo` available as a command:

```bash
mkdir -p "$HOME/.local/bin"
ln -s "$SBX_DEMO_WORKSPACE/sbx-demo/dotfiles/dev-demo" "$HOME/.local/bin/dev-demo"
export PATH="$HOME/.local/bin:$PATH"
```

Add the `PATH` export to your host shell's startup file too, if that directory is not already on your path. If the link already exists, check where it points rather than overwriting it blindly.

You can also run the launcher directly without installing the link:

```bash
"$SBX_DEMO_WORKSPACE/sbx-demo/dotfiles/dev-demo" bash
```

## 5. Work on a project

In your host terminal, go to any project inside the shared workspace:

```bash
cd "$SBX_DEMO_WORKSPACE/another-project"
```

Then choose what to open:

| Host command | Opens inside `sbx-demo` |
| --- | --- |
| `dev-demo` or `dev-demo omp` | OMP |
| `dev-demo pi` | Pi |
| `dev-demo codex` | Codex |
| `dev-demo claude` | Claude Code |
| `dev-demo bash` | An interactive Bash shell |

The agents run with full permissions inside Docker: Codex bypasses approvals and its inner sandbox, Claude Code skips permission checks, and OMP uses YOLO approval mode. Pi runs its tools without a permission gate and automatically trusts project files here.

`~/.local/bin/` is permanently on the sandbox PATH, including login and noninteractive shells. Run included commands such as `link-tracked-home`, `clear_caches`, and `clear_docker` by name. `pi-managed` selects a host provider; plain `pi` lets you choose your own provider and use `/login`. See the [Pi authentication guide](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md).

Each command opens the same project directory inside the sandbox. You do not need a separate sandbox for every project. A stopped sandbox starts when you use the launcher.

In the Bash shell, use your normal development commands. Type `exit` to leave it. To stop the sandbox while keeping its files, run this **on the host**:

```bash
sbx stop sbx-demo
```

## Customize your environment

Edit files under `dotfiles/home/` on the host to change Bash, Git, agent settings, or repo skills. Existing linked files become available in the sandbox without rebuilding; restart the relevant shell or tool if it caches its settings.

The user settings files are linked to these repo files:

| Agent | File under `dotfiles/home/` |
| --- | --- |
| Codex | `.codex/config.toml` |
| Claude Code | `.claude/settings.json` |
| Pi | `.pi/agent/settings.json` |
| OMP | `.omp/agent/config.yml` |

Setup includes minimal initial settings even if an agent has never been opened. Edit these files to keep your preferences in Git. Codex’s separate `.codex/sandboxd.config.toml` profile provides host OAuth routing. Login files, session history, and generated provider overlays stay private in the sandbox; keep real keys out of tracked settings.

Codex and Claude Code each include a `SessionStart` hook that reports the working directory and time, plus a `demo-reader` subagent that summarizes requested files. Try asking either agent: “Use demo-reader to summarize the dotfiles Dockerfile.” The examples inherit the sandbox’s full permissions. Their definitions live in `.codex/hooks.json`, `.claude/settings.json`, and each agent’s `agents/demo-reader` file; both hooks call the same `.config/sbx-demo/session-start.sh` script. In Codex, use `/hooks` to review and trust the example before its first run. See the [Codex hooks guide](https://developers.openai.com/codex/hooks) and [Claude hooks guide](https://code.claude.com/docs/en/hooks).

The image template already links `~/.claude/skills` to `~/.agents/skills`, so Claude uses the shared skill folder before the repository is linked too.

After adding new files, open a sandbox shell from the dotfiles directory. On the host:

```bash
cd "$SBX_DEMO_WORKSPACE/sbx-demo/dotfiles"
dev-demo bash
```

Then, inside that sandbox shell:

```bash
link-tracked-home "$PWD/home"
```

Tool installs and pinned versions live in `Dockerfile`. Provider declarations live in `sbx-demo.yaml`. Changes to these require a fresh sandbox setup. The regeneration script deliberately leaves existing sandboxes alone; preserve any sandbox-only data before choosing to remove and recreate one.

## Common questions

**“Sandbox already exists: sbx-demo.”** Setup creates a new sandbox rather than updating one. Use `dev-demo` to open the existing environment. For a deliberate rebuild, first preserve anything you need from its home directory; files in the shared workspace remain on the host.

**“Set SBX_DEMO_WORKSPACE…” or “Current directory is not inside…”** Set the variable to the directory used at creation, then move to a project inside it. The launcher needs both the workspace path and a matching current directory.

**Codex says it is logged in with an API key, even though I used ChatGPT.** In managed OAuth mode, Codex sees a proxy placeholder and labels it as an API key. Docker supplies the real host OAuth login for requests. The setup's successful Codex response is the useful check.

**Claude reports `loggedIn: false`.** This is expected when no Anthropic credential is available. Use an eligible account or API key; leaving Anthropic unconfigured does not prevent OpenAI tools from working.

**An OpenAI check fails after the sandbox was created.** The sandbox may already exist even though setup did not reach `Done.`. Check the stored login and the provider error before retrying; a rerun will not overwrite the sandbox.

## Clean up caches inside the sandbox

Open `dev-demo bash` and preview cleanup first:

```bash
clear_caches --dry-run
clear_docker --dry-run
```

`clear_caches` clears npm and npx caches, not Bun's cache. `clear_docker` stops and removes Docker containers and images **inside this sandbox**. Run either command without flags to review its confirmation prompt. `--confirm` skips the initial prompt; an interactive `clear_docker` run can separately offer to remove unused build cache and volumes.
