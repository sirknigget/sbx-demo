
## Setup

https://docs.docker.com/ai/sandboxes/get-started/
![](/Users/omergilad/Documents/Screenshots/Screenshot 2026-07-26 at 16.23.15.png)

_Optional - Storing Github access token in credential manager (replace with your token env variable):_

`sbx secret set -g github -t "$GITHUB_AGENT_SANDBOX_TOKEN"`

## Basic commands



Spawn a new Codex sandbox from a template, mounted in this workspace:

`sbx run codex`

Spawn a new Codex sandbox from a template, mounted in this workspace, with a custom name and with port 3000 exposed to the host:

`sbx run --name my-codex --publish 3000:3000/tcp4 codex`


_(First creation of a Codex sandbox will download image and prompt for Codex login)_




SBX interactive control plane:

`sbx`

List all sandboxes:

`sbx ls`

Execute a command in a running sandbox - in this example running interactive bash:

`sbx exec -it my-codex bash`

### Example fully autonomous tasks to try (will touch system files with no restrictions):

1. `Add an ASCII animated cat (total 3 rows of text, 2 seconds run time) that appears whenever any user starts a new interactive bash shell on the machine, including login shells and nested bash sessions. Ensure it does not run for noninteractive scripts and does not print twice for a single shell startup.`
2. `Create a colorful 'Hello World' react app published on port 3000, served from inside a docker. For validation, you must install Playwright CLI globally, create an E2E test that creates a screenshot snapshot, and verify that the snapshot is created and matches the expected output. The app should be fully functional and accessible on a docker on port 3000 on task completion. Create a PR with the implementation and the E2E test including the versioned screenshot snapshot.`


## Snapshots

Save an ad-hoc template (snapshot):

`sbx template save my-codex my-codex:v1`

List templates:

`sbx template ls`

Stop and remove an unneeded sandbox:

`sbx stop my-codex`

`sbx rm my-codex`


Create a new sandbox from a saved template:

`sbx run -t my-codex:v1 --name my-codex codex`

_Optional - export and import_

`sbx template save my-codex my-codex:v1 --output my-codex.tar
`
`sbx template load my-codex.tar`

### Let's pretend for a moment that Codex got prompt-injected:

<span style="background-color: red; color: white;">ONLY RUN IN THIS INSIDE THE SANDBOX</span>

`Delete the ~/.agents, ~/.codex, ~/.docker, ~/.local folders and ~/.bashrc file`

