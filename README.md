# ServDesk MVP

A modern, lightweight helpdesk ticketing system built for the edge.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Deployment | Cloudflare Pages (Edge) |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle |
| Auth | Better Auth + TOTP MFA |
| Email | Resend |
| UI | Shadcn/ui + Tailwind CSS |
| Testing | Vitest + Testing Library |

## Features

### Core Functionality
- **Email-to-Ticket**: Customers email `help@servsys.com` → automatic ticket creation
- **Ticket Management**: Status workflow (NEW → OPEN → PENDING_CUSTOMER → RESOLVED → CLOSED)
- **Admin Dashboard**: View, filter, and manage tickets
- **Customer Tracking**: Public `/track` page for customers to check ticket status

### Security
- **Role-Based Access Control (RBAC)**:
  - `SUPER_ADMIN`: Full access, can assign tickets, manage users
  - `ADMIN`: Can work on assigned tickets, reply, change status
  - `VIEW_ONLY`: Read-only access to tickets
- **MFA**: TOTP-based two-factor authentication for all admin accounts
- **Rate Limiting**: Protection against abuse on public endpoints

### Email Integration
- **Inbound**: Resend webhook receives emails and creates/updates tickets
- **Outbound**: Admin replies sent via Resend with email threading
- **Threading**: Proper `References` and `In-Reply-To` headers for email client threading

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Cloudflare account (free tier)
- Resend account (free tier)

### Local Development

```bash
# Clone and install
cd servdesk-MVP
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Create D1 database (local)
npx wrangler d1 create servdesk-db --local

# Run migrations
pnpm db:migrate:local

# Start dev server
pnpm dev
```

### Environment Variables

```bash
# .env.local
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_DATABASE_ID=your_d1_database_id

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
RESEND_FROM_EMAIL=help@servsys.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=generate_a_secure_random_string
```

### Deployment

```bash
# Set secrets in Cloudflare
wrangler pages secret put BETTER_AUTH_SECRET
wrangler pages secret put RESEND_API_KEY

# Run migrations on production D1
npm run db:migrate:prod

# Build and deploy to Cloudflare Pages
npm run deploy
```

Note: The project deploys to Cloudflare Pages using `@cloudflare/next-on-pages`. D1 database and KV namespaces are configured in `wrangler.toml`.

## Project Structure

```
servdesk-MVP/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, MFA)
│   │   ├── dashboard/         # Admin dashboard
│   │   │   ├── tickets/      # Ticket management
│   │   │   ├── users/        # User management
│   │   │   └── settings/     # Admin settings & MFA
│   │   ├── track/             # Public ticket tracking
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   └── auth/             # Auth components
│   ├── db/                    # Database
│   │   ├── schema.ts         # Drizzle schema
│   │   └── index.ts          # DB connection
│   └── lib/                   # Utilities
│       ├── auth.ts           # Better Auth config
│       ├── auth-client.ts    # Auth client
│       ├── rbac.ts           # Role-based access
│       ├── resend.ts         # Email utilities
│       ├── tickets.ts        # Ticket utilities
│       └── validations.ts    # Zod schemas
├── drizzle/                   # Migrations
├── public/                    # Static assets
├── wrangler.toml             # Cloudflare config
└── package.json
```

## API Routes

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/*` | Better Auth handlers (login, logout, MFA) |

### Tickets
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tickets` | Session | List tickets |
| GET | `/api/tickets/:id` | Session | Get ticket detail |
| POST | `/api/tickets/:id/reply` | Session | Reply to ticket |
| PATCH | `/api/tickets/:id/status` | Session | Change status |
| PATCH | `/api/tickets/:id/assign` | SA only | Assign ticket |
| GET | `/api/tickets/track` | Public | Customer tracking |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/inbound/resend` | Receive inbound emails |

## Ticket Workflow

```
Customer emails help@servsys.com
         │
         ▼
    ┌─────────┐
    │   NEW   │  ← Ticket created, all admins notified
    └────┬────┘
         │ Super Admin assigns
         ▼
    ┌─────────┐
    │  OPEN   │  ← Assigned admin notified
    └────┬────┘
         │ Admin replies
         ▼
┌─────────────────────┐
│  PENDING_CUSTOMER   │  ← Customer receives email
└──────────┬──────────┘
           │ Customer replies
           ▼
      ┌─────────┐
      │  OPEN   │  ← Admin notified
      └────┬────┘
           │ Admin resolves
           ▼
    ┌──────────┐
    │ RESOLVED │  ← Customer notified
    └────┬─────┘
         │ Auto or manual close
         ▼
    ┌─────────┐
    │ CLOSED  │
    └─────────┘
```

## Free Tier Limits

| Resource | Limit | Expected Usage |
|----------|-------|----------------|
| Workers Requests | 100k/day | ~2k/day |
| D1 Storage | 500MB | ~50MB/year |
| D1 Reads | 5M/day | ~10k/day |
| D1 Writes | 100k/day | ~500/day |
| Resend Emails | 3k/month | ~500/month |

## Development

### Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production (Next.js)
npm run cf:build      # Build for Cloudflare Pages
npm run deploy        # Build and deploy to Cloudflare
npm run db:generate   # Generate Drizzle migrations
npm run db:migrate:local   # Apply migrations locally
npm run db:migrate:prod    # Apply migrations to production
npm run db:seed:local      # Seed local database
npm run db:studio     # Open Drizzle Studio
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript checks
```

### Testing

```bash
npm test          # Run tests in watch mode
npm run test:run  # Run tests once
npm run test:coverage  # Run with coverage report
```

Test coverage includes:
- 37 tests for ticket utilities (generateTicketNumber, validateStatusTransition)
- 60 tests for Zod validation schemas
- 7 tests for health API endpoint

## Documentation

- [Sprint Plan](./docs/SPRINT_PLAN.md) - Implementation phases and checklist
- [Admin Guide](./docs/ADMIN_GUIDE.md) - Using the admin dashboard
- [API Reference](./docs/API.md) - API documentation

## License

MIT
