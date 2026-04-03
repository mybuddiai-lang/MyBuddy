# Buddi v2.0 — Deployment & Configuration Guide

> Complete setup reference for deploying Buddi on Railway (backend + frontend) with all external services.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [External Services Needed](#external-services-needed)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Railway Deployment — Step by Step](#railway-deployment--step-by-step)
5. [Google OAuth Setup](#google-oauth-setup)
6. [Email (Gmail / SendGrid)](#email-gmail--sendgrid)
7. [AWS S3 File Storage](#aws-s3-file-storage)
8. [Stripe Payments](#stripe-payments)
9. [Paystack Payments](#paystack-payments)
10. [Push Notifications (VAPID)](#push-notifications-vapid)
11. [Local Development](#local-development)
12. [Post-Deploy Checklist](#post-deploy-checklist)

---

## Architecture Overview

```
Railway Project
├── Backend Service     (NestJS)      → backend/Dockerfile
├── Frontend Service    (Next.js PWA) → frontend/Dockerfile
├── PostgreSQL Plugin   (managed DB)
└── Redis Plugin        (managed cache)
```

The backend auto-runs `prisma migrate deploy` on every startup — no manual migration needed.

---

## External Services Needed

| Service | Required | Purpose |
|---|---|---|
| Railway PostgreSQL | ✅ Yes | Main database |
| Railway Redis | ✅ Yes | Caching, queues (degrades gracefully if absent) |
| OpenAI | ✅ Yes | AI chat, sentiment analysis, slide summarisation |
| SMTP / Gmail | ✅ Yes | Welcome emails, password reset |
| AWS S3 | ⚡ Recommended | Slide/file uploads (stores locally if absent) |
| Google OAuth | ⚡ Recommended | "Sign in with Google" |
| Stripe | ⚡ Recommended | Global subscription payments |
| Paystack | ⚡ Recommended | Nigerian / African payments |
| VAPID Keys | ⚡ Recommended | Browser push notifications |
| Anthropic Claude | ❌ Optional | Future AI provider switch |

---

## Environment Variables Reference

### Backend Service Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | ✅ | Runtime environment | `production` |
| `PORT` | ✅ | Server port | `3001` |
| `DATABASE_URL` | ✅ | PostgreSQL connection string | Auto-injected by Railway |
| `REDIS_URL` | ✅ | Redis connection string | Auto-injected by Railway |
| `JWT_SECRET` | ✅ | Access token signing secret (64+ chars) | `a3f9...` |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing secret (64+ chars) | `b7d2...` |
| `FRONTEND_URL` | ✅ | Frontend URL for CORS + redirects | `https://buddi.up.railway.app` |
| `OPENAI_API_KEY` | ✅ | OpenAI API key | `sk-...` |
| `OPENAI_MODEL` | ❌ | OpenAI model override | `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic API key (optional) | `sk-ant-...` |
| `SMTP_HOST` | ✅ | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | ✅ | SMTP port | `587` |
| `SMTP_USER` | ✅ | SMTP username / email | `you@gmail.com` |
| `SMTP_PASS` | ✅ | SMTP password / app password | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | ✅ | Sender address shown to users | `noreply@buddi.app` |
| `GOOGLE_CLIENT_ID` | ⚡ | Google OAuth client ID | `123...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ⚡ | Google OAuth client secret | `GOCSPX-...` |
| `GOOGLE_CALLBACK_URL` | ⚡ | Google OAuth redirect URI | `https://api.buddi.up.railway.app/api/auth/google/callback` |
| `AWS_ACCESS_KEY_ID` | ⚡ | AWS IAM access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | ⚡ | AWS IAM secret key | `...` |
| `AWS_REGION` | ⚡ | S3 bucket region | `us-east-1` |
| `AWS_S3_BUCKET` | ⚡ | S3 bucket name | `buddi-uploads` |
| `STRIPE_SECRET_KEY` | ⚡ | Stripe secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ⚡ | Stripe webhook signing secret | `whsec_...` |
| `PAYSTACK_SECRET_KEY` | ⚡ | Paystack secret key | `sk_live_...` |
| `PAYSTACK_PUBLIC_KEY` | ⚡ | Paystack public key | `pk_live_...` |
| `VAPID_PUBLIC_KEY` | ⚡ | VAPID public key for web push | `BOLPwTY...` |
| `VAPID_PRIVATE_KEY` | ⚡ | VAPID private key for web push | `y6hXqZ3...` |
| `VAPID_SUBJECT` | ⚡ | VAPID contact email | `mailto:support@buddi.app` |

### Frontend Service Variables (Build-time)

> ⚠️ These must be set as **Build Variables** in Railway — Next.js bakes them into the bundle at build time.

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL | `https://api.buddi.up.railway.app/api` |
| `NEXT_PUBLIC_APP_NAME` | ❌ | App display name | `Buddi` |

---

## Railway Deployment — Step by Step

### Step 1 — Create the project

1. Go to [railway.app](https://railway.app) and log in
2. Click **New Project** → **Empty Project**
3. Name it `Buddi`

---

### Step 2 — Add PostgreSQL

1. Inside the project, click **+ New** → **Database** → **Add PostgreSQL**
2. Railway provisions the database and auto-sets `DATABASE_URL` on all services in the project

---

### Step 3 — Add Redis

1. Click **+ New** → **Database** → **Add Redis**
2. Railway auto-sets `REDIS_URL` on all services in the project

---

### Step 4 — Deploy the Backend

1. Click **+ New** → **GitHub Repo** → select `mybuddiai-lang/MyBuddy`
2. In service settings:
   - **Root Directory:** `backend`
   - Railway will detect the `railway.toml` and use the Dockerfile automatically
3. Go to **Variables** tab and add:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=<generate below>
JWT_REFRESH_SECRET=<generate below>
FRONTEND_URL=https://<your-frontend-url>.up.railway.app
OPENAI_API_KEY=sk-...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=noreply@buddi.app
VAPID_PUBLIC_KEY=BOLPwTYehtfuaw187W4hIZa9RlWGtQv8Xqq40eKnn2s9xLP0fFWQRRDZVzpOMPa_42VPKMyWH1ZyJqPIKaWuj00
VAPID_PRIVATE_KEY=y6hXqZ3ldCwPTpkmmb_PFPsNuOsyDXv7C6tPb6lXoZY
VAPID_SUBJECT=mailto:support@buddi.app
```

**Generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run twice — use each output for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

4. Click **Deploy** — the backend will build, run migrations, and start

---

### Step 5 — Deploy the Frontend

1. Click **+ New** → **GitHub Repo** → select `mybuddiai-lang/MyBuddy`
2. In service settings:
   - **Root Directory:** `frontend`
3. Go to **Variables** tab and add these as **Build Variables**:

```
NEXT_PUBLIC_API_URL=https://<your-backend-url>.up.railway.app/api
NEXT_PUBLIC_APP_NAME=Buddi
```

4. Click **Deploy**

---

### Step 6 — Wire the URLs

Once both services are live and have Railway-assigned URLs:

1. Copy your **frontend URL** (e.g. `https://buddi-frontend.up.railway.app`)
2. Go to your **backend service** → Variables → update `FRONTEND_URL` to this URL
3. Redeploy the backend

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add Authorised redirect URIs:
   ```
   http://localhost:3001/api/auth/google/callback
   https://<your-backend>.up.railway.app/api/auth/google/callback
   ```
7. Copy **Client ID** and **Client Secret**
8. Add to backend Railway Variables:
   ```
   GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   GOOGLE_CALLBACK_URL=https://<your-backend>.up.railway.app/api/auth/google/callback
   ```

---

## Email (Gmail / SendGrid)

### Option A — Gmail (quickest)

1. Enable 2-Factor Authentication on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate an App Password for "Mail"
4. Add to backend Variables:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   SMTP_FROM=you@gmail.com
   ```

### Option B — SendGrid (recommended for production)

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Go to **Settings** → **API Keys** → **Create API Key** (Full Access)
3. Add to backend Variables:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.<your-api-key>
   SMTP_FROM=noreply@yourdomain.com
   ```
4. Verify your sender domain in SendGrid for best deliverability

---

## AWS S3 File Storage

> Without S3, file uploads still work — files are stored on the container's local disk and lost on redeploy. Set up S3 for persistent file storage.

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Go to **S3** → **Create bucket**
   - Name: `buddi-uploads`
   - Region: `us-east-1` (or your preferred region)
   - Uncheck "Block all public access" (files need to be readable)
3. Go to **IAM** → **Users** → **Create user**
   - Attach policy: **AmazonS3FullAccess** (or a scoped policy for just this bucket)
4. Create **Access Key** for the user
5. Add to backend Variables:
   ```
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=buddi-uploads
   ```

---

## Stripe Payments

1. Create account at [stripe.com](https://stripe.com)
2. Go to **Developers** → **API Keys**
3. Copy **Secret key** (`sk_live_...` for production, `sk_test_...` for testing)
4. Set up a Webhook:
   - Go to **Developers** → **Webhooks** → **Add endpoint**
   - URL: `https://<your-backend>.up.railway.app/api/payments/stripe/webhook`
   - Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_...`)
5. Add to backend Variables:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Paystack Payments

1. Create account at [paystack.com](https://paystack.com)
2. Go to **Settings** → **API Keys & Webhooks**
3. Copy **Secret Key** and **Public Key**
4. Add Webhook URL: `https://<your-backend>.up.railway.app/api/payments/paystack/webhook`
5. Add to backend Variables:
   ```
   PAYSTACK_SECRET_KEY=sk_live_...
   PAYSTACK_PUBLIC_KEY=pk_live_...
   ```

---

## Push Notifications (VAPID)

VAPID keys are pre-generated and included in `.env.example`. Use these or regenerate your own:

```bash
cd backend
node -e "const w = require('web-push'); const k = w.generateVAPIDKeys(); console.log(JSON.stringify(k, null, 2));"
```

Add to backend Variables:
```
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:support@buddi.app
```

> The public key is also used by the frontend service worker. It is read from the backend `/api/notifications/vapid-public-key` endpoint at runtime — no extra frontend config needed.

---

## Local Development

```bash
# 1. Clone the repo
git clone https://github.com/mybuddiai-lang/MyBuddy.git
cd MyBuddy

# 2. Copy and fill in env vars
cp .env.example .env
cp .env.example backend/.env
# Edit backend/.env with your local/test keys

# 3. Start Postgres + Redis via Docker
docker compose up -d postgres redis

# 4. Run DB migrations
cd backend && npx prisma migrate dev

# 5. Start backend (port 3001)
cd backend && npm run start:dev

# 6. Start frontend (port 3000)
cd frontend && npm run dev
```

**Local `.env` minimum (backend):**
```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://buddi:buddi_dev_password@localhost:5432/buddi_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-dev-secret-change-in-production
JWT_REFRESH_SECRET=local-dev-refresh-secret
OPENAI_API_KEY=sk-...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
SMTP_FROM=your@gmail.com
VAPID_PUBLIC_KEY=BOLPwTYehtfuaw187W4hIZa9RlWGtQv8Xqq40eKnn2s9xLP0fFWQRRDZVzpOMPa_42VPKMyWH1ZyJqPIKaWuj00
VAPID_PRIVATE_KEY=y6hXqZ3ldCwPTpkmmb_PFPsNuOsyDXv7C6tPb6lXoZY
VAPID_SUBJECT=mailto:support@buddi.app
```

**Local `.env.local` (frontend):**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Buddi
```

---

## Post-Deploy Checklist

After both Railway services are live, verify the following:

- [ ] `https://<backend>/api/health` returns `{ status: "ok" }`
- [ ] Register with email/password at `https://<frontend>/signup`
- [ ] Log in with email/password at `https://<frontend>/login`
- [ ] "Sign in with Google" redirects and returns to the app (if Google OAuth configured)
- [ ] Welcome email arrives in inbox after registration (check spam)
- [ ] Upload a PDF slide on the Slides page — processes to DONE status
- [ ] Chat page sends a message and Buddi responds
- [ ] Recall page shows flashcards after a slide is processed
- [ ] Push notification permission prompt appears on first visit
- [ ] `/admin` dashboard loads (requires an account with `role: ADMIN` in DB)

**Promote an account to Admin:**
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```
Run via Railway's PostgreSQL console or Prisma Studio (`npx prisma studio` locally).
