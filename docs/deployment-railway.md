# Deploying VolleyLab on Railway

VolleyLab runs as **three Railway services** from one Git repository:

| Service    | Root directory | Role                                      |
|-----------|----------------|-------------------------------------------|
| PostgreSQL | (Railway plugin) | Database                                |
| `api`     | `backend`      | NestJS API + Prisma migrations on start   |
| `web`     | `frontend`     | Vite-built React SPA served with `serve`  |

The browser talks to the **public** API URL. The API talks to Postgres over Railway’s private `DATABASE_URL`.

---

## 1. Prerequisites

- GitHub (or GitLab) repo pushed with this project.
- [Railway](https://railway.com) account.
- Local stack working: `docker compose up -d`, backend `.env`, frontend dev server, login OK.

---

## 2. Create the Railway project

1. **New project** → **Deploy from GitHub repo** → select VolleyLab.
2. **Add PostgreSQL**: project canvas → **+ New** → **Database** → **PostgreSQL**.
3. **Add the API service**:
   - **+ New** → **GitHub Repo** → same repo.
   - Open the service → **Settings** → **Root Directory** → `backend`.
   - **Settings** → **Build** → builder should pick up `backend/railway.toml` / `Dockerfile`.
4. **Add the web service**:
   - Repeat with **Root Directory** → `frontend`.

You should see: Postgres + two app services.

---

## 3. Wire Postgres to the API

1. Open the **PostgreSQL** service → **Connect** → copy **`DATABASE_URL`** (or use **Variables** tab).
2. Open the **`api`** service → **Variables**:
   - Click **+ New Variable** → **Add Reference** → select Postgres → **`DATABASE_URL`**.
   - Railway merges this into the API container at runtime.

Do **not** commit real secrets; set them only in Railway.

---

## 4. API environment variables

On the **`api`** service (**Variables**):

| Variable        | Required | Notes |
|----------------|----------|--------|
| `DATABASE_URL` | Yes      | Reference from Postgres service. |
| `JWT_SECRET`   | Yes      | Long random string (e.g. `openssl rand -hex 32`). |
| `JWT_EXPIRES_IN` | No     | Default in code: `1d`. |
| `CORS_ORIGIN`  | Yes*     | Public URL of the **web** service, e.g. `https://web-production-xxxx.up.railway.app`. No trailing slash. |
| `PORT`         | No       | Railway sets this automatically. |

\*Without `CORS_ORIGIN` (or `FRONTEND_URL`), the API only allows `http://localhost:5173`, so production login will fail in the browser.

Optional: after the web service has a domain, set `CORS_ORIGIN` and redeploy the API if you deployed API first.

**Health check:** `GET /health` → `{ "status": "ok" }` (configured in `backend/railway.toml`).

**Swagger:** `https://<api-domain>/api/docs`

On each deploy, the container runs `prisma migrate deploy` then starts NestJS (`npm run start:deploy`).

---

## 5. Web environment variables (build time)

Vite bakes `VITE_API_URL` into the JS bundle **at build time**.

On the **`web`** service:

1. **Variables** → add `VITE_API_URL` = public **`api`** URL (no trailing slash), e.g. `https://api-production-xxxx.up.railway.app`.
2. In Railway, enable **Available during Docker build** (or equivalent “build-time” flag) for `VITE_API_URL` so the `frontend/Dockerfile` `ARG` receives it.
3. **Redeploy** the web service after changing `VITE_API_URL`.

Generate public URLs: each service → **Settings** → **Networking** → **Generate domain**.

**Order tip:** deploy API first → generate API domain → set `VITE_API_URL` on web → deploy web → generate web domain → set `CORS_ORIGIN` on API → redeploy API.

---

## 6. Demo data (optional)

The repo includes `backend/prisma/seed.ts` (demo user/password in that file). It is **not** run automatically in production.

From your machine (with network access to the DB), you can run once:

```bash
cd backend
# Paste Railway Postgres DATABASE_URL into .env temporarily, or export it:
# set DATABASE_URL=postgresql://...
npx prisma db seed
```

Remove the URL from local `.env` afterward. Prefer a dedicated demo account only for coursework demos.

---

## 7. Verify production

1. Open the **web** URL → register or log in.
2. Create a team / open tactics — confirms API + CORS + DB.
3. Open **api** `/health` and `/api/docs`.
4. If the UI loads but API calls fail:
   - Browser devtools → Network: wrong host → fix `VITE_API_URL` and **rebuild** web.
   - CORS error → fix `CORS_ORIGIN` on API (exact web origin, `https`).
   - 401 on login → check `JWT_SECRET` is set on API.

---

## 8. Local production-like check (optional)

With local Postgres running:

```powershell
cd backend
docker build -t volleylab-api .
docker run --rm -p 3000:3000 `
  -e DATABASE_URL="postgresql://volleylab:volleylab@host.docker.internal:5432/volleylab?schema=public" `
  -e JWT_SECRET="local-docker-test-secret" `
  -e CORS_ORIGIN="http://localhost:8080" `
  volleylab-api
```

```powershell
cd frontend
docker build -t volleylab-web --build-arg VITE_API_URL=http://localhost:3000 .
docker run --rm -p 8080:8080 volleylab-web
```

On Linux/macOS use `host.docker.internal` or your Docker host IP for `DATABASE_URL`.

---

## 9. Costs and limits

Railway free/trial credits apply; Postgres + two always-on services consume them. For a university demo, generate domains only when needed and stop services when not presenting.

---

## File reference

- `backend/Dockerfile`, `backend/railway.toml` — API image and health check.
- `frontend/Dockerfile`, `frontend/railway.toml` — SPA build + static server.
- `backend/src/cors.ts` — reads `CORS_ORIGIN` / `FRONTEND_URL`.
- `frontend/src/api.ts` — reads `VITE_API_URL`.
