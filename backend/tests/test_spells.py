import sqlite3
from typing import Any, Mapping

import pytest

from backend.app import database


@pytest.fixture
def spells_db(tmp_path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "test_spells.db"
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE Spells (
                name TEXT PRIMARY KEY,
                level TEXT,
                description TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Spell_Properties (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                spell_name TEXT NOT NULL,
                property_name TEXT NOT NULL,
                property_value TEXT,
                FOREIGN KEY (spell_name) REFERENCES Spells(name)
            )
            """
        )
        conn.executemany(
            """
            INSERT INTO Spells (name, level, description)
            VALUES (?, ?, ?)
            """,
            [
                (
                    "Magic Missile",
                    "1",
                    "Magic Missile is a level 1 evocation spell that conjures bolts of magical force.",
                ),
                (
                    "Fireball",
                    "3",
                    "Fireball is a level 3 evocation spell that engulfs an area in roaring flames.",
                ),
            ],
        )
        conn.executemany(
            """
            INSERT INTO Spell_Properties (spell_name, property_name, property_value)
            VALUES (?, ?, ?)
            """,
            [
                ("Magic Missile", "Casting Time", "1 action"),
                ("Magic Missile", "Range", "120 feet"),
                ("Fireball", "Area", "20-foot-radius sphere"),
                ("Fireball", "Saving Throw", "DEX"),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    monkeypatch.setitem(database.DATABASE_PATHS, "spells", db_path)
    return db_path


def _properties_by_name(spell: Mapping[str, Any]):
    return {prop["name"]: prop["value"] for prop in spell["properties"]}


def test_list_spells_returns_spells_with_properties(spells_db, client):
    response = client.get("/api/spells")
    assert response.status_code == 200

    payload = response.json()
    assert len(payload) == 2

    spells = {spell["name"]: spell for spell in payload}

    magic_missile = spells["Magic Missile"]
    assert magic_missile["level"] == "1"
    assert magic_missile["school"] == "Evocation"
    assert "bolts of magical force" in (magic_missile.get("description") or "").lower()
    assert _properties_by_name(magic_missile) == {
        "Casting Time": "1 action",
        "Range": "120 feet",
    }

    fireball = spells["Fireball"]
    assert fireball["level"] == "3"
    assert fireball["school"] == "Evocation"
    assert "roaring flames" in (fireball.get("description") or "").lower()
    assert _properties_by_name(fireball) == {
        "Area": "20-foot-radius sphere",
        "Saving Throw": "DEX",
    }
