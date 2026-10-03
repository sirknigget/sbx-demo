"""Verify that the completed sample task used only the desktop MCP tools."""
import json
from pathlib import Path
import sys

events = []
for line in Path(sys.argv[1]).read_text().splitlines():
    try:
        events.append(json.loads(line))
    except json.JSONDecodeError:
        # sbx may emit terminal title escape sequences before JSONL events.
        if line.strip() and not line.startswith("\x1b"):
            raise SystemExit(f"Unexpected non-JSON event: {line[:120]!r}")

items = [event["item"] for event in events if event.get("type") == "item.completed"]
allowed = {
    "computer_screenshot", "computer_get_screen_size", "computer_get_cursor_position",
    "computer_click", "computer_double_click", "computer_move", "computer_drag",
    "computer_scroll", "computer_mouse_down", "computer_mouse_up", "computer_type",
    "computer_press_key", "computer_hotkey", "computer_key_down", "computer_key_up",
}
calls = []
for item in items:
    kind = item.get("type")
    if kind in ("agent_message", "reasoning"):
        continue
    if kind != "mcp_tool_call" or item.get("server") != "desktop" or item.get("tool") not in allowed:
        raise SystemExit(f"Task used a non-desktop tool: {kind}, {item.get('tool')}")
    if item.get("error"):
        raise SystemExit(f"Desktop tool failed: {item['error']}")
    calls.append(item)

names = [call["tool"] for call in calls]
if not calls or names[0] != "computer_screenshot" or names[-1] != "computer_screenshot" or names.count("computer_screenshot") < 2:
    raise SystemExit("Expected screenshots before and after the browser task")
if not any(call["tool"] == "computer_type" and call["arguments"].get("text") == "Hello from Codex" for call in calls):
    raise SystemExit("Expected the message to be typed through the desktop tool")
if "computer_click" not in names or not any(event.get("type") == "turn.completed" for event in events):
    raise SystemExit("Expected clicks and a completed Codex turn")
print(f"PASS: {len(calls)} Cua desktop-only calls, including {names.count('computer_screenshot')} screenshots")
