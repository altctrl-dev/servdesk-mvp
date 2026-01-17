-- Add twoFactorEnabled column to user table
-- Required by Better Auth's twoFactor plugin

ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" INTEGER DEFAULT 0;
