-- Add self-service password reset columns to password_reset_tokens table
-- These columns support the verification code flow for self-service password reset

-- Make userId nullable for self-service flow (user lookup happens later)
-- SQLite doesn't support ALTER COLUMN, so we need to work with existing nullable setup

-- Add email column for self-service password reset
ALTER TABLE `password_reset_tokens` ADD COLUMN `email` text;
--> statement-breakpoint

-- Add verification code for self-service password reset
ALTER TABLE `password_reset_tokens` ADD COLUMN `verification_code` text;
--> statement-breakpoint

-- Add verification code expiration (10 minutes from generation)
ALTER TABLE `password_reset_tokens` ADD COLUMN `verification_code_expires_at` integer;
--> statement-breakpoint

-- Add failed verification attempts counter (max 5 before lockout)
ALTER TABLE `password_reset_tokens` ADD COLUMN `verification_attempts` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Add verification codes sent counter for rate limiting (max 3 per hour)
ALTER TABLE `password_reset_tokens` ADD COLUMN `verification_codes_sent` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Add rate limit window start timestamp (for hourly rate limiting)
ALTER TABLE `password_reset_tokens` ADD COLUMN `rate_limit_window_start` integer;
--> statement-breakpoint

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS `password_reset_tokens_email_idx` ON `password_reset_tokens` (`email`);
