#!/usr/bin/env python3
"""Utility commands to set up and run the Companion BG3 project."""

from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterable, Sequence

import shutil

ROOT_DIR = Path(__file__).resolve().parents[1]
VENV_DIR = ROOT_DIR / ".venv"
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
REQUIREMENTS_FILE = BACKEND_DIR / "requirements.txt"


class CommandError(RuntimeError):
    """Raised when a subprocess exits with a non-zero status."""


def _venv_bin(name: str) -> Path:
    if os.name == "nt":
        return VENV_DIR / "Scripts" / f"{name}.exe"
    return VENV_DIR / "bin" / name


def _run(cmd: Sequence[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> None:
    cmd_display = " ".join(cmd)
    print(f"\n$ {cmd_display}")
    try:
        subprocess.run(cmd, cwd=cwd, env=env, check=True)
    except subprocess.CalledProcessError as exc:  # pragma: no cover - thin wrapper
        raise CommandError(f"Command failed with exit code {exc.returncode}: {cmd_display}") from exc


def create_virtualenv() -> None:
    if VENV_DIR.exists():
        print(f"Virtual environment already present at {VENV_DIR}.")
        return

    _run([sys.executable, "-m", "venv", str(VENV_DIR)])
    print(f"Created virtual environment in {VENV_DIR}.")


def install_backend_dependencies() -> None:
    create_virtualenv()
    pip_executable = _venv_bin("pip")
    if not pip_executable.exists():
        raise CommandError("Unable to locate pip inside the virtual environment. Did the creation fail?")

    if not REQUIREMENTS_FILE.exists():
        raise FileNotFoundError(f"Backend requirements file not found at {REQUIREMENTS_FILE}.")

    _run([str(pip_executable), "install", "-r", str(REQUIREMENTS_FILE)])


def install_frontend_dependencies() -> None:
    npm_executable = shutil.which("npm")
    if not npm_executable:
        raise CommandError("npm is required to install front-end dependencies but was not found in PATH.")

    _run([npm_executable, "install"], cwd=FRONTEND_DIR)


def run_backend(reload: bool = True) -> None:
    create_virtualenv()
    python_executable = _venv_bin("python")
    if not python_executable.exists():
        raise CommandError("Virtual environment is missing a Python executable.")

    args = [str(python_executable), "-m", "uvicorn", "backend.app.main:app"]
    if reload:
        args.append("--reload")

    env = os.environ.copy()
    env.setdefault("PYTHONPATH", str(ROOT_DIR))
    _run(args, cwd=ROOT_DIR, env=env)


def run_frontend() -> None:
    npm_executable = shutil.which("npm")
    if not npm_executable:
        raise CommandError("npm is required to run the front-end but was not found in PATH.")

    _run([npm_executable, "run", "dev"], cwd=FRONTEND_DIR)


def run_dev_server() -> None:
    create_virtualenv()
    python_executable = _venv_bin("python")
    npm_executable = shutil.which("npm")
    if not python_executable.exists():
        raise CommandError("Virtual environment is missing a Python executable.")
    if not npm_executable:
        raise CommandError("npm is required to run the front-end but was not found in PATH.")

    backend_cmd = [str(python_executable), "-m", "uvicorn", "backend.app.main:app", "--reload"]
    frontend_cmd = [npm_executable, "run", "dev"]

    print("Starting backend and frontend development servers. Press Ctrl+C to stop.")

    backend_proc = subprocess.Popen(backend_cmd, cwd=ROOT_DIR)
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR)

    def _terminate(proc: subprocess.Popen) -> None:
        if proc.poll() is not None:
            return
        try:
            if os.name == "nt":
                proc.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                proc.terminate()
        except ProcessLookupError:
            pass

    try:
        while True:
            backend_code = backend_proc.poll()
            frontend_code = frontend_proc.poll()
            if backend_code is not None or frontend_code is not None:
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopping development servers...")
    finally:
        _terminate(backend_proc)
        _terminate(frontend_proc)
        backend_proc.wait()
        frontend_proc.wait()

    if backend_proc.returncode:
        raise CommandError(f"Backend exited with status {backend_proc.returncode}.")
    if frontend_proc.returncode:
        raise CommandError(f"Frontend exited with status {frontend_proc.returncode}.")


def main(argv: Iterable[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("setup", help="Install backend and frontend dependencies.")
    subparsers.add_parser("setup-backend", help="Create the virtualenv and install backend dependencies.")
    subparsers.add_parser("setup-frontend", help="Install frontend npm packages.")

    backend_parser = subparsers.add_parser("run-backend", help="Start the FastAPI backend with uvicorn.")
    backend_parser.add_argument("--no-reload", action="store_true", help="Disable uvicorn autoreload.")

    subparsers.add_parser("run-frontend", help="Start the Vite development server.")
    subparsers.add_parser("dev", help="Run backend and frontend development servers simultaneously.")

    args = parser.parse_args(argv)

    if args.command == "setup":
        install_backend_dependencies()
        install_frontend_dependencies()
    elif args.command == "setup-backend":
        install_backend_dependencies()
    elif args.command == "setup-frontend":
        install_frontend_dependencies()
    elif args.command == "run-backend":
        run_backend(reload=not args.no_reload)
    elif args.command == "run-frontend":
        run_frontend()
    elif args.command == "dev":
        run_dev_server()
    else:  # pragma: no cover - argparse prevents this path
        parser.error(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main()
