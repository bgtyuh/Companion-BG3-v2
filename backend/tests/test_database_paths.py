from __future__ import annotations

import importlib
from pathlib import Path

import pytest

from backend.app import database


@pytest.mark.parametrize(
    "db_key", ["companion", "armours", "shields"],
)
def test_database_paths_follow_env_variable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, db_key: str
) -> None:
    monkeypatch.setenv("BG3_DATA_DIR", str(tmp_path))
    try:
        reloaded = importlib.reload(database)
        expected = tmp_path / reloaded.DATABASE_FILENAMES[db_key]
        assert reloaded.DATABASE_PATHS[db_key] == expected
    finally:
        monkeypatch.delenv("BG3_DATA_DIR", raising=False)
        importlib.reload(database)
