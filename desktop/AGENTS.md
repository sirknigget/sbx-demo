# Desktop sandbox instructions

## Scope and purpose

This subproject provides an Ubuntu desktop inside a Docker sandbox. Codex can
control the desktop through an existing computer-use MCP server, while a human
watches the same screen through noVNC in a host browser. The host Codex macOS app
should also be able to use the sandbox through its normal SSH connection.

Keep desktop work under this directory. Follow the repository's parent
instructions, including its restrictions on `README.md`, `presentation/`,
`assets/`, and `dotfiles/`. Do not change those areas to support a desktop task.

## Architecture and file map

| File | Responsibility |
| --- | --- |
| `Dockerfile` | Extend the Codex sandbox image with Ubuntu desktop packages, browsers, Cua, and an updated Codex installation. |
| `requirements.txt` | Pin the Playwright and uv dependencies. |
| `cua-requirements.txt` | Pin the upstream Cua Computer Server with its VNC backend. |
| `kit/spec.yaml` | Inherit the Codex kit, register the desktop MCP server, start the desktop session, and provide agent instructions. |
| `desktop` | Host launcher for building, importing, creating, watching, running, verifying, and stopping a sandbox. |
| `host-keepalive.py` | Keep the sandbox session alive independently of the viewer tab. |
| `runtime/session.py` | Supervise Xvfb, XFCE, VNC, Cua, noVNC, the demo app, and Chromium. |
| `runtime/ready.py` | Wait for the display, browser, and services to be ready. |
| `runtime/viewer.py` | Serve noVNC using the system websockify installation. |
| `runtime/browser.py` | Launch headed Chromium on the shared desktop. |
| `runtime/demo.py`, `runtime/verify.py` | Provide the local form task and independently verify its result. |
| `task.txt`, `audit.py` | Define the computer-use demo and audit the agent's tool calls. |
| `VALIDATION.md` | Record observed verification results and remaining limitations. |

The shared display is `:1`, currently 1280 × 800, running XFCE. VNC uses port
5900, Cua's HTTP MCP endpoint is `http://127.0.0.1:8000/mcp`, noVNC uses port
6080, and the local demo app uses port 8081. Update consumers together if any of
these values change.

## Preserve these design decisions

- Use the upstream Cua Computer Server with its VNC backend. Do not replace it
  with a custom computer-use MCP implementation. Agent screenshots and actions
  must target the same display that the host viewer shows.
- Keep the normal Codex entrypoint and SSH/app-server workflow. Do not introduce
  a special Codex runner as a requirement for using the desktop.
- Resolve the latest stable Codex version during each host build, outside the
  Docker build cache, and pass that version into the image build. The CLI and
  `codex app-server` come from the same installation. Preserve the subsequent
  `sbx template load`: Docker Desktop and the sandbox template store are separate.
- Keep `gpt-6.1-sol` as the demo model. Verify model access with authenticated
  execution when relevant; an image build alone cannot establish account access.
- Register the MCP server through `codex mcp add` after sandbox-managed config
  exists. Keep startup registration idempotent and use the absolute Codex binary
  path, since the startup environment has a limited PATH. Preserve existing
  authentication and Docker MCP gateway configuration; do not overwrite the
  managed config wholesale.
- Run desktop services as the agent user. Keep the host viewer mapping on
  loopback and VNC/Cua on sandbox loopback. Mount only this subproject, preserve
  sandbox network policy, and do not add privileged mode, host display access,
  or a host Docker socket to make desktop control work.
- Keep credentials out of source, build contexts, and validation artifacts.
  Use the sandbox's supported authentication flow.
- Preserve the session lock, child-process supervision, readiness checks, and
  keepalive behavior. Closing a viewer tab should not stop the sandbox.

## Runtime compatibility

The desktop tooling and Cua have separate virtual environments. Cua currently
uses a uv-managed Python 3.13 because its dependencies do not support Ubuntu's
system Python 3.14. The viewer uses system Python for the APT-installed
websockify package and selects the multiprocessing fork method for compatibility.

Playwright currently uses an Ubuntu 24.04 platform override on Ubuntu 26.04.
Chromium's proxy flags preserve access to the loopback demo app while retaining
the sandbox proxy for external browsing. Change these accommodations only after
checking the affected upstream support and exercising the corresponding runtime.

## Validation

Match verification to the change. Documentation-only edits do not require
rebuilding or restarting a sandbox. For launcher or kit edits, start with these
checks from this directory:

```sh
bash -n desktop
sbx kit validate ./kit
```

For image, dependency, or runtime changes, build and import the template, then
create a fresh sandbox with a unique `DESKTOP_SANDBOX_NAME` and an unused
`DESKTOP_VIEWER_PORT`. Set `DESKTOP_OPEN_BROWSER=0` when an automatic browser
launch is unnecessary. Exercise `./desktop create`, `./desktop watch`, and
`./desktop demo` as appropriate. Confirm the host viewer displays the desktop
that the agent controls.

For MCP registration or SSH changes, also check the ordinary `codex app-server`
over SSH without custom configuration overrides: inspect model availability,
the desktop tool inventory, and a screenshot. Repeat after restarting the
validation sandbox and confirm startup restores desktop registration while
preserving other managed MCP entries. Distinguish this protocol check from an
actual connection through the macOS app UI.

The demo agent must complete the form through Cua's desktop tools, starting and
ending with screenshots. Do not make it pass through shell commands, HTTP
requests, DOM access, Playwright automation, or edits to fixture/result files.
The host audit and independent result verifier may inspect those artifacts.

Use disposable validation sandboxes. Do not stop, remove, or recreate an
existing user sandbox merely to test a change. Stop and remove only temporary
resources created for your validation, and avoid broad Docker/sandbox cleanup.

Keep generated logs and evidence in the ignored `.build/` and `.results/`
directories; do not commit them or `__pycache__/`. Update `VALIDATION.md` when
verification changes, recording what was actually observed, the tested platform
and versions, and any checks that remain unperformed. Do not claim a fresh build
updated an already-running sandbox: a new sandbox is needed to apply the rebuilt
image and kit.
