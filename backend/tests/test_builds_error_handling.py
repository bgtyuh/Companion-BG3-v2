from __future__ import annotations

import sqlite3
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app.main import app

BASE_BUILD_PAYLOAD = {
    "name": "Arcane Archer",
    "race": "Elf",
    "class": "Fighter",
    "subclass": "Arcane Archer",
    "notes": "Test build",
    "skill_choices": [],
}

LEVEL_PAYLOAD = {
    "level": 1,
    "spells": "",
    "feats": "",
    "subclass_choice": "",
    "multiclass_choice": "",
    "note": "",
}


def _build_payload(*, include_level: bool, level_payload: dict | None = None) -> dict:
    payload = {**BASE_BUILD_PAYLOAD}
    if include_level:
        payload["levels"] = [dict(level_payload or LEVEL_PAYLOAD)]
    else:
        payload["levels"] = []
    return payload


class BuildErrorHandlingTests(unittest.TestCase):
    def test_create_build_returns_500_when_insert_fails(self) -> None:
        payload = _build_payload(include_level=False)

        with patch("backend.app.main.execute", side_effect=sqlite3.Error("boom")):
            with TestClient(app) as client:
                response = client.post("/api/builds", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create build"})

    def test_create_build_returns_500_when_lastrowid_missing(self) -> None:
        payload = _build_payload(include_level=False)

        with patch("backend.app.main.execute", return_value=None):
            with TestClient(app) as client:
                response = client.post("/api/builds", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create build"})

    def test_create_build_returns_500_when_level_insert_fails(self) -> None:
        payload = _build_payload(include_level=True)

        with patch("backend.app.main.execute", side_effect=[1, sqlite3.Error("boom")]):
            with TestClient(app) as client:
                response = client.post("/api/builds", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create build"})

    def test_create_build_returns_500_when_load_fails(self) -> None:
        payload = _build_payload(include_level=False)

        with patch("backend.app.main.execute", return_value=1):
            with patch("backend.app.main._load_build", side_effect=sqlite3.Error("boom")):
                with TestClient(app) as client:
                    response = client.post("/api/builds", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create build"})

    def test_update_build_returns_500_when_initial_fetch_fails(self) -> None:
        payload = _build_payload(include_level=False)

        with patch("backend.app.main.fetch_one", side_effect=sqlite3.Error("boom")):
            with TestClient(app) as client:
                response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})

    def test_update_build_returns_500_when_update_fails(self) -> None:
        payload = _build_payload(include_level=False)

        with patch("backend.app.main.fetch_one", return_value={"id": 1}):
            with patch("backend.app.main.execute", side_effect=sqlite3.Error("boom")):
                with TestClient(app) as client:
                    response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})

    def test_update_build_returns_500_when_reset_levels_fails(self) -> None:
        payload = _build_payload(include_level=False)

        with patch("backend.app.main.fetch_one", return_value={"id": 1}):
            with patch(
                "backend.app.main.execute",
                side_effect=[None, sqlite3.Error("boom")],
            ):
                with TestClient(app) as client:
                    response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})

    def test_update_build_returns_500_when_insert_level_fails(self) -> None:
        payload = _build_payload(include_level=True)

        with patch("backend.app.main.fetch_one", return_value={"id": 1}):
            with patch(
                "backend.app.main.execute",
                side_effect=[None, None, sqlite3.Error("boom")],
            ):
                with TestClient(app) as client:
                    response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})

    def test_update_build_returns_500_when_load_fails(self) -> None:
        payload = _build_payload(include_level=False)

        with patch("backend.app.main.fetch_one", return_value={"id": 1}):
            with patch(
                "backend.app.main.execute",
                side_effect=[None, None],
            ):
                with patch(
                    "backend.app.main._load_build",
                    side_effect=sqlite3.Error("boom"),
                ):
                    with TestClient(app) as client:
                        response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})

    def test_delete_build_returns_500_when_delete_levels_fails(self) -> None:
        with patch("backend.app.main.execute", side_effect=sqlite3.Error("boom")):
            with TestClient(app) as client:
                response = client.delete("/api/builds/1")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to delete build"})

    def test_delete_build_returns_500_when_delete_fails(self) -> None:
        with patch(
            "backend.app.main.execute",
            side_effect=[None, sqlite3.Error("boom")],
        ):
            with TestClient(app) as client:
                response = client.delete("/api/builds/1")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to delete build"})
