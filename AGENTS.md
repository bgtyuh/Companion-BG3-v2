# AGENTS.md - Companion-BG3-v2

Ce fichier definit les regles de travail pour maintenir ce projet sans friction.

## 1) Objectif du projet

Companion-BG3 est une application full-stack :
- backend FastAPI (`backend/app`) expose des donnees BG3 depuis SQLite
- frontend React + TypeScript (`frontend/src`) consomme cette API
- les donnees sont stockees dans `data/*.db`

## 2) Architecture de reference

- Backend API principal : `backend/app/main.py`
- Acces base : `backend/app/database.py`
- Schemas API : `backend/app/schemas.py`
- Front API client : `frontend/src/api.ts`
- Types front : `frontend/src/types.ts`
- UI metier : `frontend/src/components/*`
- Outils partages front : `frontend/src/utils/*`

Regle : toute evolution d'endpoint doit garder **backend schema + client API + types front** alignes.

## 3) Regles backend

1. Ne jamais hardcoder des chemins absolus de base de donnees.
   - Toujours passer par `DATABASE_PATHS` et `BG3_DATA_DIR`.
   - Pour Python/venv, preferer `scripts/manage.py` et `BG3_PYTHON_EXE` plutot que des chemins hardcodes.
2. Conserver les erreurs HTTP explicites (404 vs 500).
3. Eviter la duplication : extraire des helpers quand une logique est repetee (mapping row -> schema, insertions multiples, etc.).
4. Garder les migrations legeres dans `database.py` (approche additive, idempotente).
5. Toute nouvelle base SQLite doit etre ajoutee dans `DATABASE_FILENAMES`.

## 4) Regles frontend

1. Toute requete HTTP passe par `frontend/src/api.ts`.
2. Les composants de presentation ne doivent pas re-implementer des parsers API.
3. Eviter les duplications de filtres/renders:
   - reutiliser `useNameTypeRarityFilters`
   - reutiliser les renderers communs (ex: tooltips equipement)
4. Conserver les cles React Query stables et centralisees quand possible.
5. Si un type backend change, mettre a jour immediatement `types.ts`.

## 5) Qualite et verification

Avant merge, executer :

```bash
# Frontend
cd frontend
npm run lint
npm run build

# Backend (si runtime Python disponible)
cd ..
python -m pytest backend/tests
```

Si un check ne peut pas tourner (environnement), le mentionner explicitement dans le compte-rendu.

## 6) Hygiene du repo

1. Ne pas reintroduire de fichiers template hors-contexte (ex: README Vite par defaut, favicon Vite par defaut).
2. Ne pas conserver des artefacts de projets precedents non references par le code.
3. Limiter les gros changements melanges :
   - idealement 1 bloc fonctionnel par commit (API, UI, data, docs).
4. Garder `README.md` (racine) et `frontend/README.md` coherents avec l'etat reel du projet.
5. Conserver les fichiers texte en UTF-8 et eviter les caracteres invisibles/copier-coller exotiques.

## 7) Checklist PR rapide

- [ ] Contrat API et types front synchronises
- [ ] Pas de duplication evidente ajoutee
- [ ] Lint front passe
- [ ] Build front passe
- [ ] Tests backend passes (ou blocage documente)
- [ ] Aucun fichier legacy/template ajoute par erreur
- [ ] Documentation impactee mise a jour
