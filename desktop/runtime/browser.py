"""Keep a headed Chromium browser on the display Codex and noVNC share."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

state = Path("/home/agent/.local/state/desktop")
os.environ["PLAYWRIGHT_HOST_PLATFORM_OVERRIDE"] = Path("/opt/desktop/playwright-platform").read_text().strip()
with sync_playwright() as p:
    options = dict(
        headless=False,
        viewport=None,
        args=["--start-maximized", "--disable-dev-shm-usage"],
        # Chromium's nested user-namespace sandbox is not reliably available
        # in containers. The outer sbx microVM provides the isolation boundary.
        chromium_sandbox=False,
    )
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    if proxy:
        # Playwright's proxy option appends <-loopback>, which forces local
        # traffic through sbx's host proxy. Native Chromium flags preserve
        # local app access while external websites still use the proxy.
        options["args"] += [f"--proxy-server={proxy}",
                            "--proxy-bypass-list=localhost;127.0.0.1;[::1]"]
    context = p.chromium.launch_persistent_context(str(state / "browser"), **options)
    page = context.pages[0] if context.pages else context.new_page()
    page.goto("http://127.0.0.1:8081")
    (state / "browser.ready").write_text(str(os.getpid()))
    while context.pages:
        context.pages[0].wait_for_timeout(1000)
