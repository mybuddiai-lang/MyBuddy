# BUDDI V2.0 — PRINCIPAL ENGINEERING MASTER PROMPT

DO NOT LIST CLAUDE AS A CONTRIBUTOR OR ADD ANY CLAUDE RELATED INFO TO THE REPO

**Production-Grade Scalable Platform Build Specification**

Use this as your **master engineering prompt / product specification prompt** for your full-stack team, AI engineers, product designers, and DevOps team.

---

## SYSTEM ROLE

You are a **world-class principal engineer, staff product architect, AI systems engineer, and senior design lead** tasked with building **Buddi v2.0**, a production-grade, globally scalable AI resilience platform for students.

This is NOT just a chatbot.

This is a **multi-tenant AI companion platform** designed for:

* Medical students
* Law students
* Engineering students
* Art students
* Professional certification candidates
* University cohorts
* Learning communities

The system must scale to **millions of users, messages, files, reminders, and AI inference events**.

Every engineering decision must optimize for:

* scale
* speed
* resilience
* emotional intelligence
* monetization
* offline-first mobile usage
* low-bandwidth environments
* multi-region deployment

---

## PRODUCT VISION

Buddi is an **AI Resilience Companion + Intelligent Academic Support Platform**.

It combines:

1. **Emotional Support Layer** — burnout detection, stress response, protective reminders
2. **Study Support Layer** — slide memory, micro recall, spaced repetition
3. **Cohort Social Layer** — peer coordination, group support, post-exam plans
4. **Institutional Layer** — admin analytics, cohort insights, school partnerships

---

## FRONTEND (PWA-FIRST MOBILE WEB APP)

### Stack

* Next.js 15 (App Router)
* TypeScript
* TailwindCSS
* Framer Motion
* React Query / TanStack Query
* Zustand
* Service Workers
* IndexedDB / localForage
* Web Push
* Installable PWA

### UX REQUIREMENTS

* mobile-first
* minimalistic modern UI
* soft neutral palette
* premium academic aesthetic
* thumb-first navigation
* bottom tabs
* offline support
* optimized for low internet areas

### Core Navigation

* Home
* Buddi Chat
* Slides
* Recall
* Community
* Profile

---

## BACKEND (MICROSERVICES)

### Recommended Stack

* **FastAPI** for AI and processing services
* **NestJS / Node.js** for platform APIs
* **Kafka** for messaging
* **Temporal** for workflow orchestration
* **PostgreSQL + pgvector**
* **Redis** caching and queues

### Services

1. Auth Service
2. User Profile Service
3. Chat Service
4. AI Orchestration Service
5. Reminder Engine
6. File Processing Service
7. Vector Memory Service
8. Analytics Event Pipeline
9. Payment Service
10. Admin Monitoring Service

---

## AI SYSTEM ARCHITECTURE

### AI Provider Abstraction

Support:

* OpenAI
* Anthropic
* future local models
* niche-specific model routing

Example interface:

```ts
interface AIProvider {
  sendMessage()
  analyzeSentiment()
  summarizeSlides()
  extractHighYieldFacts()
}
```

### AI Logic Layers

* Sentiment Governor
* Burnout Detector
* Companion Mode
* Study Recall Engine
* Adaptive Reminder Difficulty
* Slang / Niche Language Layer

This must support future domain personalities:

* Med school
* Law school
* Engineering
* Arts
* General students

---

## FILE PROCESSING

Support:

* PDFs
* handwritten notes images
* screenshots
* voice notes

### Pipeline

Upload → OCR → Chunking → Embeddings → Fact Extraction → Reminder Scheduling

Tools:

* AWS Textract / Google Vision
* PyMuPDF
* Tesseract fallback

---

## DATABASE SCHEMA

### Users

```sql
users (
  id UUID PRIMARY KEY,
  whatsapp_number TEXT,
  email TEXT,
  name TEXT,
  school TEXT,
  department TEXT,
  specialization TEXT,
  exam_date TIMESTAMP,
  subscription_tier TEXT,
  sentiment_baseline FLOAT,
  created_at TIMESTAMP
)
```

### Notes

```sql
notes (
  id UUID PRIMARY KEY,
  user_id UUID,
  summary TEXT,
  vector_id TEXT,
  mastery_level INT,
  created_at TIMESTAMP
)
```

### Messages

```sql
chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID,
  role TEXT,
  message TEXT,
  sentiment_score FLOAT,
  created_at TIMESTAMP
)
```

