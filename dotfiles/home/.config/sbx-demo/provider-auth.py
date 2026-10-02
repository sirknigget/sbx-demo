"""Merge sandbox provider placeholders without discarding migrated preferences."""

import base64
import json
import os
from pathlib import Path

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


# User settings are repo-linked. Only credentials and runtime overlays are written.
if openai != "none":
    write_json(home / ".codex/auth.json", {"OPENAI_API_KEY": "proxy-managed"})

provider_settings = {}
if anthropic == "apikey":
    provider_settings["apiKeyHelper"] = "printf proxy-managed"
elif anthropic == "oauth":
    provider_settings["apiKeyHelper"] = ""
write_json(home / ".config/sbx-demo/claude-provider.json", provider_settings)

if anthropic != "none":
    credentials = home / ".claude/.credentials.json"
    if anthropic == "oauth":
        write_json(
            credentials,
            {
                "claudeAiOauth": {
                    "accessToken": "sk-ant-oat01-proxy-managed",
                    "refreshToken": "sk-ant-ort01-proxy-managed",
                    "expiresAt": 4102444800000,
                    "scopes": ["user:inference", "user:profile"],
                }
            },
        )
    else:
        credentials.unlink(missing_ok=True)

# Pi's native ChatGPT provider accepts OAuth credentials, not --api-key.
# This unsigned JWT contains no secret; Docker injects the real host token.
if openai == "oauth":

    def encode(value):
        return (
            base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode())
            .decode()
            .rstrip("=")
        )

    token = (
        encode({"alg": "none", "typ": "JWT"})
        + "."
        + encode(
            {"https://api.openai.com/auth": {"chatgpt_account_id": "proxy-managed"}}
        )
        + ".proxy-managed"
    )
    auth_path = home / ".pi/agent/auth.json"
    auth = read_json(auth_path)
    auth["openai-codex"] = {
        "type": "oauth",
        "access": token,
        "refresh": "oai-ort01-proxy-managed",
        "expires": 4102444800000,
        "accountId": "proxy-managed",
    }
    write_json(auth_path, auth)
