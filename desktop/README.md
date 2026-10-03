# Watch Codex use an Ubuntu desktop

Run Codex inside an Ubuntu desktop and watch it work in your browser. Codex can
see the screen, click, type, and use Chromium while you follow along live.

The desktop includes XFCE, a file manager, terminal, and settings. It uses
Ubuntu 26.04 with XFCE, similar to Xubuntu; it is not the standard GNOME Ubuntu
desktop. Everything runs in a local Docker Sandbox on your computer.

Start with the included demo: Codex opens a local webpage, types a message into
a form, clicks **Save message**, and checks the result on screen.

## Before you start

The setup below was tested on an **Apple silicon Mac**, using `sbx 0.46.0`.
Use a macOS version supported by Docker Desktop, and at least macOS 14 for
local Docker Sandboxes. See
[VALIDATION.md](VALIDATION.md) for the tested versions and results.

You need:

| Requirement | How to get it |
| --- | --- |
| Docker Desktop, installed and running | [Install Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/), then open the app. |
| Docker Sandboxes (`sbx`) | Follow [Docker's installation guide](https://docs.docker.com/ai/sandboxes/install/). With Homebrew, run `brew trust docker/tap`, then `brew install docker/tap/sbx`. |
| Python 3 on your Mac | Check with `python3 --version`. If it is missing, [install Python for macOS](https://www.python.org/downloads/macos/). |
| A Docker account and access to Codex | You will sign in during setup below. An OpenAI API key is an alternative to Codex account authentication. |
| Space and memory for the sandbox | The example allocates 2 CPUs and 4 GB of RAM. Leave several GB of free disk space for the image, temporary image export, and sandbox. |

You do **not** need to install Ubuntu, Chromium, or the Codex CLI on your Mac.
The build installs them inside the sandbox image.

This launcher uses Bash and Unix tools. Other platforms have not been tested;
the Windows `sbx` installation instructions alone are not enough to run it.

## Set it up

**Run all commands below in a terminal on your Mac**, not inside the Ubuntu
desktop. Keep using the same terminal during setup.

### 1. Open this folder in your terminal

Clone or download this repository, then change into its `desktop` directory.
Replace `/path/to/sbx-demo` with wherever you saved the repository:

```bash
cd /path/to/sbx-demo/desktop
```

If your terminal is already at the repository root, just run `cd desktop`.
This example is self-contained in this folder, so you can also copy the whole
folder elsewhere and run it there.

Check that you are in the right place and that the required tools work:

```bash
ls Dockerfile desktop kit/spec.yaml
docker info
sbx version
python3 --version
```

The first command should list three files. `docker info` should show information
about the running Docker engine, and the last two commands should print version
numbers. Resolve any missing-tool or connection errors before continuing.

### 2. Sign in

Sign in to Docker, then connect your Codex account:

```bash
sbx login
sbx secret set openai --oauth
```

Follow the browser prompts for each command. If both accounts are already
configured in Docker Sandboxes, you can skip this step.

If you prefer an OpenAI API key, use `sbx secret set openai` instead of the OAuth
command. Enter the key when prompted. Docker Sandboxes manages authentication;
you do not need to copy your Mac's Codex configuration or credentials.

### 3. Build the desktop image

```bash
./desktop build
```

The first build downloads Ubuntu packages and Chromium, so allow several
minutes. Every build checks npm for the latest stable Codex release and installs
that exact version, including its app server. Docker's cache still reuses the
desktop packages; it cannot hide a new Codex release. The build prints the
selected and installed versions, then imports the image into Docker Sandboxes.
Wait for the command
to finish; a successful import ends with **Load complete.**

Run this once for the initial setup. Rebuild to get a newer Codex release or
when you change the image or its bundled runtime files. The image stays local; this command does
not publish it to a registry.

### 4. Create the sandbox

```bash
./desktop create
```

This creates a sandbox named `codex-ubuntu-desktop-demo`, starts its desktop,
and prints a **Live viewer** URL when it is ready. Only this `desktop` folder
is shared with the sandbox. Changes the agent makes to files in this folder
will also appear on your Mac.

You may see a warning that the image was built for `codex` but the kit is named
`codex-desktop`. This kit inherits Codex's setup; that pairing was verified in
the included [validation record](VALIDATION.md).

### 5. Open the desktop in your browser

```bash
./desktop watch
```

Your browser should open and show the Ubuntu desktop with Chromium running.
If it does not open automatically, use this URL:

[Open the desktop viewer](http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale&view_only=1)

Leave this tab open. It is a live, view-only window into the same screen Codex
uses. You can resize the tab without changing the agent's screen coordinates.

## Try the computer-use demo

With the desktop visible in your browser, return to your Mac's terminal and run:

```bash
./desktop demo
```

Watch Chromium while Codex navigates to the demo page, types **Hello from
Codex**, and clicks **Save message**. The page should display:

```text
Saved: Hello from Codex
```

The terminal prints the agent's activity and finishes with two checks:

- A `PASS` confirming that Codex used only the desktop tools, including
  screenshots before and after the task.
- A `PASS` confirming that the browser submitted the expected message.

The demo uses a webpage inside the sandbox, so it does not depend on an external
website. It uses **GPT-6.1 Sol** (`gpt-6.1-sol`), so the connected account needs
access to that model. Codex still needs its model connection to perform the task.

After a successful run, this folder contains the following evidence:

| File | What it contains |
| --- | --- |
| `.results/agent.jsonl` | The agent's activity and tool calls. |
| `.results/result.json` | The message received by the demo page's server. |
| `.results/verified.png` | A screenshot of the desktop after the task. |

You can run `./desktop demo` again. It replaces the previous demo evidence.

## Give Codex your own task

The kit uses [Cua Computer Server](https://pypi.org/project/cua-computer-server/),
from the [Cua project](https://github.com/trycua/cua), for desktop control. Its
MCP endpoint is registered in the sandbox's Codex configuration at every start.
Ordinary Codex sessions can use it without a special runner or a Cua account.

### From the Mac Codex app over SSH

Run `./desktop watch` to start the desktop and open its live viewer. Connect the
Mac Codex app to `ssh://agent@codex-ubuntu-desktop-demo.sbx` using the same SSH setup you use
for other Docker Sandboxes. If you have not configured sandbox SSH yet, run
`sbx setup ssh` on your Mac first. Codex's
[SSH connection guide](https://developers.openai.com/codex/remote-connections/)
explains how to add a host in **Settings → Connections**.

Open this project's folder on the remote host (the mounted folder keeps its
absolute Mac path), then start a new chat. Ask Codex to use the **desktop MCP
tools** for screenshots, clicks, and typing. Keep the noVNC tab open to watch
the same Ubuntu screen while the app runs the task.

The app starts ordinary `codex app-server` through SSH. It reads the remote
configuration, which already includes the desktop tools. The CLI launcher and
Mac app both control the same desktop; run one computer-use task at a time.
The app's own approval settings still apply to SSH chats.

Choose **GPT-6.1 Sol** (`gpt-6.1-sol`) in the app's model picker. In the CLI,
use `./desktop run --model gpt-6.1-sol`. The image includes the latest Codex
release; model access also depends on the connected account and workspace.

If the host does not appear in the app, add a concrete `Host` entry for
`codex-ubuntu-desktop-demo.sbx` in your Mac's `~/.ssh/config`. The app ignores
wildcard-only entries. Keep Docker's generated wildcard SSH configuration;
the concrete entry only makes this sandbox discoverable.

### From the terminal

Start an interactive Codex session:

```bash
./desktop run
```

Then ask it to use the desktop tools. For example:

> Use the desktop MCP tools to open http://127.0.0.1:8081 in Chromium, enter
> "My own desktop task" in the Message field, click Save message, and verify
> the result with a screenshot.

You can also supply a task directly from the terminal:

```bash
./desktop run 'Use the desktop MCP tools to browse https://example.com and describe the page.'
```

Keep the viewer open to follow the task. Mentioning the **desktop tools** tells
Codex to use the visible browser instead of completing the task through shell
commands or another interface.

Public websites are subject to the sandbox's network policy and proxy
certificate setup. The included validation covers the local demo; public-site
browsing has not been tested.

## Stop, restart, or remove it

Closing the browser tab does not stop the sandbox. When you are finished, run:

```bash
./desktop stop
```

This stops the sandbox and preserves its installed tools, browser profile, and
files. To return later, open a terminal in this folder and run:

```bash
./desktop watch
```

There is no need to build or create it again just to restart it.

To remove the sandbox completely:

```bash
./desktop stop
sbx rm codex-ubuntu-desktop-demo
```

Removal deletes the sandbox's internal files and browser profile. The shared
files in this folder, including `.results`, stay on your Mac.

## Troubleshooting

Start with:

```bash
./desktop status
```

It prints the viewer's port mapping and recent desktop service logs.

| Problem | What to do |
| --- | --- |
| `docker`, `sbx`, or `python3` is not found | Install the missing tool using the links above, then open a new terminal. |
| `./desktop` gives a permission error | From this folder, run `chmod +x desktop`, then retry. |
| Docker cannot connect to its engine | Open Docker Desktop and wait for it to finish starting. Retry `docker info`. |
| `create` cannot find the template | Run `./desktop build` and wait for **Load complete.** A regular Docker image alone is not available in sbx's separate template store. |
| The sandbox name already exists | Run `./desktop watch` to reuse it. To create another one, choose a new name as shown below. |
| Port 6080 is already in use | Choose another viewer port using the instructions below. |
| The viewer is blank, disconnected, or stuck connecting | Run `./desktop watch` again, then reload the viewer tab. If it still fails, inspect `./desktop status`. |
| Codex authentication fails | Run `sbx secret set openai --oauth` on your Mac and complete sign-in, then retry the task. |
| Desktop tools still have the old `screenshot` / `click` names | This sandbox was created from the previous kit. Create a new sandbox using the template-change instructions below; Cua tools use names such as `computer_screenshot` and `computer_click`. |
| A public website does not load | First confirm the local demo works, then check the sandbox's network policy and proxy certificate configuration. |

### Use a different name or port

Set these variables **before** creating a new sandbox, and keep them set in the
terminal where you run subsequent commands:

```bash
export DESKTOP_SANDBOX_NAME=my-ubuntu-desktop
export DESKTOP_VIEWER_PORT=6082
./desktop create
./desktop watch
```

If you open a new terminal, set the same variables there before using `run`,
`demo`, `watch`, `status`, or `stop`. When removing a custom sandbox, pass its
name to `sbx rm`, for example `sbx rm my-ubuntu-desktop`.

### Apply changes to the template

Rebuilding does not update a sandbox that already exists. After editing the
Dockerfile, runtime files, or kit, build the image and create a new sandbox:

This also applies when upgrading from the earlier custom desktop MCP server
to Cua. A new sandbox picks up both the Cua package and its HTTP registration.

```bash
./desktop build
export DESKTOP_SANDBOX_NAME=codex-ubuntu-desktop-v2
export DESKTOP_VIEWER_PORT=6082
./desktop create
./desktop watch
```

## How it works

The [Dockerfile](Dockerfile) builds Ubuntu, XFCE, Chromium, and the computer-use
tools on top of Docker's Codex image. The [kit](kit/spec.yaml) keeps Codex's
authentication, registers the desktop MCP server, and starts the desktop
services. Registration uses `codex mcp add desktop --url http://127.0.0.1:8000/mcp`
on every sandbox start, preserving
the existing configuration and restoring the entry if Docker regenerates its
managed config. The `desktop` launcher handles
building, creating, viewing, and stopping the sandbox.

Codex talks to upstream **Cua Computer Server 0.3.46** over MCP. Cua's VNC
backend sends mouse and keyboard input to the desktop's VNC server and captures
its screen. noVNC streams that same VNC session into your host browser.
The desktop and Codex share a filesystem inside the sandbox.

```text
Codex ── MCP ── Cua Computer Server ── VNC ── Ubuntu desktop
                                      │
                                    noVNC
                                      │
                               Your Mac's browser
```

The viewer is published only on `127.0.0.1`, meaning it is accessible from your
own computer. It has no login; keep it local. Remote sharing would require
authentication and HTTPS. To control the desktop yourself, pause Codex and
change `view_only=1` to `view_only=0` in the viewer URL.

Cua's MCP endpoint listens only inside the sandbox at `127.0.0.1:8000/mcp`;
the host only exposes the viewer. In VNC mode, Cua advertises 15 screen,
pointer, and keyboard tools, such as `computer_screenshot`, `computer_click`,
`computer_type`, and `computer_hotkey`. Use screenshot coordinates on the
1280×800 display. Cua's VNC backend does not expose shell, filesystem, or
browser DOM tools.

The server runs unmodified in its own Python 3.13 environment at
`/opt/cua/venv/`, because its published package requires Python below 3.14.
Ubuntu and the browser supervisor continue using their existing Python
environments. You do not need to install this extra Python on your Mac.

The sandbox provides the isolation boundary: Chromium runs without its nested
renderer sandbox. The CLI demo uses the approval bypass expected by Docker's
sandboxed agent; SSH chats use the Mac app's permission settings. No host
display, GPU, or Docker socket is shared.

This is an example configuration, tested with an experimental v2 sbx kit.
The Ubuntu base image and direct Python dependencies are pinned. Codex is
updated to the latest stable release at build time; APT packages and
transitive Python dependencies are not fully locked. The runtime includes
compatibility fixes for Chromium on Ubuntu 26.04, websockify on Python 3.14, and
the sandbox's browser proxy setup. Desktop logs and the browser profile live inside the
sandbox at `/home/agent/.local/state/desktop/`.

## Further reading

- [Validation results](VALIDATION.md)
- [Cua project](https://github.com/trycua/cua)
- [Cua Computer Server package](https://pypi.org/project/cua-computer-server/)
- [Docker Sandboxes installation](https://docs.docker.com/ai/sandboxes/install/)
- [Codex authentication in Docker Sandboxes](https://docs.docker.com/ai/sandboxes/agents/codex/)
- [Docker template and v2 kit specification](https://docs.docker.com/ai/sandboxes/customize/kits-v2/)
- [Codex MCP configuration](https://developers.openai.com/codex/mcp/)
- [noVNC](https://github.com/novnc/noVNC)
