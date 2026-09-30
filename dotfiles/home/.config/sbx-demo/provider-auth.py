"""Merge sandbox provider placeholders without discarding migrated preferences."""
import base64
import json
import os
from pathlib import Path
import re

home = Path.home()
openai = os.environ.get("SBX_CRED_OPENAI_MODE", "none")
anthropic = os.environ.get("SBX_CRED_ANTHROPIC_MODE", "none")
os.umask(0o077)


def read_json(path):
    return json.loads(path.read_text()) if path.exists() else {}


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")
    path.chmod(0o600)


config = home / ".codex/config.toml"
config.parent.mkdir(parents=True, exist_ok=True)
if not config.exists():
    config.write_text('approval_policy = "never"\nsandbox_mode = "danger-full-access"\n')
if openai != "none":
    text = config.read_text()
    # Change only provider routing. Preserve models, project trust, and preferences.
    lines = []
    section = ""
    for line in text.splitlines():
        if line.lstrip().startswith("["):
            section = line.strip()
        if section == "[model_providers.sandboxd]" or section.startswith("[model_providers.sandboxd."):
            continue
        if not section and re.match(r"\s*(forced_login_method|model_provider)\s*=", line):
            continue
        lines.append(line)
    routing = 'forced_login_method = "api"\n'
    routing += 'model_provider = "sandboxd"\n' if openai == "oauth" else 'model_provider = "openai"\n'
    text = routing + "\n".join(lines) + "\n"
    if openai == "oauth":
        text += '''\n[model_providers.sandboxd]
name = "Sandbox Proxy"
base_url = "https://chatgpt.com/backend-api/codex"
experimental_bearer_token = "oai-oat01-proxy-managed"
requires_openai_auth = false
wire_api = "responses"
'''
    config.write_text(text)
    write_json(home / ".codex/auth.json", {"OPENAI_API_KEY": "proxy-managed"})
config.chmod(0o600)

if anthropic != "none":
    settings_path = home / ".claude/settings.json"
    settings = read_json(settings_path)
    if anthropic == "apikey":
        settings["apiKeyHelper"] = "printf proxy-managed"
    else:
        settings.pop("apiKeyHelper", None)
    # Imported environment overrides must not shadow Docker's credentials.
    for key in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_OAUTH_TOKEN", "ANTHROPIC_BASE_URL"):
        settings.get("env", {}).pop(key, None)
    write_json(settings_path, settings)
    credentials = home / ".claude/.credentials.json"
    if anthropic == "oauth":
        write_json(credentials, {"claudeAiOauth": {
            "accessToken": "sk-ant-oat01-proxy-managed",
            "refreshToken": "sk-ant-ort01-proxy-managed",
            "expiresAt": 4102444800000,
            "scopes": ["user:inference", "user:profile"],
        }})
    else:
        credentials.unlink(missing_ok=True)

# Pi's native ChatGPT provider accepts OAuth credentials, not --api-key.
# This unsigned JWT contains no secret; Docker injects the real host token.
if openai == "oauth":
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).decode().rstrip("=")

    token = encode({"alg": "none", "typ": "JWT"}) + "." + encode({
        "https://api.openai.com/auth": {"chatgpt_account_id": "proxy-managed"}
    }) + ".proxy-managed"
    auth_path = home / ".pi/agent/auth.json"
    auth = read_json(auth_path)
    auth["openai-codex"] = {"type": "oauth", "access": token,
                            "refresh": "oai-ort01-proxy-managed",
                            "expires": 4102444800000, "accountId": "proxy-managed"}
    write_json(auth_path, auth)
