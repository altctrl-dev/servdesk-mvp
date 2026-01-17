# Sprint Plan — ServDesk MVP

## Overview

| Attribute | Value |
|-----------|-------|
| **Duration** | 8-10 days |
| **Team Size** | 1-2 developers |
| **Goal** | Production-ready helpdesk with email integration |
| **Cost** | $0/month (all free tiers) |

## Tech Stack (Final)

| Component | Choice | Free Tier Limit |
|-----------|--------|-----------------|
| Compute | Cloudflare Workers | 100k req/day |
| Database | Cloudflare D1 | 500MB storage |
| Auth | Better Auth | - |
| MFA | Better Auth 2FA | - |
| Rate Limit | Cloudflare KV | 100k reads/day |
| Email | Resend | 3k emails/month |
| ORM | Drizzle | - |
| UI | Shadcn/ui | - |

---

## Phase 1: Project Scaffolding

**Duration**: 0.5 days
**Status**: 🔲 Not Started

### Checklist

- [ ] Initialize Next.js 15 with `create cloudflare`
- [ ] Configure TypeScript and path aliases
- [ ] Install dependencies:
  - [ ] `drizzle-orm`, `better-auth`, `kysely`, `kysely-d1`
  - [ ] `resend`, `@paralleldrive/cuid2`
  - [ ] Shadcn/ui components
- [ ] Create D1 database: `wrangler d1 create servdesk-db`
- [ ] Create KV namespaces: `RATE_LIMIT`
- [ ] Configure `wrangler.toml`
- [ ] Create folder structure
- [ ] Set up `.env.example`
- [ ] Verify: `pnpm dev` and `wrangler deploy --dry-run` work

### Deliverables

```
servdesk-MVP/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/health/route.ts
│   ├── db/
│   │   └── index.ts
│   ├── lib/
│   │   ├── cf-context.ts
│   │   └── utils.ts
│   └── env.d.ts
├── drizzle.config.ts
├── wrangler.toml
├── next.config.mjs
├── tailwind.config.ts
├── components.json
├── .env.example
└── package.json
```

---

## Phase 2: Database Schema & Migrations

**Duration**: 0.5 days
**Status**: 🔲 Not Started
**Depends on**: Phase 1

### Checklist

- [ ] Create `src/db/schema.ts` with all tables:
  - [ ] `userProfiles` (extends Better Auth user)
  - [ ] `customers`
  - [ ] `tickets`
  - [ ] `messages`
  - [ ] `auditLogs`
  - [ ] `inboundEvents`
- [ ] Create `src/db/index.ts` with D1 connection helper
- [ ] Generate migrations: `drizzle-kit generate`
- [ ] Apply to local D1: `wrangler d1 migrations apply --local`
- [ ] Create `src/db/seed.ts` with default admin
- [ ] Verify: Can query tables from API route

### Deliverables

```
src/db/
├── schema.ts          # Complete schema
├── index.ts           # getDb() helper
└── seed.ts            # Seed script
drizzle/
├── 0000_init.sql      # Migration
└── meta/
```

### Schema Summary

| Table | Purpose |
|-------|---------|
| `user` | Better Auth managed |
| `session` | Better Auth managed |
| `twoFactor` | Better Auth managed |
| `userProfiles` | Role, isActive, security tracking |
| `customers` | Email submitters |
| `tickets` | Core tickets |
| `messages` | Ticket messages (in/out/internal) |
| `auditLogs` | Change history |
| `inboundEvents` | Webhook idempotency |

---

## Phase 3: Authentication & MFA

**Duration**: 1 day
**Status**: 🔲 Not Started
**Depends on**: Phase 2

### Checklist

- [ ] Configure Better Auth server (`src/lib/auth.ts`):
  - [ ] D1 database adapter (Kysely)
  - [ ] Email/password provider
  - [ ] 2FA plugin with TOTP
  - [ ] Session configuration
  - [ ] Rate limiting
- [ ] Create Better Auth client (`src/lib/auth-client.ts`)
- [ ] Create auth API route (`src/app/api/auth/[...all]/route.ts`)
- [ ] Create RBAC utilities (`src/lib/rbac.ts`):
  - [ ] `getSessionWithRole()`
  - [ ] `requireRole()`
  - [ ] Permission helpers
- [ ] Create middleware (`src/middleware.ts`)
- [ ] Create login page (`src/app/(auth)/login/page.tsx`)
- [ ] Create MFA verification page (`src/app/(auth)/login/mfa/page.tsx`)
- [ ] Create login form component
- [ ] Create MFA form component
- [ ] Hook to create `userProfiles` on signup
- [ ] Verify: Full login flow with MFA works

### Deliverables

```
src/
├── lib/
│   ├── auth.ts              # Better Auth server
│   ├── auth-client.ts       # Better Auth client
│   └── rbac.ts              # Role utilities
├── app/
│   ├── api/auth/
│   │   └── [...all]/route.ts
│   └── (auth)/
│       ├── layout.tsx
│       ├── login/
│       │   ├── page.tsx
│       │   └── mfa/page.tsx
├── components/auth/
│   ├── login-form.tsx
│   ├── mfa-form.tsx
│   └── mfa-setup.tsx
└── middleware.ts
```

