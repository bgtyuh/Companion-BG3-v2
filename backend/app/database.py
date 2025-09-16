from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, Optional

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"

DATABASE_PATHS: Dict[str, Path] = {
    "companion": DATA_DIR / "bg3_companion.db",
    "armours": DATA_DIR / "bg3_armours.db",
    "weapons": DATA_DIR / "bg3_weapons.db",
    "spells": DATA_DIR / "bg3_spells.db",
    "races": DATA_DIR / "bg3_races.db",
    "classes": DATA_DIR / "bg3_classes.db",
    "rings": DATA_DIR / "bg3_rings.db",
    "amulets": DATA_DIR / "bg3_amulets.db",
    "cloaks": DATA_DIR / "bg3_cloaks.db",
    "clothing": DATA_DIR / "bg3_clothing.db",
    "footwears": DATA_DIR / "bg3_footwears.db",
    "handwears": DATA_DIR / "bg3_handwears.db",
    "headwears": DATA_DIR / "bg3_headwears.db",
    "shields": DATA_DIR / "bg3_shields.db",
}


@contextmanager
def get_connection(db_key: str) -> Iterator[sqlite3.Connection]:
    path = DATABASE_PATHS.get(db_key)
    if path is None:
        raise KeyError(f"Unknown database key: {db_key}")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
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
