# Companion-BG3-v2

Companion-BG3 est un outil de suivi et de planification pour Baldur's Gate 3. Il combine un back-end FastAPI qui expose les bases de
connaissances du jeu (armures, armes, sorts, races, classes…) et une application React qui met en scène ces données dans une
interface inspirée des fiches de gestion de personnages.

## Fonctionnalités principales

- **Gestion du butin prioritaire** : créez et cochez les objets essentiels à récupérer pendant l'aventure.
- **Planificateur de builds** : concevez vos progressions niveau par niveau (sorts, dons, choix de sous-classes, multiclasses…).
- **Gestion d'équipe** : enregistrez les membres du groupe, attribuez-leur un build, des équipements, des compétences et un grimoire.
- **Fiche de personnage détaillée** : consultez en un coup d'œil les statistiques, jets de sauvegarde, équipements et sorts, ainsi que
  la prochaine étape suggérée par le build choisi.
- **Armurerie et arsenal** : parcourez l'ensemble des armures et armes disponibles pour préparer votre theorycraft.
- **Grimoire** : filtrez les sorts par nom ou par niveau pour constituer rapidement vos listes.
- **Bestiaire personnalisable** : consignez vos ennemis dangereux avec leurs résistances, faiblesses et notes tactiques.

## Architecture

```
backend/         API FastAPI + SQLite (fichiers *.db fournis)
frontend/        Application React + TypeScript (Vite)
data/            Bases SQLite utilisées par l'application
```

Le front-end consomme les endpoints du back-end (`/api/*`) pour charger les données et persiste les informations propres au joueur
(liste de butin, builds, bestiaire, équipage) dans la base `bg3_companion.db`.

## Lancer le projet

### 1. Back-end

```bash
cd "Documents\Projets Perso\GitHub Sync\Companion-BG3-v2"
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload

```

L'API écoute par défaut sur http://127.0.0.1:8000 et expose la documentation interactive sur `/docs`.

### 2. Front-end

```bash
cd "Documents\Projets Perso\GitHub Sync\Companion-BG3-v2\frontend"
npm install
npm run dev

```

L'application est accessible sur http://localhost:5173. Par défaut, elle contacte l'API sur `http://localhost:8000`. Pour utiliser une
adresse différente, créez un fichier `frontend/.env` avec la variable `VITE_API_BASE_URL`.

## Jeux de données

Les fichiers SQLite fournis dans `data/` contiennent :

- `bg3_armours.db`, `bg3_weapons.db`, `bg3_spells.db`, `bg3_races.db`, `bg3_classes.db` : données encyclopédiques.
- `bg3_companion.db` : espace d'écriture utilisé par l'application (builds, bestiaire, checklist de butin, etc.).

## Vérifications

Des commandes simples permettent de valider les deux projets :

```bash
# Compilation Python
python -m compileall backend

# Build TypeScript/React
cd frontend
npm run build
```

Bon jeu !
