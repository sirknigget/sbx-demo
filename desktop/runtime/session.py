"""Supervise the desktop as the non-root agent; one session per sandbox."""
import fcntl
import os
from pathlib import Path
import signal
import socket
import subprocess
import time

STATE = Path("/home/agent/.local/state/desktop")
STATE.mkdir(parents=True, exist_ok=True)
os.environ["DISPLAY"] = ":1"
os.environ.pop("WAYLAND_DISPLAY", None)
os.environ["XDG_SESSION_TYPE"] = "x11"
os.environ["XDG_CURRENT_DESKTOP"] = "XFCE"
os.environ["DESKTOP_SESSION"] = "xfce"
os.environ["XDG_RUNTIME_DIR"] = str(STATE / "run")
Path(os.environ["XDG_RUNTIME_DIR"]).mkdir(mode=0o700, exist_ok=True)
lock = (STATE / "session.lock").open("w")
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    raise SystemExit(0)
(STATE / "browser.ready").unlink(missing_ok=True)

children = []
logs = []

def launch(name, argv):
    log = (STATE / f"{name}.log").open("a")
    logs.append(log)
    child = subprocess.Popen(argv, stdout=log, stderr=log, start_new_session=True)
    children.append(child)
    return child

def wait_for(check, label):
    for _ in range(120):
        if any(child.poll() is not None for child in children):
            raise RuntimeError(f"A desktop service exited while waiting for {label}; see {STATE}")
        if check():
            return
        time.sleep(0.25)
    raise RuntimeError(f"Timed out waiting for {label}")

def port_ready(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.2):
            return True
    except OSError:
        return False

def stop(*_):
    raise SystemExit(0)

signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    launch("display", ["Xvfb", ":1", "-screen", "0", "1280x800x24", "-nolisten", "tcp", "-ac"])
    wait_for(lambda: subprocess.run(["xdpyinfo"], stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL).returncode == 0, "display")
    launch("desktop", ["dbus-run-session", "--", "startxfce4"])
    launch("vnc", ["x11vnc", "-display", ":1", "-forever", "-shared", "-nopw",
                   "-localhost", "-rfbport", "5900", "-xkb"])
    wait_for(lambda: port_ready(5900), "VNC")
    launch("cua", ["/opt/cua/venv/bin/python", "-m", "computer_server",
                   "--backend", "vnc", "--vnc-host", "127.0.0.1", "--vnc-port", "5900",
                   "--host", "127.0.0.1", "--port", "8000"])
    wait_for(lambda: port_ready(8000), "Cua MCP server")
    launch("viewer", ["/usr/bin/python3", "/opt/desktop/viewer.py"])
    launch("demo", ["/opt/desktop/venv/bin/python", "/opt/desktop/demo.py"])
    wait_for(lambda: port_ready(8081), "demo app")
    launch("browser", ["/opt/desktop/venv/bin/python", "/opt/desktop/browser.py"])
    while True:
        if any(child.poll() is not None for child in children):
            raise RuntimeError(f"A desktop service exited; see logs in {STATE}")
        time.sleep(1)
finally:
    (STATE / "browser.ready").unlink(missing_ok=True)
    for child in reversed(children):
        if child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
    for child in children:
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL)
    for log in logs:
        log.close()
