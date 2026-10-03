# Override BASE_IMAGE to update the Codex baseline deliberately.
ARG BASE_IMAGE=docker.io/docker/sandbox-templates:codex@sha256:a68b972a59148c6359ade441387159033f6d196d48aef9dda06d2d4bb26eb41e
FROM ${BASE_IMAGE}

USER root
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    xvfb openbox x11vnc novnc websockify xdotool x11-utils scrot \
    dbus-x11 xterm fonts-dejavu-core python3-venv \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt /opt/desktop/requirements.txt
RUN python3 -m venv /opt/desktop/venv \
    && /opt/desktop/venv/bin/pip install --no-cache-dir -r /opt/desktop/requirements.txt \
    && /opt/desktop/venv/bin/python -c 'import platform; print("ubuntu24.04-" + ("arm64" if platform.machine() == "aarch64" else "x64"))' > /opt/desktop/playwright-platform \
    && PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="$(cat /opt/desktop/playwright-platform)" /opt/desktop/venv/bin/python -m playwright install-deps chromium \
    && rm -rf /var/lib/apt/lists/*
ENV DISPLAY=:1 PLAYWRIGHT_BROWSERS_PATH=/opt/desktop/browsers
RUN PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="$(cat /opt/desktop/playwright-platform)" /opt/desktop/venv/bin/python -m playwright install chromium \
    && chmod -R a+rX /opt/desktop/browsers
# Full Ubuntu XFCE desktop: panels, window manager, file manager and settings.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    xfce4 xfce4-terminal mousepad adwaita-icon-theme \
    && rm -rf /var/lib/apt/lists/*
# Cua's published server supports Python 3.12/3.13. Keep Ubuntu's Python and
# our browser environment intact; install its upstream VNC/MCP backend here.
ENV UV_PYTHON_INSTALL_DIR=/opt/cua/python
COPY cua-requirements.txt /opt/cua/requirements.txt
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends build-essential linux-libc-dev \
    && rm -rf /var/lib/apt/lists/* \
    && /opt/desktop/venv/bin/uv venv --python 3.13 /opt/cua/venv \
    && /opt/desktop/venv/bin/uv pip install --python /opt/cua/venv/bin/python -r /opt/cua/requirements.txt \
    && /opt/cua/venv/bin/python -m computer_server --help >/dev/null \
    && chmod -R a+rX /opt/cua \
    && rm -rf /root/.cache/uv
# The Codex package includes both the CLI and `codex app-server`.
# The host build command resolves latest to an exact version on every build,
# so a cached layer cannot keep an older release when a newer one is available.
ARG CODEX_VERSION=latest
RUN npm install --global --prefix /usr/local/share/npm-global "@openai/codex@${CODEX_VERSION}" \
    && /usr/local/share/npm-global/bin/codex --version \
    && /usr/local/share/npm-global/bin/codex app-server --help >/dev/null \
    && npm cache clean --force
COPY runtime/ /opt/desktop/
USER agent
# The kit registers desktop tools alongside sandbox-managed Codex settings.
# No host display socket, host Docker socket, GPU, or privileged mode needed.
EXPOSE 6080
