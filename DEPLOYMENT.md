# 🚀 Complete Production Deployment Guide: PKL Multiplayer Auction Simulator on Render (Free Tier)

This guide walks you step-by-step through deploying your PKL Auction Simulator to **Render** using **100% free resources**.

---

## 🏗️ Architecture & Free Tier Specs

| Component | Free Solution | Details & Limits |
| :--- | :--- | :--- |
| **Web Service** | **Render Free Web Service** | 512 MB RAM, 0.1 CPU, spins down after 15 min of inactivity, cold start ~30–50s. |
| **Realtime Sockets** | **Embedded Socket.IO Server** | Runs within the same persistent Node.js process as Next.js (`server.ts`). Shared origin, no CORS issues. |
| **Database** | **Neon.tech (Recommended Free Postgres)** | 0.5 GB storage, permanent free tier (**does NOT expire in 30 days**). |
| **Database Alternative** | **Render Free PostgreSQL** | 1 GB storage, but **EXPIRES & DELETES DATA after 30 days**. |
| **Player Photos** | **Bundled Assets (`public/players/`)** | Bundled directly in git repo with automatic monogram badge fallback. |

> [!WARNING]
> **Render's Free PostgreSQL 30-Day Expiration:**
> Render's built-in free database will automatically be dropped and deleted after 30 days. To ensure your auction rooms, team squads, and results remain permanently saved, **we recommend creating a free PostgreSQL database on [Neon.tech](https://neon.tech)** (free forever, setup takes 60 seconds).

---

## 📋 Step 1: Get a Permanent Free PostgreSQL Database (60 Seconds)

1. Sign up for free at [neon.tech](https://neon.tech) (using GitHub).
2. Create a project named `pkl-auction`.
3. In the Neon Dashboard, copy the connection string under **Connection Details**:
   ```
   postgresql://username:password@ep-sample-pooler.region.neon.tech/neondb?sslmode=require
   ```
   *(Keep this string ready for Step 2).*

---

## 📋 Step 2: Deploy to Render (Free Tier)

### Method A: Deploy via GitHub Repository (Recommended)

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your repo:
   `https://github.com/dharaneshwaran17/pkl-auction.git`
4. Configure the service settings:
   - **Name:** `pkl-auction-live` *(or your preferred name)*
   - **Region:** `Oregon (US West)` or `Singapore`
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm ci && npx tsx scripts/prepare-db.ts && npm run build
     ```
   - **Start Command:**
     ```bash
     npx tsx server.ts
     ```
   - **Instance Type:** Select **Free** ($0/month).
5. Scroll down to **Environment Variables** and add:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `DATABASE_URL` = *(Paste your Neon/PostgreSQL connection string from Step 1)*
   - `NEXT_PUBLIC_APP_URL` = `https://pkl-auction-live.onrender.com` *(adjust if your service name is different)*
6. Click **Create Web Service**.

---

## 🔄 What Happens During Deployment:

1. **`prepare-db.ts`** runs during the build:
   - Detects the PostgreSQL `DATABASE_URL`.
   - Generates the Prisma Client configured for PostgreSQL (`@prisma/adapter-pg`).
   - Runs `npx prisma db push` to safely apply the schema to your database without resetting or wiping any existing auction history.
2. **Next.js Turbopack** compiles production pages and API routes.
3. **`server.ts`** boots:
   - Binds to `0.0.0.0:10000`.
   - Runs `AuctionEngine.onServerStart()`, which safely restores any interrupted live auctions as `PAUSED`.
   - Mounts the Socket.IO server at `/socket.io`.

---

## 🎮 Free Tier Runtime Behavior & Best Practices

- **Idle Sleep:** Render Free instances automatically sleep after 15 minutes without web requests.
- **Waking Up (Cold Start):** When someone visits the website after it has been asleep, it takes about 30 to 50 seconds to wake up.
- **Reconnection Banner:** A top banner in the room notifies players:  
  *“Syncing with server... (Free Render instances may take ~30-50s to wake from idle standby)”*  
  The socket client automatically retries connection with backoff.
- **Auction State Safety:** If the server restarts or wakes up, any in-progress auction will be safely held in **`PAUSED`** state. The host can explicitly review the room and click **`RESUME`**. No lot or bid data is ever lost.

---

## 🧪 Local Testing & Verification Checklist

Before pushing changes:
```bash
# 1. Run unit tests
npm test

# 2. Verify image decodes and mappings
npx tsx scripts/verify-all-images.ts

# 3. Test build compatibility
npm run build
```
