import sqlite3

import pytest

from backend.app import database


@pytest.fixture
def feats_db(tmp_path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "test_feats.db"
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE Feats (
                name TEXT PRIMARY KEY,
                description TEXT,
                prerequisite TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Feat_Options (
                feat_name TEXT,
                option_name TEXT,
                description TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE Feat_Notes (
                feat_name TEXT,
                note TEXT
            )
            """
        )
        conn.execute(
            "INSERT INTO Feats (name, description, prerequisite) VALUES (?, ?, ?)",
            ("Alert", "Always ready for danger.", "Level 4"),
        )
        conn.executemany(
            "INSERT INTO Feat_Options (feat_name, option_name, description) VALUES (?, ?, ?)",
            [
                ("Alert", "Watchful", "Gain a bonus to initiative."),
                ("Alert", "Vigilant", "You cannot be surprised."),
            ],
        )
        conn.execute(
            "INSERT INTO Feat_Notes (feat_name, note) VALUES (?, ?)",
            ("Alert", "Synergises well with high dexterity."),
        )
        conn.commit()
    finally:
        conn.close()

    monkeypatch.setitem(database.DATABASE_PATHS, "feats", db_path)
    return db_path


def test_list_feats_returns_options_and_notes(feats_db, client):
    response = client.get("/api/feats")
    assert response.status_code == 200

    payload = response.json()
    assert len(payload) == 1

    feat = payload[0]
    assert feat["name"] == "Alert"
    assert "danger" in (feat.get("description") or "").lower()
    assert feat["prerequisite"] == "Level 4"
    assert sorted(option["name"] for option in feat["options"]) == [
        "Vigilant",
        "Watchful",
    ]
    assert feat["notes"] == [{"note": "Synergises well with high dexterity."}]
