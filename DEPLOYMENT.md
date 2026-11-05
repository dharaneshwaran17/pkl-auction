# 🚀 Production Deployment Guide: Pro Kabaddi Live Auction Simulator

This guide walks you through deploying your live multiplayer PKL Auction Simulator to a public cloud provider so that **your laptop does not need to stay online**.

---

## Architecture Overview
- **Application Engine:** Next.js App Router + Custom Node HTTP Server running Socket.IO.
- **Real-Time WebSockets:** Sockets and HTTP served from the exact same origin (no CORS or cookie sync issues).
- **Persistent Database:** PostgreSQL in production (via `@prisma/adapter-pg`) / SQLite in development (`@prisma/adapter-libsql`).
- **Health Endpoint:** `GET /api/health` monitors database connectivity, uptime, and memory.

---

## Option 1: 1-Click Deployment on Render (Recommended & Easiest)

Render provides persistent Node.js web services and managed PostgreSQL databases.

### Steps:
1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: complete pkl auction simulator with postgres and docker support"
   git remote add origin https://github.com/<your-username>/pk-auction.git
   git push -u origin master
   ```

2. **Deploy via Render Blueprint (`render.yaml`):**
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** → **Blueprint**.
   - Connect your `pk-auction` GitHub repository.
   - Render automatically reads `render.yaml` and provisions:
     1. A managed PostgreSQL database (`pkl-auction-db`).
     2. A persistent Web Service running `npx tsx server.ts` with auto-wired `DATABASE_URL`.
   - Click **Apply**.

3. **Run Initial Database Migration & Seed:**
   - In Render Dashboard, open the Web Service shell (or under Settings → Post-Deploy Command):
     ```bash
     npx prisma db push
     npx tsx prisma/seed.ts
     ```

4. **Your Public HTTPS URL:**
   - Render provides a public HTTPS URL like: `https://pkl-auction-live.onrender.com`.
   - Share this link with your friends. You can turn off your laptop completely!

---

## Option 2: Deployment on Railway

Railway supports persistent Node.js instances with native WebSocket and PostgreSQL support.

### Steps:
1. Go to [railway.app](https://railway.app) and create a new project.
2. Click **Add Service** → **Database** → **PostgreSQL**.
3. Click **Add Service** → **GitHub Repo** → select `pk-auction`.
4. In the Web Service settings:
   - Connect `DATABASE_URL` from the PostgreSQL service (`${{Postgres.DATABASE_URL}}`).
   - Set Environment Variable: `NODE_ENV=production`.
5. Under **Settings** → **Networking**, click **Generate Domain** to get your public HTTPS URL (`https://pk-auction-production.up.railway.app`).
6. Run the initial migration via Railway CLI or dashboard query:
   ```bash
   railway run npx prisma db push
   railway run npx tsx prisma/seed.ts
   ```

---

## Option 3: Deploy via Docker (Any VPS / DigitalOcean / AWS EC2)

A production-ready `Dockerfile` is included in the root directory.

### Build & Run Container:
```bash
# 1. Build Docker image
docker build -t pkl-auction:latest .

# 2. Run container with PostgreSQL
docker run -d \
  --name pkl-auction \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:password@postgres-host:5432/pkldb?sslmode=require" \
  pkl-auction:latest
```

---

## Database Backup and Recovery

### PostgreSQL Backup:
```bash
pg_dump -U pkl_admin -h <host> -d pkl_auction > backup_$(date +%Y%m%d).sql
```

### PostgreSQL Restore:
```bash
psql -U pkl_admin -h <host> -d pkl_auction < backup_20261104.sql
```

---

## Health Check Endpoint
To monitor your live deployment:
```http
GET /api/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-11-04T13:40:00.000Z",
  "uptimeSeconds": 3600,
  "database": {
    "status": "healthy",
    "responseTimeMs": 12
  },
  "memory": {
    "rssMb": 110,
    "heapUsedMb": 65
  },
  "version": "1.0.0"
}
```
