"""Independent smoke-test assertion, executed by the host after the agent exits."""
import json
from pathlib import Path
import subprocess

state = Path("/home/agent/.local/state/desktop")
result = json.loads((state / "result.json").read_text())
if result != {"message": "Hello from Codex"}:
    raise SystemExit(f"Unexpected browser task result: {result!r}")
subprocess.run(["scrot", str(state / "verified.png")], check=True)
print("PASS: the browser submitted Hello from Codex; saved verified.png")
