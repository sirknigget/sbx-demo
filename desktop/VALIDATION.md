# Validation

Verified on 2026-10-04 using an ARM64 Mac with Docker Desktop, sbx 0.46.0,
Codex CLI/app server 0.160.0, Cua Computer Server 0.3.46 on Python 3.13.16,
and the Ubuntu 26.04 Codex base image.

- Built the final template and imported it into sbx's local template store.
  The build resolved npm's latest stable Codex version to 0.160.0, installed
  that release over the base image's 0.149.1, and checked both the CLI version
  and app-server command. Each build resolves the version before Docker runs,
  making a newly published release invalidate the Codex installation layer.
- Created a fresh sandbox from that template. Desktop/browser readiness passed;
  all six packaged runtime files matched the source by SHA-256, and the host
  noVNC page returned HTTP 200. The temporary sandbox was removed afterward.
- Confirmed XFCE panel, desktop, window manager, and Thunar processes running.
- Watched the shared display in the host's in-app browser through noVNC.
- Codex completed `task.txt`: navigated using the address bar, typed
  `Hello from Codex`, clicked Save message, and read the visible confirmation.
- Reran the demo using plain `codex exec`, with no MCP configuration overrides
  or special runner, explicitly selecting `gpt-6.1-sol`. Audited 17 completed
  Cua desktop MCP calls, including seven screenshots. No
  shell, DOM, HTTP, or other tool shortcuts appeared in the task trace.
- Independently checked `result.json` and captured `verified.png`.
- Validated kit YAML, Bash syntax, and Python syntax.
- Tested stop/restart and the detached host keepalive. The fresh verification
  sandbox used the viewer on `127.0.0.1:6082` and was removed after the checks.
- Confirmed that a fresh sandbox registers the desktop MCP server during
  startup at `http://127.0.0.1:8000/mcp`, alongside the existing Docker MCP
  gateway. Removed the desktop entry and restarted; startup restored it
  automatically.
- Started plain `codex app-server` over SSH, created an ephemeral session,
  discovered all 15 upstream Cua VNC tools, and called `computer_screenshot`
  successfully. Cua returned a JPEG of the shared 1280×800 desktop.
  Repeated the SSH check after restart, without command-line MCP overrides.
  This verifies the remote app-server path; the Mac app's connection UI was
  not exercised.
- Verified `gpt-6.1-sol` is present and visible in the SSH app-server's
  `model/list` response. The successful desktop demo confirmed actual model
  access with the stored sandbox account, not just a catalog entry.
- Confirmed `/opt/desktop/computer.py` is absent from the fresh image. Desktop
  control uses the unmodified published `cua-computer-server[vnc]==0.3.46`
  package. Its VNC tool inventory excludes shell, filesystem, and DOM tools.

Evidence is generated under `.results/` and ignored by Git:
`agent.jsonl`, `result.json`, and `verified.png`. Reproduce with
`./desktop/desktop demo` while the viewer is open. For a clean setup, follow
[README.md](README.md) and create a new sandbox name.

The SSH check also saved `.results/ssh-check.json` (including the model ID) and
`.results/ssh-verified.jpg`. New sandboxes register the desktop MCP server
automatically at every start. Kit version 1.3.0 uses upstream Cua Computer
Server and updates Codex at build time. Model access for another account or
workspace depends on that account's permissions. Existing sandboxes retain
their original image and kit; create a new sandbox to apply this replacement.

AMD64 is supported by the selected base/browser bundles but was not tested.
Public-site browsing and proxy certificate trust were not tested; the browser
task used the app inside the sandbox. This is Ubuntu with XFCE, not GNOME.

sbx may report that the image was built for `codex` while the named kit is
`codex-desktop`. The kit explicitly extends Codex and uses its binary and
authentication; the fresh-template and agent tests above verified this pairing.
