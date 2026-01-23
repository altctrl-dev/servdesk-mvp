# Migration 0009: Knowledge Base Tables - Runbook

**Created**: 2026-01-23
**Migration File**: `0009_add_knowledge_base.sql`
**Risk Level**: Low (additive only, no data modifications)

---

## Overview

This migration adds four new tables to support the Knowledge Base feature:

1. `kb_categories` - Hierarchical categories for organizing articles
2. `kb_tags` - Tags for cross-categorization
3. `kb_articles` - Core content table for KB articles
4. `kb_article_tags` - Many-to-many junction table

**Migration Type**: Forward-only, additive schema changes
**Data Impact**: None (creates empty tables)
**Estimated Execution Time**: <5 seconds (empty database)

---

## Pre-Migration Checklist

- [ ] Backup database (Cloudflare D1 auto-backup or export via CLI)
- [ ] Verify current migration state: `drizzle-kit check`
- [ ] Confirm no pending schema changes in development
- [ ] Review migration SQL file for syntax errors
- [ ] Verify TypeScript schema matches SQL migration

---

## Execution Steps

### Development Environment

```bash
# 1. Verify schema is in sync
npm run typecheck

# 2. Apply migration to local D1 database
npm run db:migrate

# 3. Verify migration success
npm run db:studio  # Check tables exist in Drizzle Studio
```

### Production Environment (Cloudflare D1)

```bash
# 1. Apply migration to production D1 database
wrangler d1 migrations apply servdesk-production --remote

# 2. Verify migration success
wrangler d1 execute servdesk-production --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%';"

# Expected output: kb_categories, kb_tags, kb_articles, kb_article_tags
```

---

## Verification Queries

### Confirm Tables Created

```sql
SELECT name, sql FROM sqlite_master
WHERE type='table' AND name LIKE 'kb_%'
ORDER BY name;
```

**Expected**: 4 tables (kb_categories, kb_tags, kb_articles, kb_article_tags)

### Confirm Indexes Created

```sql
SELECT name FROM sqlite_master
WHERE type='index' AND name LIKE 'kb_%'
ORDER BY name;
```

**Expected**: 11 indexes total:
- `kb_categories_slug_unique`
- `kb_categories_parent_id_idx`
- `kb_categories_slug_idx`
- `kb_tags_slug_unique`
- `kb_tags_slug_idx`
- `kb_articles_slug_unique`
- `kb_articles_slug_idx`
- `kb_articles_status_idx`
- `kb_articles_category_id_idx`
- `kb_articles_author_id_idx`
- `kb_articles_published_at_idx`
- `kb_article_tags_article_id_idx`
- `kb_article_tags_tag_id_idx`

### Test Foreign Key Constraints

```sql
-- Test category self-reference (should succeed)
INSERT INTO kb_categories (id, name, slug, parent_id)
VALUES ('test_parent', 'Parent', 'parent', NULL);

INSERT INTO kb_categories (id, name, slug, parent_id)
VALUES ('test_child', 'Child', 'child', 'test_parent');

-- Test article-category FK (should succeed)
INSERT INTO kb_articles (id, title, slug, content, author_id, category_id)
VALUES ('test_article', 'Test', 'test', 'Content', 'user_123', 'test_parent');

-- Test article-tag junction (should succeed)
INSERT INTO kb_tags (id, name, slug) VALUES ('test_tag', 'Test Tag', 'test-tag');
INSERT INTO kb_article_tags (article_id, tag_id)
VALUES ('test_article', 'test_tag');

-- Cleanup test data
DELETE FROM kb_article_tags WHERE article_id = 'test_article';
DELETE FROM kb_articles WHERE id = 'test_article';
DELETE FROM kb_tags WHERE id = 'test_tag';
DELETE FROM kb_categories WHERE id IN ('test_child', 'test_parent');
```

---

## Rollback Procedure

