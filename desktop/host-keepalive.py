"""Hold one detached sbx exec session per desktop; flock prevents duplicates."""
import fcntl
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

action, name = sys.argv[1:]
state = Path(__file__).resolve().parent / ".results"
state.mkdir(exist_ok=True)
lock_path = state / f"{name}.keepalive.lock"

if action == "start":
    with (state / f"{name}.keepalive.log").open("a") as log:
        subprocess.Popen([sys.executable, __file__, "hold", name],
                         stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                         start_new_session=True)
    # Hold takes the lock before opening the long-lived sbx session.
    for _ in range(50):
        with lock_path.open("a+") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                break
        time.sleep(0.1)
    else:
        raise SystemExit("Keepalive failed to start; inspect its .results log")
elif action == "stop":
    with lock_path.open("a+") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            lock.seek(0)
            os.kill(int(lock.read()), signal.SIGTERM)
elif action == "hold":
    with lock_path.open("a+") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SystemExit(0)
        lock.seek(0)
        lock.truncate()
        lock.write(str(os.getpid()))
        lock.flush()
        child = subprocess.Popen(["sbx", "exec", name, "sleep", "infinity"])
        signal.signal(signal.SIGTERM, lambda *_: child.terminate())
        signal.signal(signal.SIGINT, lambda *_: child.terminate())
        child.wait()
else:
    raise SystemExit("Use start, hold, or stop")
