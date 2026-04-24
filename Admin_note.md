# Admin Dashboard — Implementation Notes

## Overview

A standalone admin dashboard built as a separate Next.js 16 app at `/admin`, backed by a dedicated admin module in the NestJS backend. It provides full platform visibility, user management, real-time monitoring, and role-based access control.

---

## Architecture

```
/admin              → Standalone Next.js 16.2.2 app (separate deployment)
/backend/src/modules/admin   → NestJS admin module (API endpoints)
```

- **Admin app URL**: Deploy to `admin.mybuddyy.vercel.app` (separate Vercel project)
- **Backend API**: All admin endpoints at `/api/admin/*` on Railway
- **Auth**: JWT stored in `localStorage('admin_token')`, cookie `admin_token=1` used by proxy middleware for route protection

---

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| `SUPER_ADMIN` | Full access — can create admins, delete users, change roles |
| `ADMIN` | Full access except creating SUPER_ADMIN or deleting — can block/unblock |
| `ANALYST` | Read-only access to analytics and dashboard |
| `SUPPORT` | User lookup only |

Roles are stored in the `users` table (`UserRole` enum in Prisma schema) and embedded in the JWT payload. Backend enforces all role checks via `RolesGuard` + `@Roles()` decorator — frontend role checks are UI-only convenience.

**Bootstrap**: Manually set `role = 'SUPER_ADMIN'` in the DB for the first admin user to gain access.

---

## Backend Changes

### Schema (`backend/prisma/schema.prisma`)

```prisma
enum UserRole {
  USER
  SUPPORT
  ANALYST
  ADMIN
  SUPER_ADMIN
}

model User {
  // ...existing fields...
  role      UserRole @default(USER)
  country   String?
  isBlocked Boolean  @default(false)
}

model AuditLog {
  id        String   @id @default(uuid())
  adminId   String
  action    String
  target    String?
  detail    String?
  createdAt DateTime @default(now())

  @@index([adminId, createdAt])
}

model Professional {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  specialty   String
  location    String?
  available   Boolean  @default(true)
  approved    Boolean  @default(false)
  bio         String?
  createdAt   DateTime @default(now())
}
```

### Migrations

| Migration | Description |
|-----------|-------------|
| `20260424120000_readd_role_add_professional_audit` | Adds `UserRole` enum, `role` column, creates `professionals` and `audit_logs` tables |
| `20260424130000_add_isblocked` | Adds `isBlocked BOOLEAN DEFAULT false` to users + index |

### Admin Module (`backend/src/modules/admin/`)

**`admin.service.ts`** — key methods:

| Method | Description |
|--------|-------------|
| `getDashboard()` | Total users, DAU/WAU/MAU, premium count, MRR estimate, distress alert count |
| `getSignupTrend(days)` | Day-by-day new user counts for the last N days |
| `getCountryStats()` | `groupBy country` aggregation, sorted by count desc |
| `getUsers(page, limit, search)` | Paginated user list with isBlocked, country, role |
| `getUserDetail(id)` | Full user record including isBlocked, recent activity |
| `updateUserRole(id, role, adminId)` | Changes user role + writes AuditLog |
| `blockUser(id, adminId)` | Sets `isBlocked=true` + AuditLog + analytics event |
| `unblockUser(id, adminId)` | Sets `isBlocked=false` + AuditLog |
| `deleteUser(id, adminId)` | AuditLog then `prisma.user.delete` (cascades all relations) |
| `listAdmins()` | All users with role not USER (ADMIN/SUPER_ADMIN/SUPPORT/ANALYST) |
| `createAdmin(dto, adminId)` | bcrypt hashes password, validates role (no SUPER_ADMIN creation), creates user + profile + AuditLog |
| `getMentalHealthStats()` | Distress event counts, sentiment trend |
| `getReferralStats()` | Referral shown/accepted counts |
| `getMonetizationStats()` | Subscription tier breakdown, revenue estimates |
| `getProfessionals()` | List all professionals |
| `createProfessional(dto)` | Add new professional |
| `updateProfessional(id, dto)` | Update professional |
| `deleteProfessional(id)` | Remove professional |
| `getActivityFeed(limit)` | Recent analytics events with user info |
| `lookupUser(query)` | Find user by email or ID |
| `getAiStats()` | AI call counts, error rates, token estimates |
| `getSystemHealth()` | DB/Redis/AI service health checks |
| `exportData(type)` | CSV export for users/messages/events |