---

## Phase 4: Core Ticket APIs

**Duration**: 1.5 days
**Status**: 🔲 Not Started
**Depends on**: Phase 3

### Checklist

- [ ] Create ticket utilities (`src/lib/tickets.ts`):
  - [ ] `generateTicketNumber()` - SERVSYS-XXXXX
  - [ ] `generateTrackingToken()`
  - [ ] `validateStatusTransition()`
- [ ] Create audit utilities (`src/lib/audit.ts`)
- [ ] Create validation schemas (`src/lib/validations.ts`)
- [ ] Create rate limit helper (`src/lib/rate-limit.ts`)
- [ ] API Routes:
  - [ ] `GET /api/tickets` - List (filtered by role)
  - [ ] `POST /api/tickets` - Create (SA only)
  - [ ] `GET /api/tickets/:id` - Detail
  - [ ] `POST /api/tickets/:id/reply` - Reply/internal note
  - [ ] `PATCH /api/tickets/:id/status` - Change status
  - [ ] `PATCH /api/tickets/:id/assign` - Assign (SA only)
  - [ ] `GET /api/tickets/track` - Public tracking
- [ ] Verify: All CRUD operations with RBAC

### Deliverables

```
src/
├── lib/
│   ├── tickets.ts
│   ├── audit.ts
│   ├── validations.ts
│   └── rate-limit.ts
└── app/api/tickets/
    ├── route.ts
    ├── track/route.ts
    └── [id]/
        ├── route.ts
        ├── reply/route.ts
        ├── status/route.ts
        └── assign/route.ts
```

---

## Phase 5: Email Integration (Resend)

**Duration**: 1.5 days
**Status**: 🔲 Not Started
**Depends on**: Phase 4

### Checklist

- [ ] Create Resend client (`src/lib/resend.ts`):
  - [ ] `sendTicketCreatedEmail()`
  - [ ] `sendTicketReplyEmail()`
  - [ ] `sendStatusChangeEmail()`
  - [ ] `sendAdminNotificationEmail()`
  - [ ] `getThreadingHeaders()`
  - [ ] `parseInboundEmail()`
  - [ ] `extractTicketNumber()`
  - [ ] `verifyWebhookSignature()`
- [ ] Create email templates (`src/lib/email-templates.ts`)
- [ ] Create inbound webhook (`src/app/api/inbound/resend/route.ts`):
  - [ ] Signature verification
  - [ ] Idempotency check
  - [ ] Parse for existing ticket
  - [ ] Create/update ticket
  - [ ] Send notifications
- [ ] Test with ngrok locally
- [ ] Verify: Full email round-trip works

### Deliverables

```
src/
├── lib/
│   ├── resend.ts
│   └── email-templates.ts
└── app/api/
    └── inbound/
        └── resend/route.ts
```

### Email Templates

| Template | Recipient | Trigger |
|----------|-----------|---------|
| ticket-created | Customer | New ticket from email |
| ticket-reply | Customer | Admin external reply |
| status-change | Customer | Status → RESOLVED/CLOSED |
| admin-notification | All Admins | New ticket created |
| assignment | Assigned Admin | Ticket assigned |

---

## Phase 6: Admin Dashboard UI

**Duration**: 2 days
**Status**: 🔲 Not Started
**Depends on**: Phase 5

### Checklist

- [ ] Install Shadcn components:
  - [ ] button, card, input, label, textarea, select
  - [ ] badge, table, dialog, dropdown-menu
  - [ ] form, tabs, avatar, separator, toast
  - [ ] sheet, scroll-area, skeleton, alert
- [ ] Create admin layout (`src/app/admin/layout.tsx`):
  - [ ] Sidebar navigation
  - [ ] Header with user info
  - [ ] Mobile responsive
- [ ] Create dashboard page (`src/app/admin/page.tsx`):
  - [ ] Ticket table
  - [ ] Filters (status, assignee, search)
  - [ ] Polling for updates
- [ ] Create ticket detail page (`src/app/admin/tickets/[id]/page.tsx`):
  - [ ] Message thread
  - [ ] Reply composer
  - [ ] Ticket info panel
  - [ ] Audit log (collapsible)
- [ ] Create components:
  - [ ] `ticket-table.tsx`
  - [ ] `ticket-filters.tsx`
  - [ ] `message-thread.tsx`
  - [ ] `reply-composer.tsx`
  - [ ] `ticket-info-panel.tsx`
  - [ ] `status-badge.tsx`
  - [ ] `priority-badge.tsx`
- [ ] Verify: Full admin workflow works

### Deliverables

