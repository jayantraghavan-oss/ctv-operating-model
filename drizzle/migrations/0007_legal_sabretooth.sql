CREATE TABLE `curated_intel` (
	`id` varchar(64) NOT NULL,
	`category` varchar(50) NOT NULL,
	`subcategory` varchar(100),
	`label` varchar(500) NOT NULL,
	`value1` decimal(14,2),
	`value2` decimal(14,2),
	`value3` decimal(14,2),
	`text1` text,
	`text2` text,
	`text3` text,
	`text4` text,
	`metadata` text,
	`sort_order` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`data_source` varchar(100) DEFAULT 'curated',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curated_intel_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_curated_category` ON `curated_intel` (`category`);--> statement-breakpoint
CREATE INDEX `idx_curated_subcategory` ON `curated_intel` (`subcategory`);--> statement-breakpoint
CREATE INDEX `idx_curated_active` ON `curated_intel` (`is_active`);