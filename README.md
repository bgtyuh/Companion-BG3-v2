# Companion-BG3-v2

Companion-BG3 est une application compagnon pour Baldur's Gate 3.
Le projet combine:
- un backend FastAPI (SQLite)
- un frontend React + TypeScript (Vite)

## Structure

- `backend/`: API FastAPI
- `frontend/`: interface React
- `data/`: bases SQLite
- `scripts/manage.py`: commandes de setup/lancement

## Lancement rapide

Depuis la racine du repo:

```powershell
python scripts\manage.py setup
python scripts\manage.py dev
```

Puis ouvrir:
- Frontend: `http://localhost:5173`
- API docs: `http://127.0.0.1:8000/docs`

## Changement de chemin Python (important)

Si Python a ete deplace (ou si `.venv` est casse), `scripts/manage.py` detecte maintenant un venv invalide et le recree automatiquement.

Le script utilise cet ordre de priorite pour creer le venv:
1. `BG3_PYTHON_EXE` (si defini)
2. `C:\Users\zaidi\AppData\Local\Programs\Python\Python314\python.exe`
3. `sys.executable`

Exemple recommande sur ta machine:

```powershell
$env:BG3_PYTHON_EXE = "C:\Users\zaidi\AppData\Local\Programs\Python\Python314\python.exe"
python scripts\manage.py setup-backend
```

Tu peux aussi lancer directement:

```powershell
& "C:\Users\zaidi\AppData\Local\Programs\Python\Python314\python.exe" scripts\manage.py setup
& "C:\Users\zaidi\AppData\Local\Programs\Python\Python314\python.exe" scripts\manage.py dev
```

## Commandes utiles

```powershell
python scripts\manage.py setup-backend
python scripts\manage.py setup-frontend
python scripts\manage.py run-backend
python scripts\manage.py run-frontend
python scripts\manage.py dev
```

## Verification

```powershell
cd frontend
npm run lint
npm run build
```

Si Python est disponible:

```powershell
cd ..
.\.venv\Scripts\python.exe -m pip install pytest
.\.venv\Scripts\python.exe -m pytest backend\tests
```