```
src/
├── app/admin/
│   ├── layout.tsx
│   ├── page.tsx
│   └── tickets/
│       └── [id]/page.tsx
└── components/
    ├── ui/                    # Shadcn
    └── admin/
        ├── sidebar.tsx
        ├── header.tsx
        ├── ticket-table.tsx
        ├── ticket-filters.tsx
        ├── message-thread.tsx
        ├── reply-composer.tsx
        ├── ticket-info-panel.tsx
        ├── status-badge.tsx
        └── priority-badge.tsx
```

---

## Phase 7: Customer Tracking & User Management

**Duration**: 1 day
**Status**: 🔲 Not Started
**Depends on**: Phase 6

### Checklist

- [ ] Create tracking page (`src/app/track/page.tsx`):
  - [ ] Form: ticket# + email/token
  - [ ] Result display
  - [ ] Error handling
  - [ ] Mobile responsive
- [ ] Create tracking components:
  - [ ] `tracking-form.tsx`
  - [ ] `tracking-result.tsx`
- [ ] Create user management page (`src/app/admin/users/page.tsx`)
- [ ] Create user API routes:
  - [ ] `GET /api/users` - List (SA only)
  - [ ] `POST /api/users` - Create (SA only)
  - [ ] `PATCH /api/users/:id` - Update
  - [ ] `DELETE /api/users/:id` - Deactivate
- [ ] Create MFA settings page (`src/app/admin/settings/security/page.tsx`)
- [ ] Verify: Customer tracking and user management work

### Deliverables

```
src/
├── app/
│   ├── track/page.tsx
│   └── admin/
│       ├── users/page.tsx
│       └── settings/
│           └── security/page.tsx
├── components/
│   ├── track/
│   │   ├── tracking-form.tsx
│   │   └── tracking-result.tsx
│   └── admin/
│       ├── user-table.tsx
│       └── user-form.tsx
└── app/api/users/
    ├── route.ts
    └── [id]/route.ts
```

---

## Phase 8: Testing & Optimization

**Duration**: 1 day
**Status**: 🔲 Not Started
**Depends on**: Phase 7

### Checklist

- [ ] Install testing deps: `vitest`, `@testing-library/react`
- [ ] Configure `vitest.config.ts`
- [ ] Write tests:
  - [ ] `src/lib/__tests__/tickets.test.ts`
  - [ ] `src/lib/__tests__/rbac.test.ts`
  - [ ] `src/app/api/__tests__/tickets.test.ts`
- [ ] Bundle size optimization:
  - [ ] Analyze with ESBuild meta
  - [ ] Remove unused deps
  - [ ] Verify < 3MB gzipped
- [ ] Run quality gates:
  - [ ] `pnpm lint` passes
  - [ ] `pnpm typecheck` passes
  - [ ] `pnpm build` passes
  - [ ] `pnpm test` passes
- [ ] Fix all issues

### Deliverables

```
src/__tests__/
├── lib/
│   ├── tickets.test.ts
│   └── rbac.test.ts
└── api/
    └── tickets.test.ts
vitest.config.ts
```

---

## Phase 9: Deployment

**Duration**: 0.5 days
**Status**: 🔲 Not Started
**Depends on**: Phase 8

### Checklist

- [ ] Set secrets:
  ```bash
  wrangler secret put RESEND_API_KEY
  wrangler secret put RESEND_WEBHOOK_SECRET
  wrangler secret put BETTER_AUTH_SECRET
  ```
- [ ] Apply migrations to production D1:
  ```bash
  wrangler d1 migrations apply servdesk-db --remote
  ```
- [ ] Run seed on production
- [ ] Deploy:
  ```bash
  npx @opennextjs/cloudflare build
  wrangler deploy --minify
  ```
- [ ] Configure Resend webhook URL
- [ ] Test full flow in production:
  - [ ] Login with MFA
  - [ ] Send test email
  - [ ] Verify ticket created
  - [ ] Reply from admin
  - [ ] Track from customer page

---

## Phase 10: Documentation

**Duration**: 0.5 days
**Status**: 🔲 Not Started
**Depends on**: Phase 9

### Checklist

- [ ] Update `README.md` with final instructions
- [ ] Create `docs/ADMIN_GUIDE.md`
- [ ] Create `docs/API.md`
- [ ] Create `CHANGELOG.md` with v1.0.0

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bundle > 3MB | Medium | High | Analyze, lazy load, minify |
| CPU > 10ms | Low | Medium | Offload to DB, avoid heavy JS |
| Email threading breaks | Medium | Medium | Test all clients, proper headers |
| Webhook duplicates | High | Medium | Idempotency table |
| Better Auth edge issues | Low | High | Pin to stable version |

---

## Success Criteria

- [ ] Customer can email help@servsys.com → ticket created
- [ ] Super Admin can assign tickets
- [ ] Admin can reply → customer receives email
- [ ] Customer can track ticket on /track
- [ ] MFA works for all admins
- [ ] Audit logs capture all changes
- [ ] All free tier limits respected
- [ ] Bundle < 3MB, CPU < 10ms
