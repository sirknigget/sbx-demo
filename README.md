
# Docker Sandbox demo

## Slides - background context, rationale, features
[Slides](presentation/SBX-demo.pptx)

## Setup

https://docs.docker.com/ai/sandboxes/get-started/

![sbx setup](assets/sbx-setup.png)

_Optional - Storing Github access token in credential manager (replace with your token env variable):_

`sbx secret set -g github -t "$GITHUB_AGENT_SANDBOX_TOKEN"`


Optional - Store Jev API key in credential manager (replace with your token env variable):

```
sbx secret set-custom \
--host api.typesafe.ai \
--env TYPESAFE_API_KEY \
--value <secret>
```


## Basic commands



Spawn a new Codex sandbox from a template, mounted in this workspace: _(You can replace with 'claude' or others)_

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

### Example fully autonomous tasks to try (will touch system files, install tools and run Docker with no restrictions):

```
Create a process environment secret checker that runs and prints output whenever any user
starts a new interactive bash shell on the machine, including login shells and nested bash sessions.

The secret checking must use TypeSafe's API on each environment variable separately (key + value),
and classify each as real_secret, dummy_test, or not_secret. Run the classification in parallel for all environment variables, with unlimited concurrency.
Always show a table with the environment variable name, truncated value, classification, and confidence result.
Include all real_secret and dummy_test classifications, and include not_secret only when its confidence score is below 50%.
Ensure it does not run for noninteractive scripts and does not print twice for a single shell startup.

TypeSafe API key is available as TYPESAFE_API_KEY on this machine.
The documentation for TypeSafe API is available at https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md.
```

--------

```
Create a colorful 'Hello World' react app published on port 3000, served from inside a docker. 
For validation, you must install Playwright CLI globally, create an E2E test that creates a screenshot snapshot, 
and verify that the snapshot is created and matches the expected output. 
The app should be fully functional and accessible on a docker on port 3000 on task completion. 
Create a PR with the implementation and the E2E test including the versioned screenshot snapshot.
```









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

### Let's pretend for a moment that Codex got prompt-injected, or in a revengeful mood:

<span style="background-color: red; color: white;">🚨🚨🚨  ONLY RUN THIS INSIDE THE SANDBOX  🚨🚨🚨</span>

`! sudo rm -rf --no-preserve-root /`

<span style="background-color: red; color: white;">🚨🚨🚨  ONLY RUN THIS INSIDE THE SANDBOX  🚨🚨🚨</span>

After your sandbox got obliterated, please load the latest snapshot and move on with your day like nothing happened.




### Read about all the available features at https://docs.docker.com/ai/sandboxes/

- Dockerfile templates
- Multiple workspaces
- Network policies
- Kits
- Git isolation modes
- Exposing ports and services
- SSH access for desktop apps
- Credential injection
