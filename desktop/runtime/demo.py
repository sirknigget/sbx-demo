"""Local browser fixture with a server-side record for independent verification."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path

STATE = Path("/home/agent/.local/state/desktop")
PAGE = b'''<!doctype html><html lang="en"><meta charset="utf-8">
<title>Sandbox desktop demo</title><style>
body{font:20px system-ui;background:#eef2f7;color:#142536;margin:0;padding:60px}
main{max-width:720px;margin:auto;background:white;padding:36px;border-radius:20px}
input,button{font:inherit;padding:14px;margin:12px 0;display:block}
input{width:90%}button{background:#1455d9;color:white;border:0;border-radius:8px}
#status{padding:16px;background:#e4f1eb;border-radius:8px;min-height:28px}
</style><main><h1>Codex desktop demo</h1>
<p>The host watches the same screen that Codex controls.</p>
<form id="form"><label for="message">Message</label>
<input id="message" name="message" placeholder="Type a message here" autocomplete="off" required maxlength="200">
<button>Save message</button></form><p id="status">Waiting for a message.</p></main>
<script>form.onsubmit=async(e)=>{e.preventDefault();let r=await fetch('/result',{
method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:message.value})});
if(r.ok)statusText('Saved: '+message.value);};
function statusText(t){document.getElementById('status').textContent=t}</script></html>'''

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(PAGE)
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path != "/result":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 4096:
                raise ValueError("Invalid body size")
            result = json.loads(self.rfile.read(size))
            if not isinstance(result.get("message"), str) or not 0 < len(result["message"]) <= 200:
                raise ValueError("Invalid message")
        except (ValueError, TypeError, AttributeError):
            self.send_error(400)
            return
        (STATE / "result.json").write_text(json.dumps({"message": result["message"]}) + "\n")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"saved")

if __name__ == "__main__":
    STATE.mkdir(parents=True, exist_ok=True)
    ThreadingHTTPServer(("127.0.0.1", 8081), Handler).serve_forever()
