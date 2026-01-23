# Sprint Plan: Multi-Role RBAC & Navigation Overhaul

## Overview
Implement a 4-role RBAC system with multi-role assignment and restructure the dashboard navigation with role-based visibility.

## Roles
| Role | Description |
|------|-------------|
| **SUPER_ADMIN** | Full system access, security, billing, role management |
| **ADMIN** | Configuration, user management, integrations, exports |
| **SUPERVISOR** | Team management, assignments, escalations, reports |
| **AGENT** | Ticket handling, assigned/queue tickets, basic operations |

Users can have multiple roles (e.g., Agent + Supervisor).

---

## Phase 1: Schema Changes

### 1.1 New Tables

**`roles` table**
```sql
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- SUPER_ADMIN, ADMIN, SUPERVISOR, AGENT
  description TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);
```

**`user_roles` junction table**
```sql
CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES user(id),
  assigned_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  UNIQUE(user_id, role_id)
);
```

### 1.2 Schema Updates

**`tickets` table** - Add ON_HOLD status
```sql
-- Update status enum to include ON_HOLD
-- NEW, OPEN, PENDING_CUSTOMER, ON_HOLD, RESOLVED, CLOSED
```

### 1.3 Migration Tasks
- [ ] Create migration file for roles table
- [ ] Create migration file for user_roles table
- [ ] Seed 4 default roles
- [ ] Migrate existing userProfiles.role to user_roles
- [ ] Add ON_HOLD to ticket status enum
- [ ] Update Drizzle schema

---

## Phase 2: Auth & Permissions

### 2.1 Permission Helpers
```typescript
// lib/permissions.ts
hasRole(userId, role): boolean
hasAnyRole(userId, roles[]): boolean
hasAllRoles(userId, roles[]): boolean
getUserRoles(userId): Role[]
```

### 2.2 Session Updates
```typescript
// Update getSessionWithRole to return roles array
interface SessionWithRoles {
  user: User;
  roles: Role[];
}
```

### 2.3 Route Protection
```typescript
// Middleware or wrapper for route protection
withRoles(roles[], component)
protectRoute(roles[]): middleware
```

---

## Phase 3: Navigation Structure

### 3.1 Sidebar Menus

| Menu | Icon | Default Route |
|------|------|---------------|
| Inbox | Inbox | /dashboard/inbox/my |
| Tickets | Ticket | /dashboard/tickets/open |
| Views | Eye | /dashboard/views |
| Knowledge Base | Book | /dashboard/knowledge-base/articles |
| Reports | BarChart | /dashboard/reports/team |
| Admin | Shield | /dashboard/admin/users |
| Settings | Settings | /dashboard/settings/profile |

### 3.2 Route Access Matrix

#### Inbox (`/dashboard/inbox`)
| Route | Agent | Supervisor | Admin | Super Admin |
|-------|:-----:|:----------:|:-----:|:-----------:|
| `/inbox/my` | ✓ | ✓ | ✓ | ✓ |
| `/inbox/team` | | ✓ | ✓ | ✓ |
| `/inbox/unassigned` | | ✓ | ✓ | ✓ |
| `/inbox/escalations` | | ✓ | ✓ | ✓ |
| `/inbox/sla-breach` | | ✓ | ✓ | ✓ |
| `/inbox/waiting-on-customer` | ✓ | ✓ | ✓ | ✓ |

#### Tickets (`/dashboard/tickets`)
| Route | Agent | Supervisor | Admin | Super Admin |
|-------|:-----:|:----------:|:-----:|:-----------:|
| `/tickets/open` | ✓ | ✓ | ✓ | ✓ |
| `/tickets/pending` | ✓ | ✓ | ✓ | ✓ |
| `/tickets/on-hold` | ✓ | ✓ | ✓ | ✓ |
| `/tickets/resolved` | ✓ | ✓ | ✓ | ✓ |
| `/tickets/closed` | ✓ | ✓ | ✓ | ✓ |
| `/tickets/trash` | | ✓ | ✓ | ✓ |
| `/tickets/[id]` | ✓ | ✓ | ✓ | ✓ |

