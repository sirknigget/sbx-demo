"""Isolated checks; never invokes a host sandbox or real provider."""

import importlib.util
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / "home/.local/bin"


class DotfilesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="dotfiles-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.home = self.root / "home"
        shutil.copytree(ROOT / "home", self.home)
        self.mock = self.root / "bin"
        self.mock.mkdir()
        self.env = {
            **os.environ,
            "HOME": str(self.home),
            "BASH_ENV": "",
            "PATH": f"{self.mock}:{os.environ['PATH']}",
            "NPM_CONFIG_PREFIX": str(self.root),
            "SBX_CRED_OPENAI_MODE": "none",
            "SBX_CRED_ANTHROPIC_MODE": "none",
        }
        self.stub("lsof", "exit 1")
        self.stub("sbx", "printf '%s\\n' \"$@\"")
        self.stub("pi", "printf '%s\\n' \"$@\"")
        self.stub("omp", "printf '%s\\n' \"$@\"")
        self.stub("codex", "printf '%s\\n' \"$@\"")
        self.stub("claude", "printf '%s\\n' \"$@\"")
        self.stub("numfmt", "printf '0B\\n'")
        self.stub(
            "docker",
            """case "$*" in
          info) exit 0 ;;
          'ps -aq'|'ps -q') printf 'container-a\\ncontainer-b\\n' ;;
          'image ls -aq --no-trunc') printf 'image-a\\nimage-b\\n' ;;
          'system df') printf 'Images 2 2 0B 0B\\nContainers 2 2 0B 0B\\n' ;;
          *) printf '%s\\n' "$*" >> "$HOME/docker-calls" ;;
        esac""",
        )

    def stub(self, name, body):
        path = self.mock / name
        path.write_text("#!/bin/sh\n" + body + "\n")
        path.chmod(0o755)

    def run_script(self, shell, script, *args, env=None, input=None):
        result = subprocess.run(
            [shell, str(script), *args],
            env=env or self.env,
            cwd=self.root,
            input=input,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout

    def test_host_shells(self):
        scripts = [ROOT / "dev-demo", ROOT / "regenerate_sandbox"]
        for shell in (shell for shell in ("bash", "zsh") if shutil.which(shell)):
            for script in scripts:
                subprocess.run([shell, "-n", str(script)], check=True)
            for command in ("omp", "pi", "codex", "claude", "bash"):
                output = self.run_script(
                    shell,
                    ROOT / "dev-demo",
                    command,
                    env={**self.env, "SBX_DEMO_WORKSPACE": str(self.root)},
                )
                self.assertIn("sbx-demo", output)
                self.assertIn(
                    "pi-managed"
                    if command == "pi"
                    else command + "\n"
                    if command != "omp"
                    else "omp-managed",
                    output,
                )
            self.run_script(shell, ROOT / "regenerate_sandbox", "--help")

    def test_sandbox_commands(self):
        for script in [ROOT / "copy-state.sh", *BIN.iterdir()]:
            subprocess.run(["bash", "-n", str(script)], check=True)
        self.run_script("bash", BIN / "link-tracked-home", str(ROOT / "home"))
        self.run_script("bash", BIN / "link-tracked-home", str(ROOT / "home"))
        self.run_script("bash", BIN / "configure-provider-auth")
        for mode in ("none", "oauth", "apikey"):
            output = self.run_script(
                "bash",
                BIN / "pi-managed",
                "--version",
                env={**self.env, "SBX_CRED_OPENAI_MODE": mode},
            )
            self.assertIn("--version", output)
            if mode == "oauth":
                self.assertIn("openai-codex", output)

    def test_full_permission_launchers(self):
        for mode in ("none", "oauth", "apikey"):
            env = {
                **self.env,
                "SBX_CRED_OPENAI_MODE": mode,
                "SBX_CRED_ANTHROPIC_MODE": mode,
            }
            codex = self.run_script("bash", BIN / "codex", "exec", "prompt", env=env)
            self.assertIn("--dangerously-bypass-approvals-and-sandbox", codex)
            if mode == "oauth":
                self.assertIn("--profile\nsandboxd", codex)
            claude = self.run_script("bash", BIN / "claude", "--help", env=env)
            self.assertIn("--dangerously-skip-permissions", claude)
            if mode != "none":
                self.assertIn("claude-provider.json", claude)
            pi = self.run_script("bash", BIN / "pi-managed", "--version", env=env)
            self.assertIn("--approve", pi)
            omp = self.run_script("bash", BIN / "omp-managed", "--version", env=env)
            self.assertIn("--approval-mode\nyolo", omp)

    def test_linked_preferences_are_not_rewritten_by_auth(self):
        source = self.root / "tracked-home"
        shutil.copytree(ROOT / "home", source)
        settings = [
            ".codex/config.toml",
            ".codex/sandboxd.config.toml",
            ".codex/hooks.json",
            ".codex/agents/demo-reader.toml",
            ".codex/agents/env-setup.toml",
            ".claude/settings.json",
            ".claude/agents/demo-reader.md",
            ".claude/agents/env-setup.md",
            ".config/sbx-demo/session-start.sh",
            ".pi/agent/settings.json",
        ]
        # All three agents start without user settings: linking bootstraps them.
        for relative in settings:
            (self.home / relative).unlink()
        self.run_script("bash", BIN / "link-tracked-home", str(source))
        before = {relative: (source / relative).read_bytes() for relative in settings}
        for mode in ("none", "oauth", "apikey"):
            self.run_script(
                "bash",
                BIN / "configure-provider-auth",
                env={
                    **self.env,
                    "SBX_CRED_OPENAI_MODE": mode,
                    "SBX_CRED_ANTHROPIC_MODE": mode,
                },
            )
            for relative in settings:
                self.assertEqual(
                    (self.home / relative).resolve(), (source / relative).resolve()
                )
                self.assertEqual((source / relative).read_bytes(), before[relative])
        for relative in (".codex/auth.json", ".pi/agent/auth.json"):
            self.assertFalse((source / relative).exists())
        pi_path = self.home / ".pi/agent/settings.json"
        preferences = json.loads(pi_path.read_text())
        preferences["theme"] = "light"
        pi_path.write_text(json.dumps(preferences))
        self.assertEqual(
            json.loads((source / ".pi/agent/settings.json").read_text())["theme"],
            "light",
        )

    # Creates a sandbox with a mock host and checks that later shells read its mount.
    # Requires the mount to be saved before the template backup.
    def test_creation_order_with_migration(self):
        for shell in (shell for shell in ("bash", "zsh") if shutil.which(shell)):
            log = self.home / "sbx-calls"
            log.unlink(missing_ok=True)
            self.stub(
                "sbx",
                """if [ "$1" = ls ]; then
                  printf 'old\\n'
                elif [ "$1" = exec ] && [ "$4" = -c ]; then
                  shift 2
                  "$@"
                else
                  if [ "$1" = template ] && [ "$2" = save ]; then
                    test -f "$HOME/.config/sbx-demo/persistent-env.sh" || exit 1
                  fi
                  printf '%s\\n' "$*" >> "$HOME/sbx-calls"
                fi""",
            )
            self.run_script(
                shell,
                ROOT / "regenerate_sandbox",
                "--workspace-mount",
                str(ROOT.parent),
                "--old-name",
                "old",
            )
            calls = log.read_text().splitlines()
            export = next(
                i for i, line in enumerate(calls) if "copy-state.sh export" in line
            )
            create = next(
                i for i, line in enumerate(calls) if line.startswith("create ")
            )
            backup = next(
                i for i, line in enumerate(calls) if line.startswith("template save ")
            )
            restore = next(
                i for i, line in enumerate(calls) if "copy-state.sh import" in line
            )
            self.assertLess(export, create)
            self.assertLess(create, backup)
            self.assertLess(backup, restore)
            # The same file can hold more than the mount path.
            env_path = self.home / ".config/sbx-demo/persistent-env.sh"
            with env_path.open("a") as env_file:
                env_file.write("export DEMO_EXTRA=available\n")
            # A new Bash process receives the mount through the tracked shell loader.
            result = subprocess.run(
                ["bash", "-c", 'printf "%s:%s" "$MOUNTED_WORKSPACE" "$DEMO_EXTRA"'],
                env={
                    **self.env,
                    "BASH_ENV": str(self.home / ".config/sbx-demo/shell-env.sh"),
                },
                text=True,
                capture_output=True,
                check=True,
            )
            self.assertEqual(result.stdout, f"{ROOT.parent}:available")

    def test_provider_preferences(self):
        codex = self.home / ".codex"
        codex.mkdir(exist_ok=True)
        config = codex / "config.toml"
        config.write_text(
            'model = "custom-model"\n[projects."/workspace"]\ntrust_level = "trusted"\n'
        )
        claude = self.home / ".claude"
        claude.mkdir(exist_ok=True)
        settings = claude / "settings.json"
        settings.write_text(
            json.dumps(
                {"theme": "dark", "apiKeyHelper": "old-key", "env": {"CUSTOM": "keep"}}
            )
        )
        for mode in ("none", "oauth", "apikey", "oauth"):
            self.run_script(
                "bash",
                BIN / "configure-provider-auth",
                env={
                    **self.env,
                    "SBX_CRED_OPENAI_MODE": mode,
                    "SBX_CRED_ANTHROPIC_MODE": mode,
                },
            )
            self.assertIn('model = "custom-model"', config.read_text())
            self.assertIn('trust_level = "trusted"', config.read_text())
            self.assertEqual(json.loads(settings.read_text())["theme"], "dark")
        import base64

        auth = json.loads((self.home / ".pi/agent/auth.json").read_text())[
            "openai-codex"
        ]
        self.assertEqual(auth["type"], "oauth")
        payload = json.loads(
            base64.urlsafe_b64decode(auth["access"].split(".")[1] + "==")
        )
        self.assertEqual(
            payload["https://api.openai.com/auth"]["chatgpt_account_id"],
            "proxy-managed",
        )
        self.assertEqual(config.read_text().count("[model_providers.sandboxd]"), 0)
        self.assertEqual(json.loads(settings.read_text())["apiKeyHelper"], "old-key")
        self.assertEqual(
            json.loads(
                (self.home / ".config/sbx-demo/claude-provider.json").read_text()
            )["apiKeyHelper"],
            "",
        )
        self.assertEqual(
            json.loads((claude / ".credentials.json").read_text())["claudeAiOauth"][
                "accessToken"
            ],
            "sk-ant-oat01-proxy-managed",
        )

    def test_state_roundtrip_and_guards(self):
        spec = importlib.util.spec_from_file_location(
            "state", ROOT / "agent-state-copy.py"
        )
        assert spec is not None and spec.loader is not None
        state = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(state)
        source = self.root / "source"
        destination = self.root / "destination"
        staging = self.root / "staging/files"
        for relative in (".omp/agent/agent.db", ".codex/state_5.sqlite"):
            path = source / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            connection = sqlite3.connect(path)
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute("CREATE TABLE sample (value TEXT)")
            connection.execute("INSERT INTO sample VALUES ('from WAL')")
            connection.commit()
            self.addCleanup(connection.close)
        for relative in (
            ".omp/.env",
            ".codex/sessions/session.jsonl",
            ".claude/projects/session.jsonl",
            ".claude.json",
            ".pi/agent/auth.json",
            ".pi/agent/sessions/session.jsonl",
        ):
            path = source / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("fixture")
        (source / ".codex/linked-secret").symlink_to(source / ".omp/.env")
        state.transfer("export", source, staging)
        self.assertFalse((staging / ".codex/linked-secret").exists())
        stale = staging / ".pi/agent/stale"
        stale.write_text("old")
        state.transfer("export", source, staging)
        self.assertFalse(stale.exists())
        destination.mkdir()
        previous_path = os.environ["PATH"]
        os.environ["PATH"] = self.env["PATH"]
        try:
            state.transfer("import", destination, staging)
            for relative in (".omp/agent/agent.db", ".codex/state_5.sqlite"):
                with sqlite3.connect(destination / relative) as connection:
                    self.assertEqual(
                        connection.execute("SELECT value FROM sample").fetchone(),
                        ("from WAL",),
                    )
            self.assertEqual(
                (destination / ".pi/agent/auth.json").stat().st_mode & 0o777, 0o600
            )
            self.stub("lsof", "printf '123\\n'")
            with self.assertRaisesRegex(RuntimeError, "Stop OMP"):
                state.transfer("import", destination, staging)
            self.stub("lsof", "exit 1")
            (destination / ".claude.json").unlink()
            (destination / ".claude.json").symlink_to(self.home / ".gitconfig")
            with self.assertRaisesRegex(RuntimeError, "symlink"):
                state.transfer("import", destination, staging)
        finally:
            os.environ["PATH"] = previous_path

    @unittest.skipUnless(
        os.environ.get("PI_TEST_CLI"),
        "Set PI_TEST_CLI to check an installed Pi package",
    )
    def test_real_pi_proxy(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "tests/pi_proxy_smoke.py")],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_sandbox_bash_path(self):
        for shell in ("bash",):
            for flags in ("-c", "-lc", "-ic"):
                result = subprocess.run(
                    [
                        shell,
                        flags,
                        'command -v clear_caches; . "$HOME/.config/sbx-demo/shell-env.sh"; printf "%s" "$PATH"',
                    ],
                    env={
                        **self.env,
                        "BASH_ENV": str(self.home / ".config/sbx-demo/shell-env.sh"),
                    },
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn(str(self.home / ".local/bin/clear_caches"), result.stdout)
                self.assertEqual(
                    result.stdout.splitlines()[-1]
                    .split(":")
                    .count(str(self.home / ".local/bin")),
                    1,
                )


if __name__ == "__main__":
    unittest.main()
