import sqlite3

import pytest

from backend.app import database


@pytest.fixture
def backgrounds_db(tmp_path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "test_backgrounds.db"
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE Backgrounds (
                name TEXT PRIMARY KEY,
                description TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Background_Skills (
                background_name TEXT,
                skill_name TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Background_Characters (
                background_name TEXT,
                character_name TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Background_Notes (
                background_name TEXT,
                note TEXT
            )
            """
        )
        conn.execute(
            "INSERT INTO Backgrounds (name, description) VALUES (?, ?)",
            ("Acolyte", "Raised in the service of a temple."),
        )
        conn.executemany(
            "INSERT INTO Background_Skills (background_name, skill_name) VALUES (?, ?)",
            [("Acolyte", "Insight"), ("Acolyte", "Religion")],
        )
        conn.execute(
            "INSERT INTO Background_Characters (background_name, character_name) VALUES (?, ?)",
            ("Acolyte", "Shadowheart"),
        )
        conn.executemany(
            "INSERT INTO Background_Notes (background_name, note) VALUES (?, ?)",
            [("Acolyte", "Gain Inspiration for acting with faith."), ("Acolyte", "Temples offer shelter.")],
        )
        conn.commit()
    finally:
        conn.close()

    monkeypatch.setitem(database.DATABASE_PATHS, "backgrounds", db_path)
    return db_path


def test_list_backgrounds_returns_nested_data(backgrounds_db, client):
    response = client.get("/api/backgrounds")
    assert response.status_code == 200

    payload = response.json()
    assert len(payload) == 1

    background = payload[0]
    assert background["name"] == "Acolyte"
    assert "temple" in (background.get("description") or "").lower()
    assert sorted(skill["name"] for skill in background["skills"]) == ["Insight", "Religion"]
    assert [character["name"] for character in background["characters"]] == ["Shadowheart"]
    assert len(background["notes"]) == 2
