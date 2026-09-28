# Copies only OMP's database through the shared staging directory.
# Uses a SQLite backup for export and a validated file copy for import.
# Normalizes the staged database so its WAL files are not needed on import.

from contextlib import closing
import os
import shutil
import sqlite3
import sys
from pathlib import Path


# Checks the complete snapshot before it replaces any destination database.
def verify_database(path: Path) -> None:
    with closing(sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro", uri=True)) as database:
        if database.execute("PRAGMA quick_check").fetchone() != ("ok",):
            raise RuntimeError(f"SQLite quick_check failed for {path}")


# Removes temporary journal files after closing all connections.
def remove_temporary(path: Path) -> None:
    for item in (path, Path(f"{path}-wal"), Path(f"{path}-shm")):
        item.unlink(missing_ok=True)


# Creates a valid standalone snapshot, even when OMP uses a WAL journal.
def export_database(source: Path, destination: Path) -> None:
    destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temporary = Path(f"{destination}.tmp.{os.getpid()}")
    try:
        with closing(sqlite3.connect(f"{source.resolve().as_uri()}?mode=ro", uri=True)) as src:
            with closing(sqlite3.connect(temporary)) as dst:
                src.backup(dst)
                dst.execute("PRAGMA wal_checkpoint(TRUNCATE)")
                mode = dst.execute("PRAGMA journal_mode=DELETE").fetchone()[0]
                if mode.lower() != "delete":
                    raise RuntimeError(f"Cannot normalize SQLite journal mode: {mode}")
        verify_database(temporary)
        temporary.chmod(0o600)
        temporary.replace(destination)
    finally:
        remove_temporary(temporary)


# Validates the staged copy before replacing a stopped OMP database.
def import_database(source: Path, destination: Path) -> None:
    verify_database(source)
    destination.parent.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    destination.parent.parent.chmod(0o700)
    destination.parent.mkdir(mode=0o700, exist_ok=True)
    destination.parent.chmod(0o700)
    temporary = Path(f"{destination}.import.{os.getpid()}")
    try:
        shutil.copy2(source, temporary)
        temporary.chmod(0o600)
        verify_database(temporary)
        for suffix in ("-wal", "-shm"):
            Path(f"{destination}{suffix}").unlink(missing_ok=True)
        temporary.replace(destination)
        for suffix in ("-wal", "-shm"):
            Path(f"{destination}{suffix}").unlink(missing_ok=True)
    finally:
        remove_temporary(temporary)


# Accepts absolute database paths supplied by copy-state.sh.
if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("export", "import"):
        raise SystemExit("Usage: omp-db-copy.py export|import SOURCE DESTINATION")
    action, source_path, destination_path = sys.argv[1:]
    if action == "export":
        export_database(Path(source_path), Path(destination_path))
    else:
        import_database(Path(source_path), Path(destination_path))