#### Views (`/dashboard/views`)
| Route | Agent | Supervisor | Admin | Super Admin |
|-------|:-----:|:----------:|:-----:|:-----------:|
| `/views` (saved) | ✓ | ✓ | ✓ | ✓ |
| `/views/shared` | | ✓ | ✓ | ✓ |
| `/views/new` | | ✓ | ✓ | ✓ |
| `/views/[id]` | ✓ | ✓ | ✓ | ✓ |

#### Knowledge Base (`/dashboard/knowledge-base`)
| Route | Agent | Supervisor | Admin | Super Admin |
|-------|:-----:|:----------:|:-----:|:-----------:|
| `/knowledge-base/articles` | ✓ | ✓ | ✓ | ✓ |
| `/knowledge-base/articles/[id]` | ✓ | ✓ | ✓ | ✓ |
| `/knowledge-base/drafts` | | ✓ | ✓ | ✓ |
| `/knowledge-base/categories` | | | ✓ | ✓ |
| `/knowledge-base/tags` | | | ✓ | ✓ |
| `/knowledge-base/requests` | | ✓ | ✓ | ✓ |

#### Reports (`/dashboard/reports`)
| Route | Agent | Supervisor | Admin | Super Admin |
|-------|:-----:|:----------:|:-----:|:-----------:|
| `/reports/team` | | ✓ | ✓ | ✓ |
| `/reports/sla` | | ✓ | ✓ | ✓ |
| `/reports/csat` | | ✓ | ✓ | ✓ |
| `/reports/volume` | | ✓ | ✓ | ✓ |
| `/reports/backlog` | | ✓ | ✓ | ✓ |
| `/reports/export` | | | ✓ | ✓ |

#### Admin (`/dashboard/admin`)
| Route | Agent | Supervisor | Admin | Super Admin |
|-------|:-----:|:----------:|:-----:|:-----------:|
| `/admin/queues` | | | ✓ | ✓ |
| `/admin/routing` | | | ✓ | ✓ |
| `/admin/slas` | | | ✓ | ✓ |
| `/admin/automation` | | | ✓ | ✓ |
| `/admin/macros` | | | ✓ | ✓ |
| `/admin/templates` | | | ✓ | ✓ |
| `/admin/tags` | | | ✓ | ✓ |
| `/admin/categories` | | | ✓ | ✓ |
| `/admin/users` | | | ✓ | ✓ |
| `/admin/roles` | | | | ✓ |
| `/admin/integrations` | | | ✓ | ✓ |

#### Settings (`/dashboard/settings`)
| Route | Agent | Supervisor | Admin | Super Admin |
|-------|:-----:|:----------:|:-----:|:-----------:|
| `/settings/profile` | ✓ | ✓ | ✓ | ✓ |
| `/settings/notifications` | ✓ | ✓ | ✓ | ✓ |
| `/settings/preferences` | ✓ | ✓ | ✓ | ✓ |
| `/settings/shortcuts` | ✓ | ✓ | ✓ | ✓ |
| `/settings/security` | ✓ | ✓ | ✓ | ✓ |
| `/settings/api-tokens` | | | ✓ | ✓ |

---

## Phase 4: Route Implementation

