ALTER TABLE `records` ADD `obligation` text;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_payment_obligation` ON `records` (`tenant`,`owner`,`obligation`);