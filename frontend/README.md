# Frontend Companion BG3

Interface React + TypeScript pour piloter les donnees exposees par l'API FastAPI.

## Prerequis

- Node.js 20+
- API backend disponible (par defaut sur `http://localhost:8000`)

## Configuration

Creer `frontend/.env.local` si besoin :

```bash
VITE_API_BASE_URL="http://localhost:8000"
```

## Scripts

- `npm run dev` : serveur Vite local
- `npm run lint` : verification ESLint
- `npm run build` : build production (TypeScript + Vite)
- `npm run preview` : previsualisation du build

## Notes

- Les icones du projet sont chargees depuis `../ressources/icons` via `import.meta.glob`.
- Le front gere les erreurs API avec des messages explicites pour faciliter le debug local.