**`admin.controller.ts`** — all endpoints:

```
GET    /admin/dashboard                  @Roles(ADMIN, SUPER_ADMIN, ANALYST)
GET    /admin/dashboard/signup-trend     @Roles(ADMIN, SUPER_ADMIN, ANALYST)
GET    /admin/analytics/countries        @Roles(ADMIN, SUPER_ADMIN, ANALYST)
GET    /admin/users                      @Roles(ADMIN, SUPER_ADMIN, SUPPORT)
GET    /admin/users/:id                  @Roles(ADMIN, SUPER_ADMIN, SUPPORT)
PATCH  /admin/users/:id/role             @Roles(ADMIN, SUPER_ADMIN)
POST   /admin/users/:id/block            @Roles(ADMIN, SUPER_ADMIN)
POST   /admin/users/:id/unblock          @Roles(ADMIN, SUPER_ADMIN)
DELETE /admin/users/:id                  @Roles(SUPER_ADMIN)
GET    /admin/admins                     @Roles(ADMIN, SUPER_ADMIN)
POST   /admin/admins                     @Roles(SUPER_ADMIN)
GET    /admin/mental-health              @Roles(ADMIN, SUPER_ADMIN, ANALYST)
GET    /admin/referrals                  @Roles(ADMIN, SUPER_ADMIN, ANALYST)
GET    /admin/monetization               @Roles(ADMIN, SUPER_ADMIN, ANALYST)
GET    /admin/professionals              @Roles(ADMIN, SUPER_ADMIN)
POST   /admin/professionals              @Roles(ADMIN, SUPER_ADMIN)
PATCH  /admin/professionals/:id          @Roles(ADMIN, SUPER_ADMIN)
DELETE /admin/professionals/:id          @Roles(ADMIN, SUPER_ADMIN)
GET    /admin/operations/activity        @Roles(ADMIN, SUPER_ADMIN)
GET    /admin/operations/lookup          @Roles(ADMIN, SUPER_ADMIN, SUPPORT)
GET    /admin/ai/stats                   @Roles(ADMIN, SUPER_ADMIN, ANALYST)
GET    /admin/system/health              @Roles(ADMIN, SUPER_ADMIN)
GET    /admin/reports/export             @Roles(ADMIN, SUPER_ADMIN)
```

### Auth Service (`backend/src/modules/auth/auth.service.ts`)

Two changes:
1. `generateTokens()` now embeds `role` in JWT payload so admin app can read role from token
2. `login()` rejects blocked users before issuing tokens:
   ```ts
   if (user.isBlocked) throw new UnauthorizedException('Account has been suspended');
   ```

### RBAC Guards (`backend/src/common/`)

- `guards/roles.guard.ts` — `RolesGuard` reads `@Roles()` metadata from handler/class, checks `req.user.role`; throws `403 Forbidden` if insufficient
- `decorators/roles.decorator.ts` — `@Roles('ADMIN', 'SUPER_ADMIN')` decorator using `SetMetadata`

---

## Frontend Admin App (`/admin`)

### Stack

- Next.js 16.2.2 (App Router, Turbopack)
- TypeScript, Tailwind CSS (dark mode via `class`)
- TanStack Query v5 (data fetching + real-time polling)
- Recharts (line, bar charts)
- lucide-react (icons)
- date-fns (formatting)
- axios (HTTP client)

