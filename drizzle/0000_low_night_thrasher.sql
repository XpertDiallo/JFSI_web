CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`detail` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_tenant_time` ON `audit` (`tenant`,`created`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`identity` text NOT NULL,
	`name` text NOT NULL,
	`firstName` text NOT NULL,
	`phone` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`number` text,
	`scope` text DEFAULT '' NOT NULL,
	`profile` text DEFAULT '{}' NOT NULL,
	`joined` text NOT NULL,
	`suspended` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_identity` ON `members` (`tenant`,`identity`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_phone` ON `members` (`tenant`,`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_number` ON `members` (`number`);--> statement-breakpoint
CREATE TABLE `otps` (
	`member` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`expires` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rates` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`kind` text NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `record_tenant_kind` ON `records` (`tenant`,`kind`);--> statement-breakpoint
CREATE INDEX `record_owner` ON `records` (`tenant`,`owner`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`identity` text NOT NULL,
	`member` text NOT NULL,
	`expires` integer NOT NULL,
	`mfa` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`tenant` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
