# Feature Map — ServDesk MVP

> Single source of truth for project direction and feature status.

## Active Features

### Core (MVP Required)

| Feature | Status | Owner | Files |
|---------|--------|-------|-------|
| Email-to-Ticket (Inbound) | 🔲 Planned | - | `src/app/api/inbound/resend/` |
| Ticket CRUD | 🔲 Planned | - | `src/app/api/tickets/` |
| Admin Dashboard | 🔲 Planned | - | `src/app/admin/` |
| Customer Tracking (/track) | 🔲 Planned | - | `src/app/track/` |
| Better Auth + MFA | 🔲 Planned | - | `src/lib/auth.ts` |
| RBAC (3 roles) | 🔲 Planned | - | `src/lib/rbac.ts` |
| Email Threading | 🔲 Planned | - | `src/lib/resend.ts` |
| Audit Logging | 🔲 Planned | - | `src/db/schema.ts` |

### Infrastructure

| Component | Status | Technology |
|-----------|--------|------------|
| Compute | 🔲 Planned | Cloudflare Workers |
| Database | 🔲 Planned | Cloudflare D1 (SQLite) |
| Rate Limiting | 🔲 Planned | Cloudflare KV |
| ORM | 🔲 Planned | Drizzle |
| Auth | 🔲 Planned | Better Auth |
| Email | 🔲 Planned | Resend |
| UI | 🔲 Planned | Shadcn/ui |

## Deprecated Features

_None yet_

## Pivot History

| Date | From | To | Reason |
|------|------|----|--------|
| 2025-01-17 | Railway + PostgreSQL | Cloudflare Workers + D1 | User preference for $0 hosting |
| 2025-01-17 | Prisma ORM | Drizzle ORM | Smaller bundle for Workers 3MB limit |
| 2025-01-17 | Custom JWT Auth | Better Auth | Built-in MFA, edge-native, less code |
| 2025-01-17 | Turso DB | Cloudflare D1 | Native CF integration, simpler |

## Out of Scope (MVP)

These features are explicitly NOT included in MVP:

- [ ] File attachments
- [ ] Real-time WebSocket updates (using polling)
- [ ] SLA management
- [ ] Knowledge base
- [ ] Customer portal login (tracking is public with ticket# + email)
- [ ] Custom email domains
- [ ] Multiple inboxes
- [ ] Canned responses / templates
- [ ] Tags / categories
- [ ] Ticket merging
- [ ] Collision detection (multiple admins editing)

## Feature → File Mapping

```
Email Inbound
├── src/app/api/inbound/resend/route.ts    # Webhook handler
├── src/lib/resend.ts                       # Email parsing
└── src/db/schema.ts                        # inboundEvents table

Tickets
├── src/app/api/tickets/route.ts            # List, Create
├── src/app/api/tickets/[id]/route.ts       # Get, Delete
├── src/app/api/tickets/[id]/reply/route.ts
├── src/app/api/tickets/[id]/status/route.ts
├── src/app/api/tickets/[id]/assign/route.ts
├── src/app/api/tickets/track/route.ts      # Public tracking
├── src/lib/tickets.ts                      # Business logic
└── src/db/schema.ts                        # tickets, messages tables

Authentication
├── src/app/api/auth/[...all]/route.ts      # Better Auth handler
├── src/lib/auth.ts                         # Server config
├── src/lib/auth-client.ts                  # Client config
├── src/lib/rbac.ts                         # Role checks
└── src/db/schema.ts                        # userProfiles table

Admin Dashboard
├── src/app/admin/page.tsx                  # Ticket list
├── src/app/admin/layout.tsx                # Layout + sidebar
├── src/app/admin/tickets/[id]/page.tsx     # Ticket detail
├── src/app/admin/users/page.tsx            # User management
├── src/components/admin/*.tsx              # UI components
└── src/middleware.ts                       # Route protection

Customer Tracking
├── src/app/track/page.tsx                  # Tracking form + result
└── src/components/track/*.tsx              # UI components
```

## Status Legend

- 🔲 Planned — Not started
- 🔨 In Progress — Currently being developed
- ✅ Complete — Implemented and tested
- ⚠️ Blocked — Waiting on dependency
- 🗑️ Deprecated — Removed or replaced
