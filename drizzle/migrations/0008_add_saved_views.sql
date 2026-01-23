-- Migration: Add saved_views table for custom ticket views
-- Created: 2026-01-22

-- =============================================================================
-- SAVED VIEWS TABLE
-- =============================================================================
-- Stores user-created custom views with filter presets
-- Users can save filter combinations and share them with the team

CREATE TABLE `saved_views` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `user_id` TEXT NOT NULL,
  `filters` TEXT NOT NULL DEFAULT '{}',
  `columns` TEXT,
  `sort_by` TEXT DEFAULT 'createdAt',
  `sort_order` TEXT DEFAULT 'desc',
  `is_shared` INTEGER DEFAULT 0 NOT NULL,
  `is_default` INTEGER DEFAULT 0 NOT NULL,
  `created_at` INTEGER DEFAULT (unixepoch()) NOT NULL,
  `updated_at` INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

-- Index for faster user lookups
CREATE INDEX `idx_saved_views_user_id` ON `saved_views` (`user_id`);

-- Index for shared views queries
CREATE INDEX `idx_saved_views_shared` ON `saved_views` (`is_shared`) WHERE `is_shared` = 1;
