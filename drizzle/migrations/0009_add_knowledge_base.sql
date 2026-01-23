-- Migration: Add Knowledge Base tables
-- Created: 2026-01-23
-- Description: Adds tables for Knowledge Base feature with categories, tags, and articles

-- =============================================================================
-- KNOWLEDGE BASE CATEGORIES TABLE
-- =============================================================================
-- Stores hierarchical categories for organizing KB articles
-- Supports parent-child relationships for nested categories

CREATE TABLE `kb_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`article_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `kb_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kb_categories_slug_unique` ON `kb_categories` (`slug`);
--> statement-breakpoint
CREATE INDEX `kb_categories_parent_id_idx` ON `kb_categories` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `kb_categories_slug_idx` ON `kb_categories` (`slug`);
--> statement-breakpoint

-- =============================================================================
-- KNOWLEDGE BASE TAGS TABLE
-- =============================================================================
-- Stores tags for cross-categorization of articles
-- Allows many-to-many relationship with articles

CREATE TABLE `kb_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`article_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kb_tags_slug_unique` ON `kb_tags` (`slug`);
--> statement-breakpoint
CREATE INDEX `kb_tags_slug_idx` ON `kb_tags` (`slug`);
--> statement-breakpoint

-- =============================================================================
-- KNOWLEDGE BASE ARTICLES TABLE
-- =============================================================================
-- Core content table for KB articles
-- Supports draft/published/archived lifecycle with version tracking

CREATE TABLE `kb_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`category_id` text,
	`author_id` text NOT NULL,
	`published_at` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `kb_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kb_articles_slug_unique` ON `kb_articles` (`slug`);
--> statement-breakpoint
CREATE INDEX `kb_articles_slug_idx` ON `kb_articles` (`slug`);
--> statement-breakpoint
CREATE INDEX `kb_articles_status_idx` ON `kb_articles` (`status`);
--> statement-breakpoint
CREATE INDEX `kb_articles_category_id_idx` ON `kb_articles` (`category_id`);
--> statement-breakpoint
CREATE INDEX `kb_articles_author_id_idx` ON `kb_articles` (`author_id`);
--> statement-breakpoint
CREATE INDEX `kb_articles_published_at_idx` ON `kb_articles` (`published_at`);
--> statement-breakpoint

-- =============================================================================
-- KNOWLEDGE BASE ARTICLE-TAG JUNCTION TABLE
-- =============================================================================
-- Many-to-many relationship between articles and tags
-- Enables tag-based filtering and search

CREATE TABLE `kb_article_tags` (
	`article_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`article_id`, `tag_id`),
	FOREIGN KEY (`article_id`) REFERENCES `kb_articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `kb_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `kb_article_tags_article_id_idx` ON `kb_article_tags` (`article_id`);
--> statement-breakpoint
CREATE INDEX `kb_article_tags_tag_id_idx` ON `kb_article_tags` (`tag_id`);
