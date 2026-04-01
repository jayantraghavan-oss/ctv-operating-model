CREATE TABLE `bq_revenue_snapshots` (
	`id` varchar(64) NOT NULL,
	`snapshot_date` varchar(20) NOT NULL,
	`total_gas` decimal(14,2),
	`total_campaigns` int,
	`total_advertisers` int,
	`avg_daily_gas` decimal(14,2),
	`trailing_7d_avg` decimal(14,2),
	`trailing_30d_avg` decimal(14,2),
	`monthly_data` text,
	`top_advertisers` text,
	`exchange_breakdown` text,
	`daily_trend` text,
	`fetched_at` bigint NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bq_revenue_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_refresh_log` (
	`id` varchar(64) NOT NULL,
	`source` varchar(50) NOT NULL,
	`refresh_status` enum('running','completed','failed') NOT NULL,
	`record_count` int,
	`duration_ms` int,
	`error_message` text,
	`started_at` bigint NOT NULL,
	`completed_at` bigint,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_refresh_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gong_analysis_cache` (
	`id` varchar(64) NOT NULL,
	`analysis_type` varchar(50) NOT NULL,
	`input_hash` varchar(64) NOT NULL,
	`call_count` int,
	`transcript_count` int,
	`result` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` bigint,
	CONSTRAINT `gong_analysis_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gong_calls` (
	`id` varchar(64) NOT NULL,
	`gong_call_id` varchar(32) NOT NULL,
	`title` varchar(500),
	`started` varchar(30),
	`duration` int,
	`direction` varchar(20),
	`primary_user_id` varchar(32),
	`primary_user_name` varchar(255),
	`account_name` varchar(500),
	`parties` text,
	`transcript_excerpt` text,
	`is_ctv_relevant` int DEFAULT 0,
	`ctv_keywords_found` text,
	`url` text,
	`fetched_at` bigint NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gong_calls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sfdc_opportunities` (
	`id` varchar(64) NOT NULL,
	`sfdc_id` varchar(32),
	`name` varchar(500) NOT NULL,
	`account_name` varchar(500),
	`stage_name` varchar(100) NOT NULL,
	`amount` decimal(14,2) DEFAULT '0',
	`close_date` varchar(20),
	`probability` int DEFAULT 0,
	`owner_name` varchar(255),
	`record_type` varchar(100),
	`next_step` text,
	`opp_type` varchar(100),
	`created_date` varchar(20),
	`last_modified_date` varchar(20),
	`loss_reason` text,
	`data_source` varchar(50) DEFAULT 'sfdc_scrape',
	`fetched_at` bigint NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sfdc_opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_bq_snapshot_date` ON `bq_revenue_snapshots` (`snapshot_date`);--> statement-breakpoint
CREATE INDEX `idx_refresh_source` ON `data_refresh_log` (`source`);--> statement-breakpoint
CREATE INDEX `idx_analysis_type` ON `gong_analysis_cache` (`analysis_type`);--> statement-breakpoint
CREATE INDEX `idx_input_hash` ON `gong_analysis_cache` (`input_hash`);--> statement-breakpoint
CREATE INDEX `idx_gong_call_id` ON `gong_calls` (`gong_call_id`);--> statement-breakpoint
CREATE INDEX `idx_gong_account` ON `gong_calls` (`account_name`);--> statement-breakpoint
CREATE INDEX `idx_gong_started` ON `gong_calls` (`started`);--> statement-breakpoint
CREATE INDEX `idx_gong_ctv` ON `gong_calls` (`is_ctv_relevant`);--> statement-breakpoint
CREATE INDEX `idx_sfdc_stage` ON `sfdc_opportunities` (`stage_name`);--> statement-breakpoint
CREATE INDEX `idx_sfdc_account` ON `sfdc_opportunities` (`account_name`);--> statement-breakpoint
CREATE INDEX `idx_sfdc_close_date` ON `sfdc_opportunities` (`close_date`);