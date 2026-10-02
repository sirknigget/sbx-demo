"""Check the installed Pi CLI against a local proxy; uses no real provider."""

import http.server, json, os, pathlib, re, shutil, subprocess, tempfile, threading

root = pathlib.Path(__file__).resolve().parents[1]
cli = os.environ.get("PI_TEST_CLI") or shutil.which("pi")
if not cli:
    raise SystemExit("Set PI_TEST_CLI to an installed Pi executable.")
with tempfile.TemporaryDirectory(prefix="sbx-pi-") as temp:
    home = pathlib.Path(temp) / "home"
    shutil.copytree(root / "home", home)
    env = {
        **os.environ,
        "HOME": str(home),
        "SBX_CRED_OPENAI_MODE": "oauth",
        "SBX_CRED_ANTHROPIC_MODE": "none",
    }
    subprocess.run(
        ["bash", str(root / "home/.local/bin/configure-provider-auth")],
        env=env,
        check=True,
    )
    requests = []
    token = json.loads((home / ".pi/agent/auth.json").read_text())["openai-codex"][
        "access"
    ]

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_POST(self):
            raw = self.rfile.read(int(self.headers["Content-Length"]))
            if self.headers.get("Content-Encoding") == "zstd":
                raw = subprocess.run(
                    [
                        "node",
                        "-e",
                        "const fs=require('fs'),z=require('zlib');process.stdout.write(z.zstdDecompressSync(fs.readFileSync(0)))",
                    ],
                    input=raw,
                    capture_output=True,
                    check=True,
                ).stdout
            body = json.loads(raw)
            requests.append((self.path, body, dict(self.headers)))
            message = {
                "type": "message",
                "id": "m1",
                "role": "assistant",
                "status": "completed",
                "content": [
                    {"type": "output_text", "text": "SBX_PI_OK", "annotations": []}
                ],
            }
            response = {
                "id": "r1",
                "object": "response",
                "status": "completed",
                "output": [message],
                "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2},
            }
            events = [
                {
                    "type": "response.created",
                    "response": {**response, "status": "in_progress", "output": []},
                },
                {
                    "type": "response.output_item.added",
                    "output_index": 0,
                    "item": {**message, "content": []},
                },
                {
                    "type": "response.content_part.added",
                    "output_index": 0,
                    "content_index": 0,
                    "part": {"type": "output_text", "text": "", "annotations": []},
                },
                {
                    "type": "response.output_text.delta",
                    "output_index": 0,
                    "content_index": 0,
                    "delta": "SBX_PI_OK",
                },
                {
                    "type": "response.output_item.done",
                    "output_index": 0,
                    "item": message,
                },
                {"type": "response.completed", "response": response},
            ]
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            for event in events:
                self.wfile.write(
                    (
                        "event: "
                        + event["type"]
                        + "\ndata: "
                        + json.dumps(event)
                        + "\n\n"
                    ).encode()
                )

    server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    models_path = home / ".pi/agent/models.json"
    models_path.parent.mkdir(parents=True, exist_ok=True)
    models = {
        "providers": {
            "openai-codex": {
                "baseUrl": f"http://127.0.0.1:{server.server_port}/codex",
                "models": [
                    {
                        "id": "gpt-6-sol",
                        "name": "Test model",
                        "api": "openai-codex-responses",
                        "reasoning": True,
                        "input": ["text"],
                        "contextWindow": 200000,
                        "maxTokens": 32000,
                        "cost": {
                            "input": 0,
                            "output": 0,
                            "cacheRead": 0,
                            "cacheWrite": 0,
                        },
                    }
                ],
            }
        }
    }
    models_path.write_text(json.dumps(models))
    result = subprocess.run(
        [
            cli,
            "--provider",
            "openai-codex",
            "--model",
            "gpt-6-sol",
            "--no-session",
            "--no-skills",
            "--no-tools",
            "--no-extensions",
            "--thinking",
            "low",
            "-p",
            "Reply OK",
        ],
        env=env,
        cwd=temp,
        capture_output=True,
        text=True,
        timeout=45,
    )
    server.shutdown()
    print(
        "CLI status:",
        result.returncode,
        "stdout:",
        result.stdout.strip(),
        "stderr:",
        result.stderr[-1500:],
    )
    assert result.returncode == 0 and "SBX_PI_OK" in result.stdout
    assert len(requests) == 1
    path, body, headers = requests[0]
    assert path == "/codex/responses", path
    assert body["instructions"] and body["store"] is False and body["stream"] is True, (
        body
    )
    assert (
        not {
            "max_output_tokens",
            "temperature",
            "prompt_cache_retention",
            "prompt_cache_options",
        }
        & body.keys()
    )
    headers = {key.lower(): value for key, value in headers.items()}
    assert headers["authorization"] == "Bearer " + token
    assert headers["chatgpt-account-id"] == "proxy-managed"
    print(
        "Real Pi package accepted the JWT-shaped placeholder with its native ChatGPT provider and read a local SSE response."
    )
