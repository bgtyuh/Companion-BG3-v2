from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient


def test_list_loot_items_returns_seed_data(client: TestClient) -> None:
    response = client.get("/api/loot")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2

    names = [item["name"] for item in data]
    assert names == sorted(names)

    first_item = data[0]
    assert first_item["name"] == "Ancient Amulet"
    assert first_item["is_collected"] is False
    assert isinstance(first_item["is_collected"], bool)

    second_item = data[1]
    assert second_item["name"] == "Mystic Cloak"
    assert second_item["is_collected"] is True


def test_create_loot_item_inserts_and_returns_new_item(client: TestClient) -> None:
    payload = {
        "name": "Shadow Blade",
        "type": "Weapon",
        "region": "Underdark",
        "description": "Forged from magical darkness.",
        "is_collected": True,
    }

    response = client.post("/api/loot", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] > 0
    assert data["name"] == payload["name"]
    assert data["is_collected"] is True

    list_response = client.get("/api/loot")
    assert list_response.status_code == 200
    items = list_response.json()
    created = next((item for item in items if item["id"] == data["id"]), None)
    assert created is not None
    for key, value in payload.items():
        if key == "is_collected":
            assert created[key] is True
        else:
            assert created[key] == value


def test_update_loot_item_modifies_existing_row(client: TestClient) -> None:
    payload: dict[str, Any] = {
        "description": "Recovered from the Goblin Camp.",
        "is_collected": True,
    }
    response = client.put("/api/loot/1", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == 1
    assert data["name"] == "Ancient Amulet"
    assert data["description"] == payload["description"]
    assert data["is_collected"] is True


def test_update_loot_item_missing_returns_404(client: TestClient) -> None:
    response = client.put("/api/loot/999", json={"name": "Nonexistent"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Loot item not found"


def test_delete_loot_item_removes_row(client: TestClient) -> None:
    delete_response = client.delete("/api/loot/1")
    assert delete_response.status_code == 204

    list_response = client.get("/api/loot")
    assert list_response.status_code == 200
    remaining = list_response.json()
    ids = [item["id"] for item in remaining]
    assert ids == [2]
