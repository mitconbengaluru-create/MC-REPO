# MITCON Credentia — Secure Document Vault (MC-Ledger)

> A secure physical document tracking and checkout ledger for **MITCON Credentia, Bengaluru**.  
> Manages legal and financial documents for multiple clients, with checkout workflows, digital signatures, and real-time notifications.

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![Backend](https://img.shields.io/badge/Backend-Railway-purple?logo=railway)](https://railway.app)
[![Database](https://img.shields.io/badge/Database-Supabase-green?logo=supabase)](https://supabase.com)
[![Node](https://img.shields.io/badge/Node.js-22.x-brightgreen?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.x-blue?logo=react)](https://react.dev)

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Live Deployment](#live-deployment)
- [Features](#features)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Routes](#api-routes)
- [Seed Users & Credentials](#seed-users--credentials)
- [Production Deployment](#production-deployment)
- [Known Issues](#known-issues)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 USER BROWSER                        │
│   React 19 SPA  ·  Tailwind CSS  ·  TypeScript      │
└───────────────────────┬─────────────────────────────┘
                        │  HTTPS
                        ▼
         ┌──────────────────────────┐
         │     VERCEL  (Frontend)   │
         │   Static SPA Hosting     │
         │   /api/*  → proxy fn     │
         └──────────────┬───────────┘
                        │  HTTPS / WSS
                        ▼
         ┌──────────────────────────┐
         │   RAILWAY  (Backend)     │
         │   Express.js 5 + Node 22 │
         │   Socket.IO · BullMQ     │
         │   Docker · Port 5000     │
         │   GET /health            │
         └────┬─────────────┬───────┘
              │             │
   ┌──────────▼──┐   ┌──────▼────────┐
   │  SUPABASE   │   │  REDIS        │
   │  PostgreSQL │   │  (Railway or  │
   │  (Database) │   │   external)   │
   │  Storage    │   │  BullMQ queues│
   └─────────────┘   └───────────────┘
```

| Layer | Platform | Details |
|---|---|---|
| **Frontend** | Vercel | React 19 SPA, Vite build, Tailwind CSS |
| **Backend** | Railway | Express.js 5, Node 22 Alpine Docker, port 5000 |
| **Database** | Supabase | PostgreSQL via Prisma ORM |
| **Storage** | Supabase Storage | Document files, signatures, reports |
| **Cache / Queue** | Redis (Railway add-on) | BullMQ background jobs, Socket.IO adapter |
| **Real-time** | Socket.IO | Live notifications pushed to connected clients |

---

## Tech Stack

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| TypeScript | ~5.7 | Type safety |
| Vite | 8.x | Build tool + dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| React Router DOM | 7.x | Client-side routing |
| Socket.IO Client | 4.x | Real-time WebSocket |
| Lucide React | 1.x | Icon library |
| Recharts | 3.x | Data charts |
| React Hook Form | 7.x | Form handling |
| Zod | 4.x | Schema validation |

### Backend
| Tool | Version | Purpose |
|---|---|---|
| Express.js | 5.x | HTTP framework |
| Prisma | 5.x | ORM + migrations |
| Socket.IO | 4.x | WebSocket server |
| BullMQ | 5.x | Background job queues |
| ioredis | 5.x | Redis client |
| @supabase/supabase-js | 2.x | Storage + Auth SDK |
| Pino | 9.x | Structured logging |
| Helmet | 7.x | HTTP security headers |
| Multer | 2.x | File upload handling |
| PDFKit | 0.19.x | PDF generation |
| ExcelJS | 4.x | Excel report generation |
| Zod | 3.x | Env schema validation |

---

## Live Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | Set in Vercel dashboard after deploy |
| Backend | Railway | Set in Railway dashboard after deploy |
| Backend Health | Railway | `<backend-url>/health` |

> The frontend routes all `/api/*` calls through a Vercel serverless proxy function (`frontend/api/`) to the Railway backend.  
> WebSocket (`Socket.IO`) connects directly from the browser to the Railway backend URL using `VITE_SOCKET_URL`.

---

## Features

| Feature | Description |
|---|---|
| 🔐 **Login** | Email + password authentication with organizational domain lock |
| 📁 **Vault Repository** | Register, view, search, and delete physical documents per client |
| 📤 **Checkout Workflow** | Check out documents with digital signature (draw / type / upload) |
| 📥 **Return Workflow** | Return documents with condition assessment and counter-signature |
| 🔔 **Real-time Notifications** | Socket.IO push notifications + browser desktop alerts |
| 👥 **User Management** | RBAC with `super-admin`, `admin`, `developer` roles |
| 🛡️ **Security Policy** | Global policy config: session timeout, MFA flag, upload formats |
| 📊 **Compliance Reports** | CSV export and print of checkout/return/document history |
| 💾 **Backup & Restore** | Full JSON export and re-import of all database tables |
| 🌱 **Seed Restore** | Restore the initial document library at any time |

---

## Project Structure

```
MITCON-CREDENTIA/              ← Monorepo root
├── backend/                   ← Express.js backend (deployed on Railway)
│   ├── prisma/
│   │   ├── schema.prisma      ← Database schema (6 models)
│   │   ├── seed.js            ← Database seeder
│   │   └── migrations/        ← Migration history
│   ├── src/
│   │   ├── server.js          ← Entry point
│   │   ├── app.js             ← Middleware + route mounts
│   │   ├── auth/              ← Login route
│   │   ├── routes/            ← API route handlers
│   │   ├── config/            ← DB, Redis, Supabase, env, socket configs
│   │   ├── middleware/        ← Auth, upload, rate-limit, error handling
│   │   ├── services/          ← Business logic (planned architecture)
│   │   ├── repositories/      ← DB query layer (planned architecture)
│   │   └── jobs/              ← BullMQ queue & worker setup
│   ├── Dockerfile             ← Multi-stage production image
│   ├── docker-entrypoint.sh   ← Auto-runs prisma migrate deploy on start
│   └── railway.json           ← Railway deployment config
│
└── frontend/                  ← React + Vite frontend (deployed on Vercel)
    ├── src/
    │   ├── App.tsx            ← Root: auth state, polling, Socket.IO
    │   ├── types.ts           ← TypeScript interfaces
    │   └── components/
    │       ├── LoginPage.tsx
    │       ├── Dashboard.tsx
    │       ├── RepoManager.tsx
    │       ├── CheckoutReturn.tsx
    │       ├── UserManager.tsx
    │       ├── ReportModule.tsx
    │       ├── NotificationCenter.tsx
    │       └── SignatureCanvas.tsx
    ├── vercel.json            ← Vercel SPA routing + API proxy
    └── vite.config.js         ← Dev proxy + chunk splitting
```

---

## Local Development Setup

### Prerequisites
- Node.js **22.x**
- npm **10.x**
- A [Supabase](https://supabase.com) project (free tier works)
- Redis (optional — set `REDIS_ENABLED=false` to skip)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd MITCON-CREDENTIA
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env and fill in your Supabase credentials
```

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js      # Seeds users, documents, and default policy
npm run dev              # Starts at http://localhost:5000
```

### 3. Frontend setup (new terminal)

```bash
cd frontend
cp .env.example .env
# .env can stay mostly empty for local dev — Vite proxies to localhost:5000

npm install
npm run dev              # Starts at http://localhost:3000
```

### 4. Verify

| Check | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend health | http://localhost:5000/health |
| Login (test) | Authenticate using configured user accounts |

---

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` and fill in the values.

```env
# Server
NODE_ENV=development          # development | production | test
PORT=5000
LOG_LEVEL=info                # debug | info | warn | error

# Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase Platform
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"   # Keep secret — backend only!
SUPABASE_JWT_SECRET="your-jwt-secret"

# Redis (set REDIS_ENABLED=false to disable for local dev)
REDIS_URL="redis://localhost:6379"
REDIS_ENABLED=true

# Security
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
JWT_SECRET="your-random-min-32-char-secret"
JWT_EXPIRY="1h"
BCRYPT_ROUNDS=12
```

> **Where to find Supabase credentials:**  
> Supabase Dashboard → Your Project → **Project Settings** → **Database** (connection strings) & **API** (keys)

### Frontend (`frontend/.env`)

```env
VITE_APP_NAME="MITCON Credentia Portal"
VITE_API_URL=/api                              # Proxied in dev, change to Railway URL in prod
VITE_SOCKET_URL=http://localhost:5000          # Set to Railway URL in production
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```

---

## Database

### Schema Models

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | System users with role-based access |
| `Document` | `documents` | Physical document records with client info |
| `Checkout` | `checkouts` | Document checkout logs with signatures |
| `Return` | `returns` | Document return records with condition |
| `Notification` | `notifications` | System notification feed |
| `SecurityPolicy` | `security_policies` | Global singleton policy config |

### Migrations

```bash
# Create a new migration (development)
cd backend
npx prisma migrate dev --name describe_your_change

# Apply migrations in production (runs automatically via docker-entrypoint.sh on Railway)
npx prisma migrate deploy

# Reset database (⚠️ DESTRUCTIVE — development only)
npx prisma migrate reset
```

### Supabase Storage Buckets

The following buckets must be **manually created** in the Supabase dashboard (Storage section):

| Bucket Name | Max Size | Access | Purpose |
|---|---|---|---|
| `mc-documents` | 50 MB | Private | Physical document files |
| `mc-signatures` | 5 MB | Private | Digital signature images |
| `mc-reports` | 20 MB | Private | Generated PDF/Excel reports |
| `mc-temporary` | 100 MB | Private | Temporary upload staging (24h expiry) |

---

## API Routes

All routes are prefixed with `/api`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Authenticate user |
| `GET` | `/documents` | List all documents |
| `POST` | `/documents` | Create a new document record |
| `DELETE` | `/documents/:id` | Delete document by ID |
| `POST` | `/documents/restore-seed` | Restore initial document library |
| `GET` | `/checkouts` | List all checkout records |
| `POST` | `/checkouts` | Create a checkout (marks document as Checked Out) |
| `POST` | `/checkouts/:id/return` | Process a document return |
| `GET` | `/returns` | List all return records |
| `GET` | `/users` | List all users |
| `POST` | `/users` | Create a user (restricted to org email domains) |
| `DELETE` | `/users/:id` | Delete a user |
| `GET` | `/policies` | Get global security policy |
| `PUT` | `/policies` | Update security policy |
| `GET` | `/notifications` | List all notifications |
| `PUT` | `/notifications/:id/read` | Mark notification as read |
| `POST` | `/notifications/clear-all` | Delete all notifications |
| `GET` | `/backup` | Export full database as JSON |
| `POST` | `/backup/restore` | Restore database from JSON |
| `GET` | `/health` | Health check probe (no auth required) |

---

## Seed Users & Credentials

Run `node prisma/seed.js` to populate the database with initial system roles:

| Name | Role | Description |
|---|---|---|
| System Developer | developer | Developer access role |
| Super Admin | **super-admin** | System administrator role |
| Admin | admin | Standard administrator role |
| Admin | admin | Standard administrator role |

> ⚠️ Refer to environment configuration and `backend/prisma/seed.js` for seeding accounts. Ensure no production credentials or sensitive emails/passwords are committed.

---

## Production Deployment

### Deploy Backend → Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select the repository and set the **Root Directory** to `backend/`
3. Railway uses `backend/railway.json` which builds via the `Dockerfile`
4. Add all **backend environment variables** in the Railway dashboard → Variables tab
5. The `docker-entrypoint.sh` automatically runs `prisma migrate deploy` on every container start
6. Railway pings `GET /health` to verify the service is up

**Required Railway environment variables:**
```
NODE_ENV=production
PORT=5000
DATABASE_URL=<supabase_pooler_url>
DIRECT_URL=<supabase_direct_url>
SUPABASE_URL=<supabase_url>
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret>
REDIS_URL=<redis_url>
REDIS_ENABLED=true
CORS_ORIGINS=https://<your-vercel-app>.vercel.app
JWT_SECRET=<random_32_char_string>
```

---

### Deploy Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
2. Set **Root Directory** to `frontend/`
3. **Build command**: `npm run build`
4. **Output directory**: `dist`
5. Add environment variables in the Vercel dashboard:

```
VITE_API_URL=https://<your-railway-backend>.up.railway.app
VITE_SOCKET_URL=https://<your-railway-backend>.up.railway.app
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
```

> **Important:** `VITE_SOCKET_URL` must point directly to the Railway backend URL. Vercel cannot proxy WebSocket connections — the browser connects to Railway directly for Socket.IO.

6. Update the Railway backend `CORS_ORIGINS` variable with the Vercel deployment URL after the first deploy.

---

### After First Deployment

1. **Seed the database** — Run `node prisma/seed.js` from the Railway shell or trigger `POST /api/documents/restore-seed` to restore just the documents
2. **Create Supabase Storage buckets** — `mc-documents`, `mc-signatures`, `mc-reports`, `mc-temporary`
3. **Verify health** — `GET <railway-url>/health` should return `{"status":"UP"}`

---

## Security & Resiliency

| Feature | Implementation |
|---|---|
| **HTTPS** | Enforced by Vercel and Railway (TLS termination) |
| **CORS** | Whitelist via `CORS_ORIGINS` env var; auto-allows `*.vercel.app` with project name |
| **Helmet** | Security HTTP headers on all responses |
| **Rate Limiting** | 10,000 req/15min global; 5 req/15min for auth; 20 req/hr for downloads |
| **File Validation** | Extension + MIME type + magic byte verification on all uploads |
| **Request Tracing** | Every request gets a `X-Request-Id` correlation header |
| **Error Masking** | Non-operational errors return generic messages in production |
| **Log Redaction** | Pino redacts Authorization headers, passwords, and tokens from logs |
| **Graceful Shutdown** | SIGTERM/SIGINT closes HTTP, Socket.IO, BullMQ, and Redis cleanly |
| **Auto-migration** | `docker-entrypoint.sh` runs `prisma migrate deploy` on every container start |

---

## Known Issues

| Issue | Impact | Fix |
|---|---|---|
| **Mock authentication** | ⚠️ High — passwords are hardcoded in source | Replace with real JWT + bcrypt or Supabase Auth |
| **No auth guards on routes** | ⚠️ High — all API endpoints are publicly accessible | Add `requireAuth` middleware to every route |
| **`approvalRequest` reference** in backup route | 🔴 Crash — `GET /api/backup` will throw a Prisma error | Add `ApprovalRequest` model to schema or remove the reference |
| **Supabase Storage not wired to routes** | ℹ️ Medium — document metadata is saved but no file is uploaded | Connect routes to `storage.service.js` |
| **8-second polling** | ℹ️ Low — creates unnecessary API load | Replace with Socket.IO data broadcast events |

---

## Scripts Reference

### Backend

```bash
npm run dev          # Start dev server with hot-reload (--watch)
npm start            # Start production server
npm run db:migrate   # Create a new Prisma migration (dev)
npm run db:seed      # Run the database seeder
npm run db:generate  # Regenerate Prisma client after schema change
npm test             # Run backend unit tests
```

### Frontend

```bash
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Build for production → dist/
npm run lint         # ESLint check
npm run format       # Prettier format
npm run preview      # Preview production build locally
npm run cypress:open # Open Cypress E2E test runner
```

---

## License

Internal proprietary system — MITCON Credentia, Bengaluru, 2026.  
All rights reserved.
