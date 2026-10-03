"""websockify 0.13 needs fork, rather than Python 3.14's forkserver default."""
import multiprocessing
import sys
from websockify.websocketproxy import websockify_init

if __name__ == "__main__":
    multiprocessing.set_start_method("fork")
    sys.argv = ["websockify", "--web=/usr/share/novnc/", "0.0.0.0:6080", "127.0.0.1:5900"]
    websockify_init()
