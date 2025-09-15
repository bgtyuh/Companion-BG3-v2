from __future__ import annotations

import sqlite3
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app.main import app


ENEMY_PAYLOAD = {
    "name": "Goblin",
    "stats": "AC 15",
    "resistances": "Fire",
    "weaknesses": "Cold",
    "abilities": "Slash",
    "notes": "Be careful",
}


class BestiaryErrorHandlingTests(unittest.TestCase):
    def test_create_enemy_returns_500_when_insert_fails(self) -> None:
        with patch("backend.app.main.execute", side_effect=sqlite3.Error("boom")):
            with TestClient(app) as client:
                response = client.post("/api/bestiary", json=ENEMY_PAYLOAD)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create enemy"})

    def test_create_enemy_returns_500_when_fetch_fails(self) -> None:
        with patch("backend.app.main.execute", return_value=1):
            with patch("backend.app.main.fetch_one", side_effect=sqlite3.Error("boom")):
                with TestClient(app) as client:
                    response = client.post("/api/bestiary", json=ENEMY_PAYLOAD)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create enemy"})

    def test_update_enemy_returns_500_when_initial_fetch_fails(self) -> None:
        with patch("backend.app.main.fetch_one", side_effect=sqlite3.Error("boom")):
            with TestClient(app) as client:
                response = client.put("/api/bestiary/1", json=ENEMY_PAYLOAD)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update enemy"})

    def test_update_enemy_returns_500_when_update_fails(self) -> None:
        enemy_row = {
            "id": 1,
            "name": "Goblin",
            "stats": "AC 15",
            "resistances": "Fire",
            "weaknesses": "Cold",
            "abilities": "Slash",
            "notes": "Be careful",
        }

        with patch("backend.app.main.fetch_one", return_value=enemy_row):
            with patch("backend.app.main.execute", side_effect=sqlite3.Error("boom")):
                with TestClient(app) as client:
                    response = client.put("/api/bestiary/1", json=ENEMY_PAYLOAD)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update enemy"})

    def test_delete_enemy_returns_500_when_delete_fails(self) -> None:
        with patch("backend.app.main.execute", side_effect=sqlite3.Error("boom")):
            with TestClient(app) as client:
                response = client.delete("/api/bestiary/1")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to delete enemy"})


if __name__ == "__main__":
    unittest.main()
