-- Multi-role RBAC system
-- Creates roles table and user_roles junction table for multi-role assignment

-- Create roles table
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_idx` ON `roles` (`name`);
--> statement-breakpoint

-- Create user_roles junction table
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`assigned_by_id` text,
	`assigned_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_user_role_idx` ON `user_roles` (`user_id`,`role_id`);
--> statement-breakpoint
CREATE INDEX `user_roles_user_id_idx` ON `user_roles` (`user_id`);
--> statement-breakpoint
CREATE INDEX `user_roles_role_id_idx` ON `user_roles` (`role_id`);
--> statement-breakpoint

-- Seed default roles
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
  ('role_super_admin', 'SUPER_ADMIN', 'Full system access, security, billing, role management'),
  ('role_admin', 'ADMIN', 'Configuration, user management, integrations, exports'),
  ('role_supervisor', 'SUPERVISOR', 'Team management, assignments, escalations, reports'),
  ('role_agent', 'AGENT', 'Ticket handling, assigned/queue tickets, basic operations');
--> statement-breakpoint

-- Migrate existing users from userProfiles.role to user_roles
-- Map old VIEW_ONLY role to AGENT
INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `assigned_at`)
SELECT
  lower(hex(randomblob(12))) as id,
  up.user_id,
  CASE up.role
    WHEN 'SUPER_ADMIN' THEN 'role_super_admin'
    WHEN 'ADMIN' THEN 'role_admin'
    WHEN 'VIEW_ONLY' THEN 'role_agent'
    ELSE 'role_agent'
  END as role_id,
  up.created_at
FROM user_profiles up;