### 4.1 Folder Structure
```
src/app/dashboard/
├── inbox/
│   ├── my/page.tsx
│   ├── team/page.tsx
│   ├── unassigned/page.tsx
│   ├── escalations/page.tsx
│   ├── sla-breach/page.tsx
│   └── waiting-on-customer/page.tsx
├── tickets/
│   ├── open/page.tsx
│   ├── pending/page.tsx
│   ├── on-hold/page.tsx
│   ├── resolved/page.tsx
│   ├── closed/page.tsx
│   ├── trash/page.tsx
│   └── [id]/page.tsx
├── views/
│   ├── page.tsx
│   ├── shared/page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
├── knowledge-base/
│   ├── articles/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── drafts/page.tsx
│   ├── categories/page.tsx
│   ├── tags/page.tsx
│   └── requests/page.tsx
├── reports/
│   ├── team/page.tsx
│   ├── sla/page.tsx
│   ├── csat/page.tsx
│   ├── volume/page.tsx
│   ├── backlog/page.tsx
│   └── export/page.tsx
├── admin/
│   ├── queues/page.tsx
│   ├── routing/page.tsx
│   ├── slas/page.tsx
│   ├── automation/page.tsx
│   ├── macros/page.tsx
│   ├── templates/page.tsx
│   ├── tags/page.tsx
│   ├── categories/page.tsx
│   ├── users/page.tsx
│   ├── roles/page.tsx
│   └── integrations/page.tsx
└── settings/
    ├── profile/page.tsx
    ├── notifications/page.tsx
    ├── preferences/page.tsx
    ├── shortcuts/page.tsx
    ├── security/page.tsx
    └── api-tokens/page.tsx
```

---

## Implementation Checklist

### Phase 1: Schema ✅ COMPLETED
- [x] Create migration: add roles table
- [x] Create migration: add user_roles junction table
- [x] Create migration: add ON_HOLD status
- [x] Update Drizzle schema (schema.ts)
- [x] Seed default roles
- [x] Migrate existing user roles
- [x] Run migrations on local + remote

### Phase 2: Auth & Permissions ✅ COMPLETED
- [x] Create lib/permissions.ts with role helpers
- [x] Update getSessionWithRole → returns roles array
- [x] hasRole, hasAnyRole, hasAllRoles helpers
- [x] canAccessRoute helper with ROUTE_ACCESS config
- [x] getUserRoles, assignRole, removeRole, setUserRoles DB functions

### Phase 3: Navigation ✅ COMPLETED
- [x] Update sidebar configuration (DashboardLayout)
- [x] Add role-based menu filtering with hasAnyRole
- [x] Update breadcrumb generation with new routes
- [x] Collapsible sections: Inbox, Tickets, Views, KB, Reports, Admin
- [x] Test menu visibility per role

### Phase 4: Routes ✅ COMPLETED
- [x] Create folder structure for all routes
- [x] Add placeholder pages with role checks
- [x] Redirect unauthorized access to /dashboard?error=unauthorized
- [x] Connected pages to existing backend APIs

### Phase 5: Backend Connections ✅ COMPLETED
- [x] Inbox pages: My Queue, Team Queue, Unassigned
- [x] Ticket status pages: Open, Pending, On Hold, Resolved, Closed, Trash
- [x] Admin Users page: Connected to UserManagement component
- [x] Admin Roles page: Read-only roles view with user counts

---

## Phase 6: Views Feature ✅ COMPLETED

### 6.1 Database Schema
```sql
CREATE TABLE `saved_views` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `user_id` TEXT NOT NULL,
  `filters` TEXT NOT NULL, -- JSON: {status[], priority[], assignedTo, search}
  `columns` TEXT, -- JSON: columns to show
  `sort_by` TEXT, -- field name
  `sort_order` TEXT DEFAULT 'desc', -- asc/desc
  `is_shared` INTEGER DEFAULT 0,
  `is_default` INTEGER DEFAULT 0,
  `created_at` INTEGER NOT NULL DEFAULT (unixepoch()),
  `updated_at` INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
```

