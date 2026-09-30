ALTER TABLE `audit` ADD `scope` text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit` ADD `subject` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `viewDossiers` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `publishContent` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX records_asset_key ON records(tenant,kind,json_extract(data,'$.assetKey'));
--> statement-breakpoint
CREATE INDEX records_poster ON records(tenant,json_extract(data,'$.poster'));
--> statement-breakpoint
CREATE INDEX audit_scope_subject ON audit(tenant,scope,subject,created);
