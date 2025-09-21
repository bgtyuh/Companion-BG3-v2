from __future__ import annotations

import shutil
import sqlite3
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app import database

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
    class _FakeCursor:
        def __init__(self, *, lastrowid: int | None = None, fetchone: dict | None = None) -> None:
            self.lastrowid = lastrowid
            self._fetchone = fetchone

        def fetchone(self) -> dict | None:
            return self._fetchone

    def _mock_connection(self, execute_effects: list[object]) -> tuple[MagicMock, patch]:
        conn = MagicMock()
        effects = iter(execute_effects)

        def _execute(*args: object, **kwargs: object) -> MagicMock:
            try:
                result = next(effects)
            except StopIteration:
                result = MagicMock()
            if isinstance(result, Exception):
                raise result
            if isinstance(result, self._FakeCursor):
                return result
            return MagicMock()

        conn.execute.side_effect = _execute
        conn.commit = MagicMock()
        conn.rollback = MagicMock()

        @contextmanager
        def _get_connection(_db_key: str):
            yield conn

        return conn, patch("backend.app.main.get_connection", _get_connection)

    def test_create_build_returns_500_when_insert_fails(self) -> None:
        payload = _build_payload(include_level=False)

        conn, conn_patch = self._mock_connection([sqlite3.Error("boom")])
        with conn_patch:
            with TestClient(app) as client:
                response = client.post("/api/builds", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create build"})
        conn.rollback.assert_called_once()

    def test_create_build_returns_500_when_lastrowid_missing(self) -> None:
        payload = _build_payload(include_level=False)

        conn, conn_patch = self._mock_connection([self._FakeCursor(lastrowid=None)])
        with conn_patch:
            with TestClient(app) as client:
                response = client.post("/api/builds", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create build"})
        conn.rollback.assert_called_once()

    def test_create_build_returns_500_when_level_insert_fails(self) -> None:
        payload = _build_payload(include_level=True)

        conn, conn_patch = self._mock_connection(
            [self._FakeCursor(lastrowid=1), sqlite3.Error("boom")]
        )
        with conn_patch:
            with TestClient(app) as client:
                response = client.post("/api/builds", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create build"})
        conn.rollback.assert_called_once()

    def test_create_build_returns_500_when_load_fails(self) -> None:
        payload = _build_payload(include_level=False)

        conn, conn_patch = self._mock_connection([self._FakeCursor(lastrowid=1)])
        with conn_patch:
            with patch("backend.app.main._load_build", side_effect=sqlite3.Error("boom")):
                with TestClient(app) as client:
                    response = client.post("/api/builds", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to create build"})
        conn.commit.assert_called_once()

    def test_update_build_returns_500_when_initial_fetch_fails(self) -> None:
        payload = _build_payload(include_level=False)

        conn, conn_patch = self._mock_connection([sqlite3.Error("boom")])
        with conn_patch:
            with TestClient(app) as client:
                response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})
        conn.rollback.assert_called_once()

    def test_update_build_returns_500_when_update_fails(self) -> None:
        payload = _build_payload(include_level=False)

        conn, conn_patch = self._mock_connection(
            [self._FakeCursor(fetchone={"id": 1}), sqlite3.Error("boom")]
        )
        with conn_patch:
            with TestClient(app) as client:
                response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})
        conn.rollback.assert_called_once()

    def test_update_build_returns_500_when_reset_levels_fails(self) -> None:
        payload = _build_payload(include_level=False)

        conn, conn_patch = self._mock_connection(
            [self._FakeCursor(fetchone={"id": 1}), MagicMock(), sqlite3.Error("boom")]
        )
        with conn_patch:
            with TestClient(app) as client:
                response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})
        conn.rollback.assert_called_once()

    def test_update_build_returns_500_when_insert_level_fails(self) -> None:
        payload = _build_payload(include_level=True)

        conn, conn_patch = self._mock_connection(
            [
                self._FakeCursor(fetchone={"id": 1}),
                MagicMock(),
                MagicMock(),
                sqlite3.Error("boom"),
            ]
        )
        with conn_patch:
            with TestClient(app) as client:
                response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})
        conn.rollback.assert_called_once()

    def test_update_build_returns_500_when_load_fails(self) -> None:
        payload = _build_payload(include_level=False)

        conn, conn_patch = self._mock_connection(
            [self._FakeCursor(fetchone={"id": 1}), MagicMock(), MagicMock()]
        )
        with conn_patch:
            with patch(
                "backend.app.main._load_build",
                side_effect=sqlite3.Error("boom"),
            ):
                with TestClient(app) as client:
                    response = client.put("/api/builds/1", json=payload)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "Failed to update build"})
        conn.commit.assert_called_once()

    def test_create_build_does_not_persist_levels_when_insertion_fails(self) -> None:
        payload = _build_payload(include_level=True)

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "bg3_companion.db"
            fixture_db = Path(__file__).resolve().parents[2] / "data" / "bg3_companion.db"
            shutil.copy(fixture_db, db_path)

            with sqlite3.connect(db_path) as conn:
                before_builds = conn.execute("SELECT COUNT(*) FROM builds").fetchone()[0]
                before_levels = conn.execute("SELECT COUNT(*) FROM build_levels").fetchone()[0]

            class _FailingLevelConnection:
                def __init__(self, real_conn: sqlite3.Connection) -> None:
                    self._conn = real_conn
                    self._failed = False

                def execute(self, query: str, params: tuple | list | None = None):
                    if (
                        "INSERT INTO build_levels" in query
                        and not self._failed
                    ):
                        self._failed = True
                        raise sqlite3.Error("boom")
                    if params is None:
                        return self._conn.execute(query)
                    return self._conn.execute(query, params)

                def commit(self) -> None:
                    self._conn.commit()

                def rollback(self) -> None:
                    self._conn.rollback()

                def __getattr__(self, item: str):
                    return getattr(self._conn, item)

            @contextmanager
            def _failing_get_connection(_db_key: str):
                with database.get_connection(_db_key) as real_conn:
                    yield _FailingLevelConnection(real_conn)

            with patch.dict(
                "backend.app.database.DATABASE_PATHS",
                {"companion": db_path},
            ):
                with patch("backend.app.main.get_connection", _failing_get_connection):
                    with TestClient(app) as client:
                        response = client.post("/api/builds", json=payload)

            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json(), {"detail": "Failed to create build"})

            with sqlite3.connect(db_path) as conn:
                after_builds = conn.execute("SELECT COUNT(*) FROM builds").fetchone()[0]
                after_levels = conn.execute("SELECT COUNT(*) FROM build_levels").fetchone()[0]

            self.assertEqual(before_builds, after_builds)
            self.assertEqual(before_levels, after_levels)

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
