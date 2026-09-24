ALTER TABLE `members` ADD `reviewRegistrations` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE members SET status='pending' WHERE status='otp';
--> statement-breakpoint
DELETE FROM otps;
--> statement-breakpoint
UPDATE settings SET data=json_remove(data,'$.otpMinutes','$.otpAttempts','$.otpResends');

--> statement-breakpoint
UPDATE members SET profile=json_set(profile,'$.registeredAt',joined) WHERE json_extract(profile,'$.registeredAt') IS NULL;
