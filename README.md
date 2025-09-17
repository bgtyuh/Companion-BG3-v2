# Companion-BG3-v2

Companion-BG3 est une application compagnon pour Baldur's Gate 3. Elle associe un back-end FastAPI qui expose des bases de
connaissances du jeu (équipements, sorts, classes, races…) et une interface React/Vite destinée au suivi de votre groupe.
Vous pouvez y préparer vos builds, tracer l'évolution de chaque personnage et planifier le butin important à récupérer.

## Structure du dépôt

- `backend/` – API FastAPI adossée à des fichiers SQLite.
- `frontend/` – Application React + TypeScript bâtie avec Vite.
- `data/` – Bases SQLite distribuées avec le projet.

## Configuration de l'API côté front

Le front consomme l'API via une variable d'environnement `VITE_API_BASE_URL`. Créez un fichier `frontend/.env` (ou
`frontend/.env.local`) contenant par exemple :

```bash
VITE_API_BASE_URL="http://localhost:8000"
```

Adaptez l'URL si l'API est exposée sur une autre machine ou un autre port.

Si la variable n'est pas définie, le front tente automatiquement de contacter l'API
sur le même hôte en supposant le port `8000` lorsque l'application est lancée avec
`npm run dev` ou `npm run preview`. Cette valeur par défaut facilite le
démarrage local, mais pensez à définir `VITE_API_BASE_URL` si votre API tourne
sur un autre port ou une autre machine.

## Scripts npm utiles

Depuis `frontend/` :

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre le serveur de développement Vite (http://localhost:5173). |
| `npm run build` | Compile TypeScript et génère le bundle de production dans `dist/`. |
| `npm run preview` | Sert le bundle généré pour validation locale. |
| `npm run lint` | Vérifie le code avec ESLint. |
| `npm test` | Alias du lint pour l'intégration continue. |

## Instructions de développement

1. **Préparer l'API**
   ```bash
   cd "Documents/Projets Perso/GitHub Sync/Companion-BG3-v2"
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r backend\requirements.txt
   uvicorn backend.app.main:app --reload
   ```
   L'API écoute sur http://127.0.0.1:8000 et expose la documentation sur `/docs`.

2. **Préparer le front**
   ```bash
   cd "Documents/Projets Perso/GitHub Sync/Companion-BG3-v2/frontend"
   npm install
   npm run dev
   ```
   L'application est disponible sur http://localhost:5173. Assurez-vous que `VITE_API_BASE_URL` pointe bien vers l'API en cours
d'exécution.

## Instructions de build

- **Front-end**
  ```bash
  cd "Documents/Projets Perso/GitHub Sync/Companion-BG3-v2/frontend"
  npm install
  npm run build
  ```
  Les fichiers statiques sont générés dans `frontend/dist/`. Servez-les via un serveur HTTP ou l'API (`npm run preview` pour un
  test rapide).

- **Back-end**
  Le back-end Python ne requiert pas de build spécifique : un simple déploiement FastAPI (uvicorn/gunicorn + `backend.app.main`) et
  l'accès aux fichiers `data/*.db` suffisent.

Bon développement !
