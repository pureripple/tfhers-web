# TFHers frontend

Vue 3 + Vite + Vue Router + Pinia shell for the TFHers migration.

User routes under `/`, admin under `/admin`. Business pages remain placeholders;
auth, API client, layouts, and route guards are wired.

## Auth

| Side | Storage | Login API |
|------|---------|-----------|
| User | `localStorage.user` (JSON incl. `token`) | `POST /api/user/login` |
| Admin | `localStorage.admin_token` (JWT string) | `POST /api/admin/login` |

Authed requests send `Authorization: Bearer …`. Unified response: `{ code, msg, data }` with success when `code === 200`.

## Dev proxy (`vite.config.ts`)

- `/api/admin` → `http://127.0.0.1:8081` (management)
- `/api` → `http://127.0.0.1:8080` (app; lists admin rule first)

## Commands

```bash
cd frontend
npm install
npm run dev
npm run build
```

Dev: http://localhost:5173

No legacy static HTML/CSS/JS/images are copied here. Old resources stay in
`tfhers-web-app` / `tfhers-web-management` until the Vue migration is finished.
