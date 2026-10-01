# AGENTS.md

This repository is a storefront with a static HTML/CSS/JS front end and a separate Node.js/Express + Prisma backend.

## Project map

- Frontend pages live in the repository root: `index.html`, `catalogo.html`, `produto.html`, `carrinho.html`, `admin.html`, `admin-produtos.html`, `login.html`.
- Shared browser logic is in `js/*.js`, especially `js/shared.js`, `js/catalogo.js`, `js/admin.js`, and `js/produtos.js`.
- Backend code is in `backend/server.js` and `backend/upload.js`.
- Database models and Prisma configuration live in `backend/prisma/schema.prisma`.
- Static assets are served from the `assets/` folder and from `/assets` in the backend.

## Core conventions

- This project is not a framework app; there is no build step for the frontend. Most pages are plain HTML that load scripts directly.
- The backend is a standalone Express app. Run it from `backend/` with Node and Prisma.
- Frontend API URLs are intentionally environment-aware:
  - production: Railway URL
  - local dev: `http://localhost:3000`
- Admin access relies on a bearer token in the `Authorization` header, validated against `ADMIN_TOKEN` in the backend environment.
- The browser stores the admin token in `localStorage` under `admin_token`.
- Product data includes `nome`, `marca`, `volume`, `preco`, `imagem`, `descricao`, `categoria`, and `ativo`.
- Order statuses should remain consistent with the existing values: `NOVO`, `PAGO`, `ENVIADO`, and `CANCELADO`.

## Typical workflows

- Local backend:
  - `cd backend`
  - `npm install`
  - `npm run dev`
- Prisma deploy/generate when schema changes:
  - `cd backend`
  - `npx prisma migrate deploy`
  - `npx prisma generate`
- Frontend preview: open the static HTML files directly in the browser or serve the repo with a simple static server if needed.

## Important implementation notes

- When changing API contracts, update both backend handlers and frontend fetch logic together.
- Preserve compatibility with GitHub Pages and local dev URLs when editing `window.API_URL` or image resolution logic.
- Keep image handling compatible with both full URLs and local asset paths; do not assume every image is hosted on the same domain.
- For catalog/admin screens, keep the product filters and category behavior aligned with the current pattern in `js/catalogo.js`.
- Avoid introducing bundlers, frameworks, or major project restructuring unless explicitly requested.
- Changes to Prisma models should be paired with migration awareness; do not edit generated migrations casually.

## Files to inspect first for common tasks

- `backend/server.js` — API routes and auth logic
- `backend/prisma/schema.prisma` — database schema and model definitions
- `js/shared.js` — shared storefront config and cart logic
- `js/catalogo.js` — catalog rendering, filters, and product fetch flow
- `js/admin.js` — admin order list, status updates, and summary cards

## Guidance for AI coding agents

- Prefer targeted edits over broad refactors.
- Match the project’s current Portuguese naming and UX copy.
- Keep behavior consistent with the already implemented localStorage + bearer-token admin flow.
- Handle missing or failed API responses gracefully without breaking the page.
- Favor minimal, explicit code changes that fit the handcrafted static site architecture.
