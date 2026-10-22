# Ubuntu desktop in a Docker Sandbox

Run Codex in a local Ubuntu XFCE desktop and watch its screen in your browser.
The setup was tested on an Apple silicon Mac with macOS 14 or later.

## How it works

The [Dockerfile](Dockerfile) extends Docker's Codex sandbox image with XFCE,
Chromium, and [Cua Computer Server](https://github.com/trycua/cua). The
[kit](kit/spec.yaml) starts the desktop and registers Cua as a desktop MCP
server for Codex.

The desktop runs on a virtual screen inside the sandbox. **VNC** is the remote
desktop connection to that screen: it carries the screen image out and mouse
and keyboard actions in. Cua uses VNC so Codex can see and control the desktop
through its MCP tools.

**noVNC** is a VNC viewer that runs in your browser. It shows you the *same*
screen Codex controls, so you can watch its actions live without installing a
VNC app. The browser viewer is view-only and is exposed only on your Mac at
`127.0.0.1`. Only this `desktop` folder is shared with the sandbox.

## Set up and connect

Run these commands in a **Mac terminal**. You need Docker Desktop running,
[Docker Sandboxes (`sbx`)](https://docs.docker.com/ai/sandboxes/install/),
Python 3, and the Codex app.

1. Open this folder (replace the path with your checkout):

   ```bash
   cd /path/to/sbx-demo/desktop
   ```

2. Sign in to Docker and connect your Codex account to Docker Sandboxes:

   ```bash
   sbx login
   sbx secret set openai --oauth
   sbx setup ssh
   ```

   Follow the sign-in prompts. For an API key, use `sbx secret set openai`
   instead of the OAuth command.

3. Build the image and create the sandbox:

   ```bash
   ./desktop build
   ./desktop create
   ```

   The first build can take several minutes. `build` imports the image into
   Docker Sandboxes; `create` starts the desktop and prints its viewer URL.

4. Open the live viewer:

   ```bash
   ./desktop watch
   ```

   Leave the browser tab open while Codex works. Its default URL is
   [http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale&view_only=1](http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale&view_only=1).

5. In the Codex app, open **Settings → Connections → SSH** and connect to
   `ssh://agent@codex-ubuntu-desktop-demo.sbx`. Select this `desktop` folder as
   the remote project; its path inside the sandbox is the same absolute path
   shown by `pwd` on your Mac. Start a chat and ask Codex to use the **desktop
   MCP tools** for screenshots and input. The browser tab shows the same desktop.

   If the host does not appear in the app, add a concrete
   `Host codex-ubuntu-desktop-demo.sbx` entry to your Mac's `~/.ssh/config`,
   outside Docker's managed block. Docker's `*.sbx` entry supplies the SSH
   settings.

## Stop and resume

Run `./desktop stop` to stop the sandbox. Later, run `./desktop watch` to
restart it and reopen the viewer. Run `./desktop status` if the viewer fails
to load. Rebuilding the image does not update an existing sandbox; create a
new one to use a changed image or kit.

For connection details, see [Codex remote connections](https://developers.openai.com/codex/remote-connections/)
and [Docker Sandbox SSH integration](https://docs.docker.com/ai/sandboxes/integrations/).
