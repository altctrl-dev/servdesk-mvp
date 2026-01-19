-- Add email verification columns to invitations table
-- These columns support the verification code flow for invitation acceptance

ALTER TABLE `invitations` ADD COLUMN `verification_code` text;
--> statement-breakpoint
ALTER TABLE `invitations` ADD COLUMN `verification_code_expires_at` integer;
--> statement-breakpoint
ALTER TABLE `invitations` ADD COLUMN `verification_attempts` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `invitations` ADD COLUMN `verification_codes_sent` integer DEFAULT 0 NOT NULL;