### 6.2 API Endpoints
| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/views` | GET | List user's views + shared views | All roles |
| `/api/views` | POST | Create new view | SUPERVISOR+ |
| `/api/views/[id]` | GET | Get single view | Owner or if shared |
| `/api/views/[id]` | PATCH | Update view | Owner only |
| `/api/views/[id]` | DELETE | Delete view | Owner only |
| `/api/views/[id]/apply` | GET | Get tickets matching view filters | All roles |

### 6.3 View Schema (TypeScript)
```typescript
interface SavedView {
  id: string;
  name: string;
  description?: string;
  userId: string;
  filters: {
    status?: TicketStatus[];
    priority?: TicketPriority[];
    assignedTo?: string | 'unassigned' | 'me';
    search?: string;
    dateRange?: { from: string; to: string };
  };
  columns?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isShared: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 6.4 Implementation Checklist
- [x] Create migration for saved_views table
- [x] Update Drizzle schema
- [x] Run migrations (local + remote)
- [x] Create GET /api/views endpoint
- [x] Create POST /api/views endpoint
- [x] Create GET /api/views/[id] endpoint
- [x] Create PATCH /api/views/[id] endpoint
- [x] Create DELETE /api/views/[id] endpoint
- [x] Update /dashboard/views page (list views)
- [x] Update /dashboard/views/new page (create form)
- [x] Update /dashboard/views/shared page (shared views list)
- [x] Create /dashboard/views/[id] page (view tickets with filters)
- [x] Create /dashboard/views/[id]/edit page (edit form)
- [x] Add "Save as View" button to ticket filters (optional enhancement)

### 6.5 Components Created
- `view-card.tsx` - Reusable card for displaying views with filter badges
- `view-filters-form.tsx` - Form for creating/editing view filters
- `my-views-list.tsx` - Client component listing user's views
- `shared-views-list.tsx` - Client component listing shared views
- `create-view-form.tsx` - Wrapper for view creation
- `edit-view-form.tsx` - Wrapper for view editing
- `view-tickets-client.tsx` - Displays tickets with applied filters
- `save-view-dialog.tsx` - Dialog for saving current filters as a view

---

## Phase 7: Reports Feature ✅ COMPLETED

### 7.1 API Endpoints Implemented
- `GET /api/reports/team` - Agent performance metrics (tickets handled, response/resolution times, workload)
- `GET /api/reports/sla` - SLA compliance (first response, resolution, breaches by priority)
- `GET /api/reports/volume` - Ticket volume trends (daily/weekly/monthly, distribution, peak hours/days)

### 7.2 Metrics Implemented
- Tickets handled per agent (at time of resolution)
- Average response time (createdAt → firstResponseAt)
- Average resolution time (createdAt → resolvedAt)
- SLA compliance percentage with breach detection
- Ticket volume by day/week/month with groupBy parameter
- Distribution by status and priority
- Peak hours and busiest days analysis
- Backlog analysis (real-time)

### 7.3 Pages Implemented
| Route | Description |
|-------|-------------|
| `/dashboard/reports` | Overview dashboard with summary stats |
| `/dashboard/reports/team` | Team performance with sortable agent table |
| `/dashboard/reports/sla` | SLA compliance with gauges and breach table |
| `/dashboard/reports/volume` | Volume trends with charts and distribution |
| `/dashboard/reports/backlog` | Real-time backlog analysis by age |
| `/dashboard/reports/csat` | Placeholder for future CSAT |
| `/dashboard/reports/export` | CSV export for team/volume (ADMIN+) |

### 7.4 Components Created
- `DateRangePicker` - 7d/30d/90d presets + custom range
- `ReportHeader` - Title, description, date picker, export button
- `MetricCard` - Stats with trend indicators
- `AgentTable` - Sortable agent performance table
- `ComplianceGauge` - Visual SLA compliance gauge
- `TrendChart` - CSS bar chart for volume trends
- `DistributionChart` - Horizontal bar chart for distributions

### 7.5 SLA Configuration
Default targets (configurable in future):
| Priority | First Response | Resolution |
|----------|---------------|------------|
| URGENT | 2 hours | 8 hours |
| HIGH | 8 hours | 24 hours |
| NORMAL | 24 hours | 72 hours |

### 7.6 Tests Added
- 55 tests for lib/reports.ts utilities
- 33 tests for team report API
- 40 tests for SLA report API
- 50 tests for volume report API
- **Total: 178 new tests (282 total)**

---

## Phase 8: Knowledge Base Feature ✅ COMPLETED

### 8.1 Database Tables Created
| Table | Description |
|-------|-------------|
| `kb_categories` | Hierarchical categories (parent/child, sort order, article count) |
| `kb_tags` | Tags with article count |
| `kb_articles` | Articles with title, slug, content, excerpt, status, view count |
| `kb_article_tags` | Many-to-many junction table |

### 8.2 API Endpoints Implemented
| Endpoint | Methods | Access |
|----------|---------|--------|
| `/api/kb/categories` | GET, POST | GET: All auth, POST: ADMIN+ |
| `/api/kb/categories/[id]` | GET, PATCH, DELETE | ADMIN+ for mutations |
| `/api/kb/tags` | GET, POST | GET: All auth, POST: ADMIN+ |
| `/api/kb/tags/[id]` | GET, PATCH, DELETE | ADMIN+ for mutations |
| `/api/kb/articles` | GET, POST | GET: All auth, POST: SUPERVISOR+ |
| `/api/kb/articles/[id]` | GET, PATCH, DELETE | SUPERVISOR+ for mutations |
| `/api/kb/public/articles` | GET | No auth required |
| `/api/kb/public/articles/[slug]` | GET | No auth required |

### 8.3 Dashboard Pages Implemented
| Route | Description |
|-------|-------------|
| `/dashboard/knowledge-base` | Overview with stats and quick links |
| `/dashboard/knowledge-base/articles` | Article list with search/filter |
| `/dashboard/knowledge-base/articles/new` | Create new article form |
| `/dashboard/knowledge-base/articles/[id]` | Article detail view |
| `/dashboard/knowledge-base/articles/[id]/edit` | Edit article form |
| `/dashboard/knowledge-base/drafts` | Draft articles (SUPERVISOR+) |
| `/dashboard/knowledge-base/categories` | Category tree management (ADMIN+) |
| `/dashboard/knowledge-base/tags` | Tag management (ADMIN+) |
| `/dashboard/knowledge-base/requests` | Placeholder for future feature |

### 8.4 Components Created
- `ArticleStatusBadge` - DRAFT (yellow), PUBLISHED (green), ARCHIVED (gray)
- `ArticleCard` - Article summary with actions
- `ArticleList` - Searchable, filterable article grid
- `ArticleForm` - Create/edit form with category and tag selection
- `CategoryTree` - Hierarchical category management with expand/collapse
- `TagManager` - Tag CRUD with search

### 8.5 Key Features
- **Article Status Workflow**: DRAFT → PUBLISHED → ARCHIVED
- **Hierarchical Categories**: 2-level nesting with parent/child relationships
- **Tag System**: Flexible tagging with article counts
- **Search**: Full-text search in title and content (LIKE query)
- **Public Access**: Published articles viewable without authentication
- **View Counting**: Automatic view count increment for published articles
- **Slug Generation**: URL-friendly slugs with uniqueness enforcement

### 8.6 Access Control
| Role | Permissions |
|------|-------------|
| AGENT | View published articles |
| SUPERVISOR | Create/edit articles, manage drafts |
| ADMIN+ | Manage categories, tags, publish/archive |
| Public | View published articles (no auth) |

### 8.7 Tests Added
- 36 tests for lib/kb.ts utilities
- 51 tests for categories API
- 34 tests for tags API
- 101 tests for articles API
- 46 tests for public API
- **Total: 268 new tests (550 total)**

---

## Notes
- Multi-role is cumulative: user with Agent + Supervisor sees both role's routes
- Default landing: /dashboard/inbox/my for all roles
- Existing /dashboard/tickets route should redirect to /dashboard/tickets/open
- Keep backward compatibility during migration