### File Structure

```
admin/
├── app/
│   ├── layout.tsx              # Root layout with QueryClientProvider
│   ├── page.tsx                # Redirect to /dashboard
│   ├── login/
│   │   └── page.tsx            # Login form (email + password)
│   └── dashboard/
│       ├── layout.tsx          # Shell: sidebar + header, mobile state
│       ├── page.tsx            # Overview — KPI cards, charts
│       ├── admins/page.tsx     # Admin user management
│       ├── users/page.tsx      # Platform user list + actions
│       ├── operations/page.tsx # Live activity feed + user lookup
│       ├── mental-health/page.tsx
│       ├── referrals/page.tsx
│       ├── monetization/page.tsx
│       ├── professionals/page.tsx
│       ├── ai-monitoring/page.tsx
│       ├── system/page.tsx
│       └── reports/page.tsx
├── components/
│   ├── Sidebar.tsx             # Nav sidebar (mobile overlay + desktop static)
│   ├── Header.tsx              # Top bar (hamburger on mobile, role badge + user)
│   ├── MetricCard.tsx          # KPI card component
│   ├── SimpleChart.tsx         # SimpleLineChart + SimpleBarChart wrappers
│   ├── DataTable.tsx           # Generic sortable table
│   └── PageHeader.tsx          # Page title + description + action slot
├── lib/
│   ├── api.ts                  # All API call functions
│   ├── auth.ts                 # getUser(), setToken(), clearToken()
│   └── types.ts                # TypeScript interfaces
└── proxy.ts                    # Next.js 16 middleware (renamed from middleware.ts)
```

### Key Components

**`proxy.ts`** — route protection middleware:
- Public: `/login`
- All other routes require `admin_token` cookie; redirect to `/login` if missing
- Note: Next.js 16 uses `proxy.ts` (not `middleware.ts`), export must be named `proxy`

**`lib/auth.ts`**:
- `setToken(token)` — stores JWT in `localStorage('admin_token')` + sets cookie `admin_token=1`
- `clearToken()` — removes both
- `getUser()` — decodes JWT payload, returns `AdminUser | null`

**`lib/api.ts`** — API namespaces:
```ts
dashboardApi   → overview, getSignupTrend
analyticsApi   → countries
usersApi       → list, get, updateRole, block, unblock, delete
adminsApi      → list, create
mentalHealthApi, referralsApi, monetizationApi
professionalsApi, operationsApi, aiApi, systemApi, reportsApi
```

### Dashboard Pages

| Page | Path | Real-time Interval |
|------|------|--------------------|
| Overview | `/dashboard` | 15s (overview), 60s (countries/trend) |
| Users | `/dashboard/users` | 15s |
| Operations | `/dashboard/operations` | 5s (activity feed) |
| Admin Users | `/dashboard/admins` | 30s |
| System Health | `/dashboard/system` | 30s |
| AI Monitoring | `/dashboard/ai-monitoring` | 60s |
| All others | various | 60s |

### User Actions (Users Page)

All actions are in a detail modal opened by clicking any row:

| Action | Role Required | Confirmation |
|--------|--------------|--------------|
| Change Role | ADMIN+ | Dropdown select |
| Block User | ADMIN+ | Confirm dialog |
| Unblock User | ADMIN+ | One click |
| Delete User | SUPER_ADMIN only | Must type user's email verbatim |

Blocked users show a red "Blocked" badge in the table and an "Account Blocked" banner in the modal. Blocked rows are dimmed (`opacity-60`).

### Admin Users Page (`/dashboard/admins`)

- Lists all non-USER role accounts (ADMIN, SUPER_ADMIN, SUPPORT, ANALYST)
- Shows: name, email, role badge, last active, joined date
- "Invite Admin" button visible only to SUPER_ADMIN
- Create modal: Full Name, Email, Temporary Password (min 8 chars), Role dropdown
- Role dropdown options: ADMIN, SUPPORT, ANALYST (cannot create SUPER_ADMIN via UI)

