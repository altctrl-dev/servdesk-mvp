CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`field` text,
	`old_value` text,
	`new_value` text,
	`metadata` text,
	`user_id` text,
	`user_email` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_logs_ticket_id_idx` ON `audit_logs` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`organization` text,
	`ticket_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_idx` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `inbound_events` (
	`id` text PRIMARY KEY NOT NULL,
	`resend_message_id` text NOT NULL,
	`payload` text NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`processed_at` integer,
	`ticket_id` text,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_events_resend_message_id_unique` ON `inbound_events` (`resend_message_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `inbound_events_resend_message_id_idx` ON `inbound_events` (`resend_message_id`);--> statement-breakpoint
CREATE INDEX `inbound_events_processed_idx` ON `inbound_events` (`processed`);--> statement-breakpoint
CREATE INDEX `inbound_events_created_at_idx` ON `inbound_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`content_html` text,
	`from_email` text,
	`from_name` text,
	`to_email` text,
	`resend_message_id` text,
	`author_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_ticket_id_idx` ON `messages` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `messages_type_idx` ON `messages` (`type`);--> statement-breakpoint
CREATE INDEX `messages_created_at_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `messages_ticket_created_idx` ON `messages` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_number` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`tracking_token` text NOT NULL,
	`customer_id` text NOT NULL,
	`assigned_to_id` text,
	`email_thread_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`first_response_at` integer,
	`resolved_at` integer,
	`closed_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_ticket_number_unique` ON `tickets` (`ticket_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_tracking_token_unique` ON `tickets` (`tracking_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_ticket_number_idx` ON `tickets` (`ticket_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_tracking_token_idx` ON `tickets` (`tracking_token`);--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tickets_customer_id_idx` ON `tickets` (`customer_id`);--> statement-breakpoint
CREATE INDEX `tickets_assigned_to_id_idx` ON `tickets` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `tickets_created_at_idx` ON `tickets` (`created_at`);--> statement-breakpoint
CREATE INDEX `tickets_priority_idx` ON `tickets` (`priority`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'VIEW_ONLY' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`failed_login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`password_changed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_profiles_role_idx` ON `user_profiles` (`role`);