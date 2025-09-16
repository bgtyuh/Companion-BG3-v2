from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, Optional

ROOT_DIR = Path(__file__).resolve().parents[2]

_data_dir_env = os.getenv("BG3_DATA_DIR", "data")
BG3_DATA_DIR = Path(_data_dir_env).expanduser()
if not BG3_DATA_DIR.is_absolute():
    BG3_DATA_DIR = ROOT_DIR / BG3_DATA_DIR

DATA_DIR = BG3_DATA_DIR

DATABASE_FILENAMES: Dict[str, str] = {
    "companion": "bg3_companion.db",
    "armours": "bg3_armours.db",
    "weapons": "bg3_weapons.db",
    "spells": "bg3_spells.db",
    "races": "bg3_races.db",
    "classes": "bg3_classes.db",
    "rings": "bg3_rings.db",
    "amulets": "bg3_amulets.db",
    "cloaks": "bg3_cloaks.db",
    "clothing": "bg3_clothing.db",
    "footwears": "bg3_footwears.db",
    "handwears": "bg3_handwears.db",
    "headwears": "bg3_headwears.db",
    "shields": "bg3_shields.db",
}

DATABASE_PATHS: Dict[str, Path] = {
    key: DATA_DIR / filename for key, filename in DATABASE_FILENAMES.items()
}

_SCHEMA_INITIALIZED: Dict[tuple[str, Path], bool] = {}


def _ensure_companion_schema(conn: sqlite3.Connection) -> None:
    """Apply lightweight schema migrations for the companion database."""

    cursor = conn.execute("PRAGMA table_info(build_levels)")
    columns = {row["name"] for row in cursor.fetchall()}
    if not columns:
        # The table does not exist in the current database; nothing to migrate.
        return
    if "note" not in columns:
        conn.execute("ALTER TABLE build_levels ADD COLUMN note TEXT DEFAULT ''")
        conn.commit()


def _initialize_schema(conn: sqlite3.Connection, db_key: str, path: Path) -> None:
    cache_key = (db_key, path)
    if _SCHEMA_INITIALIZED.get(cache_key):
        return

    if db_key == "companion":
        _ensure_companion_schema(conn)

    _SCHEMA_INITIALIZED[cache_key] = True


@contextmanager
def get_connection(db_key: str) -> Iterator[sqlite3.Connection]:
    path = DATABASE_PATHS.get(db_key)
    if path is None:
        raise KeyError(f"Unknown database key: {db_key}")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        _initialize_schema(conn, db_key, path)
        yield conn
    finally:
        conn.close()


def fetch_all(db_key: str, query: str, params: Iterable[Any] | None = None) -> list[dict[str, Any]]:
    params = tuple(params or ())
    with get_connection(db_key) as conn:
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def fetch_one(
    db_key: str, query: str, params: Iterable[Any] | None = None
) -> Optional[dict[str, Any]]:
    params = tuple(params or ())
    with get_connection(db_key) as conn:
        cursor = conn.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None


def execute(
    db_key: str,
    query: str,
    params: Iterable[Any] | None = None,
    *,
    fetch_lastrowid: bool = False,
) -> Optional[int]:
    params = tuple(params or ())
    with get_connection(db_key) as conn:
        cursor = conn.execute(query, params)
        conn.commit()
        if fetch_lastrowid:
            return int(cursor.lastrowid)
    return None
