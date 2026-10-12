"""Provision only an ignored local .env; never modify a frontend or global environment."""
import os
from pathlib import Path
import secrets

root = Path(__file__).resolve().parents[1]
target = root / ".env"
if target.exists():
    raise SystemExit(".env already exists; refusing to replace your configuration.")
library = os.environ.get("SPATIALITE_LIBRARY_PATH")
if not library:
    candidates = list((root / ".runtime").rglob("mod_spatialite.dll"))
    for path in [Path("/usr/lib/x86_64-linux-gnu/mod_spatialite.so"), Path("/usr/lib/aarch64-linux-gnu/mod_spatialite.so")]:
        if path.exists():
            candidates.append(path)
    if candidates:
        library = str(candidates[0].resolve())
if not library:
    raise SystemExit("Install SpatiaLite and set SPATIALITE_LIBRARY_PATH, or configure PostgreSQL in .env.")
target.write_text(
    "APP_ENV=development\nDATABASE_URL=sqlite+aiosqlite:///./tapas.db\n"
    "AUTH_SECRET=" + secrets.token_hex(32) + "\n"
    "SPATIALITE_LIBRARY_PATH=" + Path(library).as_posix() + "\n"
    "NOTIFICATION_MODE=simulated\nPUBLIC_URL=http://localhost:8000\n",
    encoding="utf-8")
print("Created private local .env. Signing secret was not printed.")
