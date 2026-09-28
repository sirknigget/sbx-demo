# Copies OMP's SQLite database with the SQLite backup API.
# Produces a consistent snapshot even when the source uses a WAL journal.
# Requires OMP to be stopped before an import into the destination database.

import sqlite3
import sys
from pathlib import Path


# Copies the source database to a new destination through a temporary file.
# Replaces the destination only after SQLite confirms the snapshot is valid.
def copy_database(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + ".copying")
    if temporary.exists():
        temporary.unlink()
    try:
        with sqlite3.connect(f"{source.resolve().as_uri()}?mode=ro", uri=True) as src:
            with sqlite3.connect(temporary) as dst:
                src.backup(dst)
                if dst.execute("PRAGMA quick_check").fetchone() != ("ok",):
                    raise RuntimeError(f"Invalid SQLite snapshot: {source}")
        temporary.chmod(0o600)
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


# Accepts paths from copy-state.sh, not paths relative to the process directory.
if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: omp-db-copy.py SOURCE DESTINATION")
    copy_database(Path(sys.argv[1]), Path(sys.argv[2]))
