"""Wait for both the display and viewer before starting Codex."""
import socket
from pathlib import Path
import subprocess
import time

deadline = time.monotonic() + 60
while time.monotonic() < deadline:
    try:
        with socket.create_connection(("127.0.0.1", 6080), timeout=1):
            pass
        with socket.create_connection(("127.0.0.1", 8000), timeout=1):
            pass
        display = subprocess.run(["xdpyinfo", "-display", ":1"], capture_output=True)
        if display.returncode == 0 and Path("/home/agent/.local/state/desktop/browser.ready").exists():
            break
    except OSError:
        pass
    time.sleep(0.25)
else:
    raise SystemExit("Desktop failed to start; inspect ~/.local/state/desktop/*.log")
