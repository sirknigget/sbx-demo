# Builds the demo image from the dotfiles/ directory as the Docker context.
# Installs OMP, Pi, Codex, Claude Code, Node.js, and Bun.
# Copies secret-free home files for the first boot; later links use the workspace.
# Runs as the agent user and keeps credentials outside the image.

FROM docker/sandbox-templates:shell-docker

SHELL ["/bin/bash", "-lc"]

ENV DEBIAN_FRONTEND=noninteractive
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH="/home/agent/.local/bin:/usr/local/bin:/usr/local/share/npm-global/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin"

# Installs archive tools and lsof for safe state transfer.
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl lsof python3 unzip xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Pins release archives and checks their published hashes before installation.
ARG NODE_VERSION=24.19.0
ARG NODE_SHA256=01443c1e1a29e531ccad5a46fefa6df490d2189c49f7955904aecdbb0fe86fdc
ARG BUN_VERSION=1.3.7
ARG BUN_SHA256=d5c7d651423c2bc5ae3f92d36837ffb2ddc6ee91849672500b7fe8e5a5159fbc
ARG OMP_VERSION=18.3.2
ARG OMP_SHA256=f56f4775abbf269c481c78799691eaa59a7d69644fa7d592c775e2c65f7b13da

# Installs the verified Node.js archive at the source image's runtime location.
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-arm64.tar.xz" -o /tmp/node.tar.xz \
    && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
    && mkdir -p /usr/local/lib/nodejs \
    && tar -xJf /tmp/node.tar.xz -C /usr/local/lib/nodejs \
    && ln -s "/usr/local/lib/nodejs/node-v${NODE_VERSION}-linux-arm64/bin/node" /usr/local/bin/node \
    && rm -f /tmp/node.tar.xz \
    && mkdir -p "$NPM_CONFIG_PREFIX" \
    && chown agent:agent "$NPM_CONFIG_PREFIX" \
    && curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-aarch64.zip" -o /tmp/bun.zip \
    && echo "${BUN_SHA256}  /tmp/bun.zip" | sha256sum -c - \
    && unzip -q /tmp/bun.zip -d /tmp \
    && install -m 755 /tmp/bun-linux-aarch64/bun /usr/local/bin/bun \
    && rm -rf /tmp/bun.zip /tmp/bun-linux-aarch64

# Installs OMP for the agent without placing login data in the image.
USER agent
RUN mkdir -p /home/agent/.local/bin \
    && curl -fsSL "https://github.com/can1357/oh-my-pi/releases/download/v${OMP_VERSION}/omp-linux-arm64" -o /home/agent/.local/bin/omp \
    && echo "${OMP_SHA256}  /home/agent/.local/bin/omp" | sha256sum -c - \
    && chmod 755 /home/agent/.local/bin/omp

# Installs the same pinned npm version used by the source sandbox.
RUN npm install -g npm@11.17.0
RUN npm_npmrc="$NPM_CONFIG_PREFIX/lib/node_modules/npm/npmrc" \
    && if [[ -f "$npm_npmrc" ]]; then sed -i '/^globalignorefile=\/etc\/npmignore$/d' "$npm_npmrc"; fi

# Provider credentials are supplied by the v3 kit at runtime, never at build time.
ARG CODEX_VERSION=0.158.0
ARG CLAUDE_VERSION=2.1.284
ARG PI_VERSION=0.99.1
RUN npm install -g "@openai/codex@${CODEX_VERSION}" "@anthropic-ai/claude-code@${CLAUDE_VERSION}"
RUN npm install -g --ignore-scripts "@earendil-works/pi-coding-agent@${PI_VERSION}"
ENV IS_SANDBOX=1
ENV CLAUDE_ENV_FILE=/etc/sandbox-persistent.sh

# Copies only tracked configuration and example commands from this build context.
COPY --chown=agent:agent home/ /home/agent/
RUN chmod 755 /home/agent/.local/bin/* \
    && ln -s ../.agents/skills /home/agent/.claude/skills
ENV BASH_ENV=/home/agent/.config/sbx-demo/shell-env.sh

# Login shells may reset the image PATH; restore it after system profiles.
USER root
RUN ln -s /home/agent/.config/sbx-demo/shell-path.sh /etc/profile.d/sandbox-command-path.sh
USER agent
WORKDIR /home/agent
ENTRYPOINT ["/bin/bash"]
CMD ["-il"]
