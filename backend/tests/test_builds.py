from __future__ import annotations

import sqlite3
from pathlib import Path

from typing import Any

from fastapi.testclient import TestClient


def _prepare_build_tables(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("DROP TABLE IF EXISTS build_levels")
        conn.execute("DROP TABLE IF EXISTS builds")
        conn.execute(
            """
            CREATE TABLE builds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                race TEXT,
                class TEXT,
                subclass TEXT,
                notes TEXT,
                skill_choices TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE build_levels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                build_id INTEGER NOT NULL,
                level INTEGER NOT NULL,
                spells TEXT,
                feats TEXT,
                subclass_choice TEXT,
                multiclass_choice TEXT,
                note TEXT,
                FOREIGN KEY(build_id) REFERENCES builds(id)
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def test_create_build_creates_entry_with_levels(
    client: TestClient, test_db: Path
) -> None:
    _prepare_build_tables(test_db)

    payload = {
        "name": "Arcane Archer",
        "race": "Elf",
        "class": "Fighter",
        "subclass": "Arcane Archer",
        "notes": "Ranged build focusing on archery.",
        "skill_choices": ["Acrobatics", "Stealth", "Perception"],
        "levels": [
            {
                "level": 1,
                "spells": "Magic Missile",
                "feats": "Sharpshooter",
                "subclass_choice": "Arcane Shot",
                "multiclass_choice": "",
                "note": "Open with Magic Missile for consistent damage.",
            },
            {
                "level": 2,
                "spells": "",
                "feats": "Action Surge",
                "subclass_choice": "",
                "multiclass_choice": "",
                "note": "Action Surge enables burst turns.",
            },
        ],
    }

    response = client.post("/api/builds", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] > 0
    assert data["name"] == payload["name"]
    assert data["class"] == payload["class"]
    assert data["notes"] == payload["notes"]
    assert sorted(data["skill_choices"]) == sorted(payload["skill_choices"])
    assert len(data["levels"]) == 2

    first_level = data["levels"][0]
    assert first_level["level"] == 1
    assert first_level["spells"] == "Magic Missile"
    assert first_level["feats"] == "Sharpshooter"
    assert first_level["note"] == "Open with Magic Missile for consistent damage."

    list_response = client.get("/api/builds")
    assert list_response.status_code == 200
    builds = list_response.json()
    assert len(builds) == 1
    assert builds[0]["id"] == data["id"]


def test_update_build_replaces_levels(client: TestClient, test_db: Path) -> None:
    _prepare_build_tables(test_db)

    create_payload = {
        "name": "Arcane Archer",
        "race": "Elf",
        "class": "Fighter",
        "subclass": "Arcane Archer",
        "notes": "Ranged build focusing on archery.",
        "skill_choices": ["Acrobatics", "Stealth", "Perception"],
        "levels": [
            {
                "level": 1,
                "spells": "Magic Missile",
                "feats": "Sharpshooter",
                "subclass_choice": "Arcane Shot",
                "multiclass_choice": "",
                "note": "Initial loadout.",
            }
        ],
    }

    create_response = client.post("/api/builds", json=create_payload)
    assert create_response.status_code == 201
    build_id = create_response.json()["id"]

    update_levels: list[dict[str, Any]] = [
        {
            "level": 1,
            "spells": "Hunter's Mark",
            "feats": "Sharpshooter",
            "subclass_choice": "Arcane Shot",
            "multiclass_choice": "",
            "note": "Swap to Hunter's Mark for extra damage.",
        },
        {
            "level": 2,
            "spells": "",
            "feats": "Action Surge",
            "subclass_choice": "",
            "multiclass_choice": "",
            "note": "Leverage Action Surge in key fights.",
        },
    ]
    update_payload = {
        "name": "Arcane Archer",
        "race": "Elf",
        "class": "Fighter",
        "subclass": "Arcane Archer",
        "notes": "Updated notes.",
        "skill_choices": ["Acrobatics", "Stealth", "Insight"],
        "levels": update_levels,
    }

    response = client.put(f"/api/builds/{build_id}", json=update_payload)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == build_id
    assert data["notes"] == "Updated notes."
    assert sorted(data["skill_choices"]) == sorted(update_payload["skill_choices"])
    assert len(data["levels"]) == 2
    returned_spells = [level["spells"] for level in data["levels"]]
    assert "Hunter's Mark" in returned_spells
    assert "Magic Missile" not in returned_spells
    notes = [level["note"] for level in data["levels"]]
    assert any("Hunter's Mark" in note or "extra damage" in note for note in notes)

    detail_response = client.get(f"/api/builds/{build_id}")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert len(detail["levels"]) == 2
    assert detail["levels"][0]["spells"] == "Hunter's Mark"


def test_delete_build_removes_entry(client: TestClient, test_db: Path) -> None:
    _prepare_build_tables(test_db)

    payload = {
        "name": "Arcane Archer",
        "race": "Elf",
        "class": "Fighter",
        "subclass": "Arcane Archer",
        "notes": "Ranged build focusing on archery.",
        "skill_choices": ["Acrobatics", "Stealth", "Perception"],
        "levels": [
            {
                "level": 1,
                "spells": "Magic Missile",
                "feats": "Sharpshooter",
                "subclass_choice": "Arcane Shot",
                "multiclass_choice": "",
                "note": "Initial loadout.",
            }
        ],
    }

    create_response = client.post("/api/builds", json=payload)
    assert create_response.status_code == 201
    build_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/builds/{build_id}")
    assert delete_response.status_code == 204

    list_response = client.get("/api/builds")
    assert list_response.status_code == 200
    assert list_response.json() == []

    detail_response = client.get(f"/api/builds/{build_id}")
    assert detail_response.status_code == 404


def test_update_build_missing_returns_404(client: TestClient, test_db: Path) -> None:
    _prepare_build_tables(test_db)

    payload = {
        "name": "Arcane Archer",
        "race": "Elf",
        "class": "Fighter",
        "subclass": "Arcane Archer",
        "notes": "Ranged build focusing on archery.",
        "levels": [],
    }

    response = client.put("/api/builds/999", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "Build not found"