### Option 1: Manual Rollback (Recommended)

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS kb_article_tags;
DROP TABLE IF EXISTS kb_articles;
DROP TABLE IF EXISTS kb_tags;
DROP TABLE IF EXISTS kb_categories;
```

### Option 2: Rollback via Drizzle (if supported)

```bash
# Drizzle Kit does not support automatic rollback
# Manual rollback required using Option 1
```

### Option 3: Restore from Backup

```bash
# Restore D1 database from Cloudflare backup
wrangler d1 backup restore servdesk-production --backup-id <backup-id>
```

---

## Success Criteria

✅ All 4 tables created successfully
✅ All 13 indexes created successfully
✅ Foreign key constraints functional (verified via test inserts)
✅ TypeScript types compile without errors (`npm run typecheck`)
✅ No lint errors in schema.ts (`npm run lint`)
✅ Drizzle Studio shows all tables with correct schema

---

## Troubleshooting

### Issue: "table already exists" error

**Cause**: Migration already applied or partially applied
**Resolution**: Check migration journal, verify table state, skip or drop tables manually

```sql
-- Check if tables exist
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%';

-- If tables exist, verify they match expected schema
PRAGMA table_info(kb_categories);
PRAGMA table_info(kb_tags);
PRAGMA table_info(kb_articles);
PRAGMA table_info(kb_article_tags);
```

### Issue: Foreign key constraint failures

**Cause**: Invalid parent_id or category_id references
**Resolution**: Verify referenced IDs exist before insert

```sql
-- Check if parent category exists
SELECT id FROM kb_categories WHERE id = ?;

-- Check if category exists before adding article
SELECT id FROM kb_categories WHERE id = ?;
```

### Issue: Unique constraint violation on slug

**Cause**: Duplicate slug values
**Resolution**: Ensure slugs are unique before insert, use slug generation library

---

## Performance Considerations

### Table Sizes (Projected)

- `kb_categories`: ~50-100 rows (low cardinality)
- `kb_tags`: ~100-500 rows (medium cardinality)
- `kb_articles`: ~1000-10000 rows (medium-high cardinality)
- `kb_article_tags`: ~5000-50000 rows (high cardinality, junction table)

### Index Strategy

All indexes are created during migration with zero data impact. Future considerations:

- **Status index**: Optimize filtering PUBLISHED vs DRAFT articles
- **Published date index**: Optimize chronological ordering
- **Slug indexes**: Optimize URL lookups (unique constraint + index)
- **Foreign key indexes**: Optimize JOIN performance

### Query Patterns

Expected high-frequency queries:

1. Fetch published articles by category (uses `category_id_idx` + `status_idx`)
2. Fetch articles by tag (uses `kb_article_tags` junction + indexes)
3. Hierarchical category tree (uses `parent_id_idx`)
4. Article search by slug (uses `slug_idx`, unique)

---

## Data Migration (Not Required)

This migration creates empty tables. No data backfill needed.

Future migrations may add:

- Seed data for default categories
- Migration of legacy content (if applicable)
- Bulk imports from external KB systems

---

## Dependencies

### Code Changes Required

After applying migration, update:

1. ✅ Schema types exported (`/src/db/schema.ts`)
2. API routes for KB CRUD operations (Phase 8.4-8.5)
3. UI components for KB pages (Phase 8.6-8.7)
4. Tests for KB functionality (Phase 8.8)

### Environment Variables

No new environment variables required.

---

## Observability

### Metrics to Monitor

- Migration execution time (should be <5s)
- Table row counts (should start at 0)
- Query performance on kb_articles (monitor after content added)

### Logs

```bash
# View migration logs (Cloudflare D1)
wrangler d1 migrations list servdesk-production --remote

# Check migration journal
cat drizzle/migrations/meta/_journal.json | jq '.entries[-1]'
```

---

## Approval Checklist

- [x] Migration SQL reviewed by DME
- [x] TypeScript schema updated and type-checked
- [x] Lint checks passed
- [x] No destructive operations (DROP, DELETE, ALTER with data loss)
- [x] Rollback procedure documented
- [x] Success criteria defined
- [ ] Peer review completed (optional)
- [ ] Staging environment tested (before production)

---

## Contact

**Migration Author**: DME (Data & Migration Engineer)
**Date**: 2026-01-23
**Sprint**: Phase 8.3 - KB Database Schema & Migration

For questions or issues, refer to:
- Drizzle ORM docs: https://orm.drizzle.team
- Cloudflare D1 docs: https://developers.cloudflare.com/d1/