### Mobile Responsiveness

- `lg` breakpoint (1024px) is the desktop/mobile boundary
- **Desktop (`lg+`)**: Sidebar always visible as static `w-64` left panel
- **Mobile (`< lg`)**: Sidebar hidden by default; hamburger in header toggles it
- Mobile sidebar slides in as a fixed overlay with `z-50`; backdrop `z-40` closes it on tap
- Header: hamburger left, role badge hidden on `sm`, user name hidden on `sm`
- Layouts use `grid-cols-2 xl:grid-cols-4` for KPI cards, stack to 1 col on mobile

---

## Deployment

### How it all connects

```
GitHub (main branch)
    │
    ├──▶ Railway (auto-deploy on push)
    │        └─ Dockerfile build → entrypoint.js → prisma migrate deploy → nest start
    │
    └──▶ Vercel project: "frontend"   (mybuddyy.vercel.app)     ← already live
         Vercel project: "admin"      (admin.mybuddyy.vercel.app) ← NEW, create this
```

---

### Step 1 — Commit and push all backend + admin changes

All backend changes and the entire `/admin` app are currently uncommitted. Run these commands in order:

```bash
cd /Users/nonso/Desktop/buddy

# Stage every changed/new/deleted file
git add \
  backend/package.json \
  backend/pnpm-lock.yaml \
  backend/prisma/schema.prisma \
  backend/prisma/migrations/20260424000000_add_country_isblocked/ \
  backend/prisma/migrations/20260424110000_remove_admin/ \
  backend/prisma/migrations/20260424120000_readd_role_add_professional_audit/ \
  backend/prisma/migrations/20260424130000_add_isblocked/ \
  backend/src/app.module.ts \
  backend/src/common/decorators/roles.decorator.ts \
  backend/src/common/guards/roles.guard.ts \
  backend/src/modules/admin/admin.controller.ts \
  backend/src/modules/admin/admin.service.ts \
  backend/src/modules/analytics/analytics.service.ts \
  backend/src/modules/auth/auth.service.ts \
  frontend/app/\(admin\)/ \
  admin/ \
  Admin_note.md

git commit -m "feat: standalone admin dashboard with RBAC, user actions, country analytics"

git push origin main
```

> Railway watches the `main` branch and auto-redeploys. The `entrypoint.js` script already runs `npx prisma migrate deploy` at startup, so all 4 pending migrations apply automatically in the correct order with no extra config needed.

**What the migrations do on Railway (in order):**

| Migration | Effect |
|-----------|--------|
| `20260424000000_add_country_isblocked` | Adds `country` and `isBlocked` columns to users |
| `20260424110000_remove_admin` | Drops old `role`/`isBlocked` + `UserRole` enum + `admin_alerts` table |
| `20260424120000_readd_role_add_professional_audit` | Re-adds `UserRole` enum + `role` column, creates `professionals` + `audit_logs` tables |
| `20260424130000_add_isblocked` | Re-adds `isBlocked` column + index after it was dropped by migration 110000 |

No env var changes required on Railway — `DATABASE_URL` and all other vars are already set.

---

### Step 2 — Create the Admin Vercel project

The admin app is a completely separate Next.js project. It needs its own Vercel deployment.

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the same GitHub repo (`mybuddiai-lang/MyBuddy`)
3. On the "Configure Project" screen set:

   | Field | Value |
   |-------|-------|
   | **Project Name** | `buddi-admin` |
   | **Root Directory** | `admin` |
   | **Framework Preset** | Next.js (auto-detected) |
   | **Build Command** | `pnpm build` |
   | **Install Command** | `pnpm install` |

4. Under **Environment Variables**, add:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_API_URL` | `https://mybuddy-production-2ad0.up.railway.app/api` | Production, Preview, Development |

   > This is already in `admin/.env.production` so it will also be picked up during build automatically, but setting it explicitly in the Vercel dashboard is good practice.

