import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app import database  # noqa: E402  (import after path setup)
from backend.app.main import app  # noqa: E402


@pytest.fixture
def test_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    db_path = tmp_path / "test_companion.db"
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT,
                region TEXT,
                description TEXT,
                is_collected INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.executemany(
            """
            INSERT INTO items (name, type, region, description, is_collected)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("Ancient Amulet", "Accessory", "Act 1", "An old relic.", 0),
                ("Mystic Cloak", "Armor", "Act 2", None, 1),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    monkeypatch.setitem(database.DATABASE_PATHS, "companion", db_path)
    return db_path


@pytest.fixture
def client(test_db: Path) -> TestClient:  # noqa: PT004
    with TestClient(app) as test_client:
        yield test_client
