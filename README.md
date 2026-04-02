# Buddi v2.0 — Student Resilience Infrastructure

> *Not just a chatbot. Student Resilience Infrastructure.*

Buddi is an AI-powered academic companion platform designed for students navigating the pressures of medical school, law school, engineering, and beyond. It combines emotional intelligence, spaced repetition, and community — all in one mobile-first PWA.

---

## Platform Overview

| Layer | What it does |
|-------|-------------|
| **Emotional Support** | Burnout detection, sentiment tracking, protective reminders |
| **Study Support** | Slide upload, AI summarisation, spaced repetition recall |
| **Community** | Study pods, peer support, post-exam coordination |
| **Institutional** | Admin analytics, cohort insights, token cost dashboard |

---

## Tech Stack

### Frontend
- **Next.js 15** (App Router) — PWA, installable, offline-capable
- **TypeScript** + **TailwindCSS** + **Framer Motion**
- **Zustand** (state) + **TanStack Query** (server state)
- **Service Worker** for offline support and push notifications

### Backend
- **NestJS** — modular monolith (Phase 1), extractable to microservices (Phase 2)
- **PostgreSQL** + **pgvector** — structured data + vector embeddings
- **Redis** — caching and queues
- **Prisma** — type-safe ORM

### AI
- **Anthropic Claude Sonnet** (primary) — chat, sentiment, summarisation
- **OpenAI GPT-4o-mini** (fallback) — provider abstraction pattern

### Payments
- **Stripe** — global payments
- **Paystack** — African markets (Nigeria + diaspora)

---

## Project Structure

```
buddi/
├── frontend/          # Next.js 15 PWA
│   ├── app/           # App Router pages
│   ├── components/    # UI components
│   └── lib/           # API clients, stores, hooks
├── backend/           # NestJS modular monolith
│   ├── src/
│   │   ├── modules/   # auth, chat, ai, files, recall, payments, admin...
│   │   ├── common/    # guards, decorators, filters
│   │   └── prisma/    # database service
│   └── prisma/        # schema + migrations
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 16 with pgvector

### 1. Clone and configure

```bash
git clone https://github.com/mybuddiai-lang/MyBuddy.git
cd MyBuddy
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Start infrastructure

```bash
docker-compose up postgres redis -d
```

### 3. Backend setup

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev
```

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Swagger docs: http://localhost:3001/api/docs

---

## API Modules

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Users | `GET/PUT /users/profile`, `GET /users/stats` |
| Chat | `POST /chat/message`, `GET /chat/history` |
| Files | `POST /files/upload`, `GET /files` |
| Recall | `GET /recall/due-cards`, `POST /recall/session/start` |
| Reminders | `GET/POST/PUT/DELETE /reminders` |
| Community | `GET/POST /community/pods` |
| Payments | `POST /payments/stripe/create-session`, `/payments/paystack/initialize` |
| Admin | `GET /admin/dashboard`, `/admin/users`, `/admin/analytics/*` |

---

## Scaling Path

**Phase 1 (current):** Modular monolith — single service, easy to maintain
**Phase 2:** Extract AI service + file processing service first
**Phase 3:** Full microservices with Kafka event bus + Temporal workflows

---

## License

Private — All rights reserved.