5. Click **Deploy**.

6. After the first deploy succeeds, go to **Settings → Domains** and add:
   ```
   admin.mybuddyy.vercel.app
   ```
   (or set a custom domain if you have one)

---

### Step 3 — Bootstrap the first SUPER_ADMIN

The admin app requires a user with `role = 'SUPER_ADMIN'` to log in. No such user exists in production yet. Do this **after** Step 1's Railway deploy is live (migrations must have run first).

**Option A — Railway's Prisma Studio (easiest, no SQL)**

1. In Railway dashboard, open the backend service → **Deploy** tab
2. Click **Open Shell** (or use Railway CLI: `railway run npx prisma studio`)
3. Prisma Studio opens in your browser
4. Go to `users` table → find your user row → change `role` to `SUPER_ADMIN` → Save

**Option B — Railway shell with SQL**

```bash
# In Railway → backend service → Shell tab:
npx prisma db execute --stdin <<'SQL'
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your@email.com';
SQL
```

**Option C — Local machine pointed at production DB**

```bash
cd /Users/nonso/Desktop/buddy/backend

# Temporarily set DATABASE_URL to the Railway production URL, then:
DATABASE_URL="<railway-postgres-url>" npx prisma db execute --stdin <<'SQL'
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your@email.com';
SQL
```

> Replace `your@email.com` with the email address you will use to log into the admin dashboard.

---

### Step 4 — Verify the deployment

Run through this checklist after everything is live:

- [ ] `https://mybuddy-production-2ad0.up.railway.app/api/health` returns `200 OK`
- [ ] Railway deploy logs show `[entrypoint] Migrations OK` (not a migration error)
- [ ] `admin.mybuddyy.vercel.app/login` loads without errors
- [ ] Log in with the SUPER_ADMIN user → lands on `/dashboard`
- [ ] Dashboard KPI cards show real numbers (not `—`)
- [ ] Users page loads and shows the user list
- [ ] Try blocking a user → verify they get `401` if they try to log in on the main app
- [ ] Try creating a new ADMIN user from `/dashboard/admins` → new user can log in
- [ ] Open on a phone/narrow browser → hamburger appears, sidebar slides in/out

---

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Railway deploy fails at migration step | Migration conflict (column already exists) | Check Railway deploy logs; if `column already exists`, the migration ran before — safe to ignore if app starts |
| Admin login returns `401 Unauthorized` | User's `role` is still `USER` | Run the bootstrap SQL in Step 3 |
| Admin login returns `403 Forbidden` | JWT role not embedded in token | Ensure the Railway deploy completed after auth.service.ts changes |
| Vercel build fails: `Cannot find module '@/lib/api'` | Vercel root directory set to repo root, not `admin/` | Go to Vercel project Settings → General → Root Directory → change to `admin` |
| Dashboard shows `—` for all metrics | `NEXT_PUBLIC_API_URL` not set or wrong | Check Vercel env vars; value must not have trailing slash |
| Country chart empty but users exist | `country` field null for existing users | Expected — only users who register/update profile after the migration will have country data |

---

## Security Notes

- All role enforcement is **backend-only** — frontend role checks are UI convenience only
- Blocked users receive `401 Account has been suspended` at login — cannot obtain new tokens
- Existing tokens for blocked users are not invalidated (short-lived JWTs mitigate this; implement token blacklist if needed)
- Every mutation (block/unblock/delete/role change/create admin) writes an `AuditLog` row with `adminId`, action, target, and detail
- Admin creation restricts `role` to ADMIN/SUPPORT/ANALYST server-side — SUPER_ADMIN cannot be created via API
- Delete requires SUPER_ADMIN; cascades all user relations via Prisma
- Password for new admins is bcrypt-hashed (cost 10) before storage