### Reminders

```sql
reminders (
  id UUID PRIMARY KEY,
  user_id UUID,
  note_id UUID,
  scheduled_for TIMESTAMP,
  difficulty_level INT,
  status TEXT
)
```

---

## ADMIN DASHBOARD

Must capture **every activity**.

### Features

* user analytics
* DAU / WAU / MAU
* cohort retention
* churn tracking
* AI token cost dashboard
* sentiment risk alerts
* failed reminders
* slide upload metrics
* payment analytics
* user activity timeline
* real-time message monitoring

### Institution Dashboard

* anonymous stress heatmaps
* exam pressure trends
* cohort activity insights

---

## PAYMENTS

Integrate both:

* **Stripe** for global payments
* **Paystack** for Nigerian and African payments

### Billing Plans

* free tier
* premium monthly
* annual plan
* school cohort plans
* institutional licensing

### Premium Features

* unlimited reminders
* AI memory vault
* consultant-level recall mode
* voice note summaries
* community study pods
* exam recovery mode

---

## INFRASTRUCTURE

### Cloud

AWS preferred:

* ECS / Kubernetes
* RDS PostgreSQL
* Redis / ElastiCache
* S3
* CloudFront
* Lambda

### Observability

* Prometheus
* Grafana
* Sentry
* OpenTelemetry

### Security

* encryption at rest
* TLS
* audit logs
* role-based access
* GDPR + NDPR compliance

---

## MONETIZATION FEATURES

Additional payable features:

* resilience score
* study streaks
* sponsor mode (guardian pays)
* class leaderboard
* premium community pods
* institutional licensing
* cohort subscription bundles

---

## PRODUCT POSITIONING

Do NOT position as a chatbot.

Position as:

> **Student Resilience Infrastructure**

This strengthens B2C and B2B sales.

---

## SCALABLE-BY-DESIGN ENGINEERING STRATEGY

Build the platform for **hundreds of active users initially**, while ensuring the architecture is intentionally designed for **frictionless scaling to millions** without expensive rewrites.

### Phase 1: Lean and Maintainable Foundation (0–1,000 users)

Prioritize simplicity, speed of development, and maintainability.

Recommended stack for MVP and early production:

* **Next.js PWA frontend**
* **Single backend service using FastAPI or NestJS**
* **PostgreSQL (Supabase)**
* **Redis for caching and lightweight queues**
* **pgvector for embeddings and memory retrieval**
* **Stripe + Paystack**
* **S3-compatible storage for slides and media**

At this stage, avoid premature microservices.

Use a **modular monolith architecture** with clear domain boundaries:

* auth module
* users module
* chat module
* ai orchestration module
* reminders module
* admin analytics module
* payments module

This ensures fast shipping with low operational stress.

### Phase 2: Scale-Ready Architecture

The codebase must be structured so each module can later be extracted into independent services with minimal refactor.

Key principles:

* domain-driven folder structure
* repository pattern
* service layer abstraction
* provider abstraction for AI models
* event-driven internal architecture

Example:

```ts
/modules
  /auth
  /chat
  /ai
  /reminders
  /payments
  /analytics
```

### Performance Strategy

Design for hundreds now, but optimize the following from day one:

* database indexing
* pagination
* lazy loading
* query optimization
* background job processing
* API response caching
* image and PDF compression

### Stress-Free Scaling Path

Scaling should happen in layers:

**Layer 1:** Vertical scaling

* increase instance resources
* optimize DB queries
* improve Redis caching

**Layer 2:** Horizontal scaling

* multiple app instances
* load balancer
* managed database replicas

**Layer 3:** Service extraction
Split heavy modules first:

* AI service
* OCR/file processing
* analytics
* reminder engine

### Maintainability Rules

* keep business logic separated from controllers
* use typed interfaces everywhere
* enforce testing on core modules
* use feature flags for new releases
* maintain audit logging for admin visibility

### Engineering Goal

The platform must feel lightweight and easy to maintain for a small team today, while remaining structurally prepared to scale massively tomorrow without operational stress.




deploy to github repo with my details nonsodaniel07@gmail.com nonsodaniel to https://github.com/mybuddiai-lang/MyBuddy.git

DO NOT LIST CLAUDE AS A CONTRIBUTOR OR ADD ANY CLAUDE RELATED INFO TO THE REPO

For deployment, I was invited to this project and my contributions should reflect me not claude or any other collaborator.