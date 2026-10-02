"""Private sandbox state transfer. Never follows home or staging symlinks."""

import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

spec = importlib.util.spec_from_file_location("omp_db_copy", Path(__file__).with_name("omp-db-copy.py"))
db = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db)
ROOTS = (".omp/agent/agent.db", ".omp/.env", ".codex", ".claude", ".claude.json", ".pi/agent")
# Installed binaries, caches, and temporary files can be recreated.
SKIP = {"node_modules", "cache", "caches", "tmp", "bin"}


def files(root):
    if root.is_symlink():
        return
    if root.is_file():
        yield root
    elif root.is_dir():
        for child in sorted(root.iterdir()):
            if child.name not in SKIP and not child.name.endswith(("-wal", "-shm", "-journal", ".lock")):
                yield from files(child)


def sqlite(path):
    with path.open("rb") as stream:
        return stream.read(16) == b"SQLite format 3\0"


def check_path(path, base):
    for part in (path, *path.parents):
        if part.is_symlink():
            raise RuntimeError(f"Refusing to write through a symlink: {part}")
        if part == base:
            break


def copy(source, target, mode):
    target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if sqlite(source):
        if mode == "export":
            db.export_database(source, target)
        else:
            db.import_database(source, target)
    else:
        shutil.copyfile(source, target)
        target.chmod(0o600 | (source.stat().st_mode & 0o100))


def transfer(mode, home, staging):
    os.umask(0o077)
    check_path(staging, staging.parent.parent)
    if mode == "export":
        staging.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        staging.parent.chmod(0o700)
        temporary = Path(tempfile.mkdtemp(prefix="state-", dir=staging.parent))
        try:
            for relative in ROOTS:
                root = home / relative
                if any(part.is_symlink() for part in (root, *root.parents) if part != home and home in part.parents):
                    continue
                for source in files(root):
                    copy(source, temporary / source.relative_to(home), mode)
            if staging.exists():
                shutil.rmtree(staging)
            temporary.rename(staging)
        finally:
            if temporary.exists():
                shutil.rmtree(temporary)
    else:
        for relative in ROOTS:
            check_path(staging / relative, staging)
        entries = [(source, home / source.relative_to(staging))
                   for relative in ROOTS for source in files(staging / relative)]
        # Validate every destination and database before importing anything.
        for source, target in entries:
            check_path(target, home)
            if sqlite(source):
                db.verify_database(source)
        if entries:
            if not shutil.which("lsof"):
                raise RuntimeError("lsof is required before importing agent state")
            for relative in ROOTS:
                target = home / relative
                if not target.exists():
                    continue
                args = ["lsof", "-t"]
                args += ["+D", str(target)] if target.is_dir() else [str(target), str(target) + "-wal", str(target) + "-shm"]
                result = subprocess.run(args, capture_output=True, text=True)
                if result.stdout.strip():
                    raise RuntimeError("Stop OMP, Codex, Claude Code, and Pi before importing state")
        for source, target in entries:
            copy(source, target, mode)
    print(f"{'Exported' if mode == 'export' else 'Imported'} available OMP, Codex, Claude Code, and Pi state.")


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("export", "import"):
        raise SystemExit("Usage: agent-state-copy.py export|import HOME STAGING")
    try:
        transfer(sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3]))
    except (OSError, RuntimeError) as error:
        raise SystemExit(f"Error: {error}")
