import sqlite3

import pytest

from backend.app import database


@pytest.fixture
def abilities_db(tmp_path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "test_abilities.db"
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE Abilities (
                name TEXT PRIMARY KEY,
                description TEXT,
                image_path TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Ability_Uses (
                ability_name TEXT,
                use_name TEXT,
                description TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Ability_Checks (
                ability_name TEXT,
                check_type TEXT,
                description TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Ability_Check_Skills (
                ability_name TEXT,
                skill_name TEXT,
                description TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Ability_Saves (
                ability_name TEXT,
                description TEXT
            )
            """
        )
        conn.execute(
            "INSERT INTO Abilities (name, description, image_path) VALUES (?, ?, ?)",
            ("Strength", "Measures physical power.", "images/strength.png"),
        )
        conn.execute(
            "INSERT INTO Ability_Uses (ability_name, use_name, description) VALUES (?, ?, ?)",
            ("Strength", "Attack Rolls", "Melee weapon attacks."),
        )
        conn.execute(
            "INSERT INTO Ability_Checks (ability_name, check_type, description) VALUES (?, ?, ?)",
            ("Strength", "Check", "Break objects and push obstacles."),
        )
        conn.execute(
            "INSERT INTO Ability_Check_Skills (ability_name, skill_name, description) VALUES (?, ?, ?)",
            ("Strength", "Athletics", "Climb, jump, and swim."),
        )
        conn.execute(
            "INSERT INTO Ability_Saves (ability_name, description) VALUES (?, ?)",
            ("Strength", "Resist pushes and holds."),
        )
        conn.commit()
    finally:
        conn.close()

    monkeypatch.setitem(database.DATABASE_PATHS, "abilities", db_path)
    return db_path


def test_list_abilities_returns_nested_data(abilities_db, client):
    response = client.get("/api/abilities")
    assert response.status_code == 200

    payload = response.json()
    assert len(payload) == 1

    ability = payload[0]
    assert ability["name"] == "Strength"
    assert ability["image_path"] == "images/strength.png"
    assert ability["uses"] == [
        {"name": "Attack Rolls", "description": "Melee weapon attacks."}
    ]
    assert ability["checks"] == [
        {"type": "Check", "description": "Break objects and push obstacles."}
    ]
    assert ability["skills"] == [
        {"name": "Athletics", "description": "Climb, jump, and swim."}
    ]
    assert ability["saves"] == [
        {"description": "Resist pushes and holds."}
    ]
