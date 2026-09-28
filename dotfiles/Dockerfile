# Builds the demo image from the dotfiles/ directory as the Docker context.
# Installs only OMP, Node.js, Bun, and the tools needed to install them.
# Copies secret-free home files for the first boot; later links use the workspace.
# Runs as the agent user and keeps credentials outside the image.

FROM docker/sandbox-templates:shell-docker

# Installs archive tools and lsof for safe state transfer.
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl lsof unzip xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Pins release archives and checks their published hashes before installation.
ARG NODE_VERSION=24.19.0
ARG NODE_SHA256=01443c1e1a29e531ccad5a46fefa6df490d2189c49f7955904aecdbb0fe86fdc
ARG BUN_VERSION=1.3.7
ARG BUN_SHA256=d5c7d651423c2bc5ae3f92d36837ffb2ddc6ee91849672500b7fe8e5a5159fbc
ARG OMP_VERSION=18.3.2
ARG OMP_SHA256=f56f4775abbf269c481c78799691eaa59a7d69644fa7d592c775e2c65f7b13da

# Installs Node.js and Bun on the ARM64 sandbox image.
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-arm64.tar.xz" -o /tmp/node.tar.xz \
    && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-aarch64.zip" -o /tmp/bun.zip \
    && echo "${BUN_SHA256}  /tmp/bun.zip" | sha256sum -c - \
    && unzip -q /tmp/bun.zip -d /tmp \
    && install -m 755 /tmp/bun-linux-aarch64/bun /usr/local/bin/bun \
    && rm -rf /tmp/node.tar.xz /tmp/bun.zip /tmp/bun-linux-aarch64

# Installs OMP for the agent without placing login data in the image.
USER agent
RUN mkdir -p /home/agent/.local/bin \
    && curl -fsSL "https://github.com/can1357/oh-my-pi/releases/download/v${OMP_VERSION}/omp-linux-arm64" -o /home/agent/.local/bin/omp \
    && echo "${OMP_SHA256}  /home/agent/.local/bin/omp" | sha256sum -c - \
    && chmod 755 /home/agent/.local/bin/omp

# Copies only tracked configuration and example commands from this build context.
COPY --chown=agent:agent home/ /home/agent/
RUN chmod 755 /home/agent/.local/bin/*
ENV PATH="/home/agent/.local/bin:${PATH}"
WORKDIR /home/agent
