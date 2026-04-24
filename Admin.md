You are a senior product engineer, data platform architect, and security-focused backend engineer tasked with designing and implementing a production-grade Admin Dashboard for Buddi — an AI resilience platform for students.

This dashboard is a critical internal tool used for analytics, monitoring, operations, and decision-making.

The system must be secure, scalable, privacy-compliant, and performant.

---

# SYSTEM ARCHITECTURE CONTEXT

Buddi is structured as:

/buddi
  /frontend        → user-facing app (students)
  /admin           → admin dashboard (internal)
  /backend         → shared API + workers

Domains:
- app.buddi.com → user app
- admin.buddi.com → admin dashboard
- api.buddi.com → backend API

The admin dashboard is a **separate application** that communicates with the backend via secure APIs.

---

# ADMIN ACCESS & SECURITY (CRITICAL)

The admin dashboard must implement strict access control.

### Authentication
- Admin users must authenticate via secure login
- Passwords must be hashed (bcrypt or equivalent)
- Optional: OAuth (Google login with allowlist)

### Authorization (RBAC)
Roles:
- SUPER_ADMIN → full access
- ADMIN → full operational access
- SUPPORT → user lookup only
- ANALYST → read-only analytics

### Backend Enforcement
Every admin API route must verify:

- authenticated user
- role permissions

Example:

if (!user || user.role !== 'ADMIN') → reject request

### Security Rules
- NEVER rely on frontend for protection
- ALL /admin endpoints must be protected
- Implement audit logs for admin actions
- Rate limit admin APIs
- Optional: IP allowlisting

---

# ACCESS FLOW

Admin dashboard is accessible at:

/admin

Flow:
1. User logs in via standard authentication
2. Backend verifies role
3. If role is not ADMIN or higher → redirect to /home
4. If valid → grant access to admin dashboard

---

# CORE DASHBOARD REQUIREMENTS

The dashboard must follow modern SaaS standards (Stripe, Notion, Linear).

---

# 1. USER ANALYTICS

Metrics:
- Total users
- Active users (DAU / WAU / MAU)
- New signups (time series)
- Retention (D1, D7, D30)

Segmentation:
- School
- Department
- Country

Engagement:
- Sessions per user
- Chats per user
- Return rate

---

# 2. MENTAL HEALTH SIGNALS (HIGH PRIORITY)

Metrics:
- PHQ-9 submissions (anonymous)
- GAD-7 submissions (anonymous)
- Score distributions:
  - minimal
  - mild
  - moderate
  - severe

- Distress detected (count and %)
- Repeated distress signals

STRICT PRIVACY RULE:
- No personally identifiable information must be linked to PHQ-9 or GAD-7 scores
- Data must be anonymized at storage or query level

---

# 3. REFERRALS & INTERVENTIONS

Metrics:
- Referrals shown
- Referrals accepted
- Conversion rate

Funnel:
distress → referral shown → referral accepted

Breakdowns:
- by school
- by distress level

---

# 4. MONETIZATION

Metrics:
- Premium users
- Active subscriptions
- MRR (Monthly Recurring Revenue)
- ARPU
- Conversion rate (free → paid)

Events:
- subscription started
- canceled
- payment failure

---

# 5. PROFESSIONAL MANAGEMENT

Features:
- List professionals
- Location
- Availability
- Approval / rejection
- Edit/update details

Metrics:
- Active professionals
- Referral success rate (future-ready)

---

# 6. OPERATIONS PANEL

Real-time tools:

### Live Activity Feed
- user signups
- distress events
- referrals triggered
- payments

### Alerts System
- distress spikes
- drop in engagement
- AI failures
- payment failures

### User Lookup
- search by email/ID
- view:
  - activity timeline
  - sessions
  - referrals
  - subscription status

---

# 7. AI MONITORING

Metrics:
- total AI requests
- latency
- token usage
- cost per user
- failure rate

Alerts:
- high latency
- cost spikes

---

# 8. SYSTEM HEALTH

Metrics:
- API uptime
- error rate
- queue delays
- job failures

---

# 9. REPORTING

Features:
- export CSV
- filtered export
- scheduled reports

---

# UX REQUIREMENTS

- clean, minimal UI
- dashboard metric cards
- charts (line, bar, funnel)
- filters (date, school, region)
- drill-down analytics
- dark mode

---

# PERFORMANCE REQUIREMENTS

- pagination on all tables
- caching for dashboard endpoints
- precomputed analytics via background jobs
- lazy-loaded charts

Target:
- dashboard load < 1 second

---

# DATA ARCHITECTURE

Use PostgreSQL.

Core tables:
- users
- sessions
- subscriptions
- referrals
- professionals

Analytics tables:
- daily_metrics
- distress_events
- revenue_metrics

Use background workers to aggregate data.

---

# AUDIT & LOGGING

Track:
- admin login events
- data access
- role changes
- critical actions

---

# DEPLOYMENT

- admin → Vercel → admin.mybuddyy.com/ or admin.mybuddyy.vercel.app


---

# GOAL

Build a secure, scalable, privacy-first admin dashboard that:
- enables real-time monitoring
- supports operational decisions
- protects sensitive user data
- scales to millions of users
- remains maintainable by a small engineering team