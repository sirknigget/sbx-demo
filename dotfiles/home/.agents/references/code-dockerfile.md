# Dockerfile code rules

Comments are mandatory for new or changed Dockerfiles. Do not return a Dockerfile that omits the
required file header and section comments.

Use this shape for new single-stage Dockerfiles:

```Dockerfile
# Builds a small production image for a Node API.
# Uses the repository root as the build context.
# Expects package*.json and src/ in the build context.
# Installs only production dependencies.
# Runs the API as the node user and exposes port 3000.
# Keeps secrets out of image layers.

FROM node:22-slim

# Stores NODE_ENV in a layer that does not change when source files change.
# Reads secrets from environment variables at runtime.
WORKDIR /app
ENV NODE_ENV=production

# Copies package files before source files.
# Avoids another dependency install when only source files change.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copies only application source files.
# Reads credentials and environment-specific configuration at runtime.
COPY src ./src

# Runs as the node user, which has no root permissions.
# Stores writable data in a mount outside the image.
USER node

# Documents port 3000 as the application port.
# Lets the container runtime decide whether to publish it.
EXPOSE 3000

# Starts the API as the main process.
# Passes container signals to the Node process.
CMD ["node", "src/server.js"]
```

Use this shape for multi-stage Dockerfiles:

```Dockerfile
# Builds a Go service.
# Separates compilation from the runtime image.
# Expects go.mod, go.sum, and cmd/server in the build context.
# Includes only the compiled server file in the final image.
# Runs the final image as a user without root permissions.
# Keeps runtime configuration outside the final image.

# Compiles the service in a Go image.
# Excludes Go tools and build caches from the final image.
FROM golang:1.23-alpine AS build
WORKDIR /src

# Copies module files before source files.
# Avoids another module download when only source files change.
COPY go.mod go.sum ./
RUN go mod download

# Copies service source files after dependency files.
# Keeps credentials out of the image.
COPY . ./
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

# Runs the compiled server file in the final image.
# Excludes a package manager and shell.
FROM gcr.io/distroless/static-debian12:nonroot

# Documents port 8080 as the service port.
# Lets the container runtime decide whether to publish it.
EXPOSE 8080

# Starts the service as the main process.
# Passes container signals to the service process.
COPY --from=build /out/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

Rules:

- New Dockerfiles start with 2-10 clear `#` header lines before `FROM`; Dockerfile syntax has no
  block comments.
- Add a comment before `FROM` for every stage. The first `FROM` does not need one when the file
  header explains that stage.
- Use 1-3 `#` lines for each stage or section comment. Use one line for a simple purpose. Use up to
  three lines when Dockerfile instructions do not show why the code is needed.
- Write every comment in Simplified Technical English (ASD-STE100). Use short, direct sentences with
  a clear subject and verb. Use the same word for the same meaning. Do not use jargon, idioms, or
  vague words.
- When a comment directly describes the code below it, omit the obvious subject and start with a
  present-tense verb. Use `it` in a following sentence when the reference is clear.
- Add a nearby comment for each ARG/ENV group. State its build or runtime configuration. State how
  secrets enter the container.
- Add comments for dependency installation, the files that COPY instructions include, permission
  changes, health checks, ports, and entrypoints.
- Explain image behavior, the build context, runtime requirements, persistent data, and security
  restrictions.
- Do not narrate Docker instruction syntax.
